import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, TestTemplate, TestQuestion, StudentCabinet, AssignedTest } from '../types';
import { decodeData, encodeData } from '../utils/codec';
import { 
  Plus, Edit3, Trash2, Link2, Copy, Check, Clock, AlertTriangle, RefreshCw,
  ChevronRight, ArrowLeft, Eye, Send, CheckCircle2, XCircle, 
  HelpCircle, BookOpen, User, FolderOpen, Award, Layers, ClipboardList, X
} from 'lucide-react';
import { StudentCabinetView } from './StudentCabinetView';

interface TestsManagerProps {
  students: Student[];
  onUpdateStudents: (updated: Student[]) => void;
  user: any; // Firebase user
}

export function TestsManager({ students, onUpdateStudents, user }: TestsManagerProps) {
  // Test templates in library
  const [templates, setTemplates] = useState<TestTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('tutor_test_templates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Loaded cabinets map: cabinetId -> StudentCabinet
  const [cabinets, setCabinets] = useState<Record<string, StudentCabinet>>({});
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  // UI Views: 'list' | 'create_template' | 'edit_template' | 'preview_cabinet'
  const [view, setView] = useState<'list' | 'create_template' | 'edit_template' | 'preview_cabinet'>('list');
  const [previewCabinetId, setPreviewCabinetId] = useState<string | null>(null);

  // Creation/editing states
  const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [testType, setTestType] = useState<'OGE' | 'EGE'>('EGE');
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  
  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetCabinetId, setAssignTargetCabinetId] = useState<string | null>(null);
  
  // Feedback states
  const [copiedCloudId, setCopiedCloudId] = useState<string | null>(null);
  const [copiedOfflineId, setCopiedOfflineId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Import Answers States
  const [showImportAnswersModal, setShowImportAnswersModal] = useState(false);
  const [importAnswersText, setImportAnswersText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportAnswers = async () => {
    setImportError(null);
    if (!importAnswersText.trim()) {
      setImportError('Пожалуйста, вставьте код результата.');
      return;
    }

    let base64Part = importAnswersText.trim();
    if (base64Part.includes('Код:')) {
      const idx = base64Part.indexOf('Код:');
      base64Part = base64Part.substring(idx + 4).trim();
    } else if (base64Part.includes('|')) {
      const parts = base64Part.split('|');
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart.startsWith('Код:')) {
        base64Part = lastPart.replace('Код:', '').trim();
      } else {
        base64Part = lastPart;
      }
    }

    base64Part = base64Part.replace(/[^A-Za-z0-9\-_$+/=]/g, '');

    const decoded = decodeData(base64Part);
    if (!decoded || !decoded.cabinetId || !decoded.testId) {
      setImportError('Не удалось распознать код результата. Убедитесь, что вы скопировали и вставили код полностью.');
      return;
    }

    const { cabinetId, testId, score, totalQuestions, submittedAt, timeSpent, tabSwitches, answers, wantToDiscuss, checkedResults } = decoded;

    const cabinet = cabinets[cabinetId];
    if (!cabinet) {
      setImportError('Ученик с таким кабинетом не найден в вашем списке.');
      return;
    }

    // Update the assigned test status to 'submitted' in the cabinet
    const updatedAssignedTests = cabinet.assignedTests.map(test => {
      // Handle both specific assigned instance ID and parent template ID
      if (test.id === testId || test.templateId === testId) {
        return {
          ...test,
          status: 'submitted' as const,
          submittedAt,
          timeSpent,
          tabSwitches,
          answers,
          wantToDiscuss,
          score,
          totalQuestions,
          checkedResults
        };
      }
      return test;
    });

    const updatedCabinet = {
      ...cabinet,
      assignedTests: updatedAssignedTests
    };

    const updatedCabs = { ...cabinets, [cabinetId]: updatedCabinet };
    await saveCabinetsToStorage(updatedCabs);

    setImportAnswersText('');
    setShowImportAnswersModal(false);
    alert(`Результаты ученика "${cabinet.studentName}" по тесту успешно импортированы и сохранены!`);
  };

  // Track active students list in ref to allow stable onSnapshot without frequent re-subscribes
  const studentsRef = useRef(students);
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  // Load cabinets on mount / user change with real-time onSnapshot sync
  useEffect(() => {
    setLoadingCabinets(true);
    // 1. First load from localStorage for quick responsiveness
    try {
      const stored = localStorage.getItem('tutor_local_cabinets');
      if (stored) {
        setCabinets(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading local cabinets:', e);
    }

    const activeTutorId = user ? user.uid : (() => {
      let id = localStorage.getItem('guest_tutor_id');
      if (!id) {
        id = `guest_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem('guest_tutor_id', id);
      }
      return id;
    })();

    const q = query(collection(db, 'cabinets'), where('tutorId', '==', activeTutorId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let localCabs: Record<string, StudentCabinet> = {};
      try {
        const stored = localStorage.getItem('tutor_local_cabinets');
        if (stored) {
          localCabs = JSON.parse(stored);
        }
      } catch (e) {}

      const loaded: Record<string, StudentCabinet> = { ...localCabs };
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as StudentCabinet;
        // Merge cloud data
        loaded[data.id] = data;
      });

      // To prevent race conditions, do not delete newly created local cabinets that haven't finished uploading to cloud yet
      const cloudIds = new Set(snapshot.docs.map(d => d.id));
      for (const id of Object.keys(localCabs)) {
        if (!cloudIds.has(id)) {
          loaded[id] = localCabs[id];
        }
      }

      setCabinets(loaded);
      localStorage.setItem('tutor_local_cabinets', JSON.stringify(loaded));
      setLoadingCabinets(false);
    }, (err) => {
      console.error('Error in cabinets snapshot listener:', err);
      setLoadingCabinets(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Save cabinets to LocalStorage and Firestore (highly optimized with exact differential writes, fully non-blocking)
  const saveCabinetsToStorage = async (updatedCabs: Record<string, StudentCabinet>) => {
    const activeTutorId = user ? user.uid : localStorage.getItem('guest_tutor_id');
    
    // Find modified or new cabinets
    const modifiedCabs: StudentCabinet[] = [];
    for (const [id, cab] of Object.entries(updatedCabs)) {
      const existing = cabinets[id];
      if (!existing || JSON.stringify(existing) !== JSON.stringify(cab)) {
        modifiedCabs.push(cab);
      }
    }
    
    // Find deleted cabinets
    const deletedIds: string[] = [];
    for (const id of Object.keys(cabinets)) {
      if (!updatedCabs[id]) {
        deletedIds.push(id);
      }
    }

    // Instantly update local state and localStorage synchronously
    setCabinets(updatedCabs);
    localStorage.setItem('tutor_local_cabinets', JSON.stringify(updatedCabs));
    
    // Perform Firestore writes in a non-blocking background queue so that network/VPN blocks cannot freeze the UI
    (async () => {
      try {
        // 1. Write ONLY modified or new cabinets to public cabinets collection
        for (const cab of modifiedCabs) {
          if (cab.tutorId === activeTutorId) {
            setDoc(doc(db, 'cabinets', cab.id), cab).catch(err => {
              console.warn('Silent warning: Failed to sync cabinet in background:', err);
            });
          }
        }
        
        // Delete deleted cabinets from public collection
        for (const id of deletedIds) {
          deleteDoc(doc(db, 'cabinets', id)).catch(err => {
            console.warn('Silent warning: Failed to delete cabinet in background:', err);
          });
        }

        // 2. Write backup to tutor's profile document if logged in
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          setDoc(userDocRef, {
            cabinets: updatedCabs,
            lastUpdated: new Date().toISOString()
          }, { merge: true }).catch(err => {
            console.warn('Silent warning: Failed to sync user backup in background:', err);
          });
        }
      } catch (err) {
        console.warn('Failed background cabinets sync:', err);
      }
    })();
  };

  // 2. Persist templates to LocalStorage and Firestore
  useEffect(() => {
    localStorage.setItem('tutor_test_templates', JSON.stringify(templates));
    
    // Sync templates to tutor's profile in Firestore if logged in
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef).then((snap) => {
        if (snap.exists()) {
          const currentData = snap.data();
          setDoc(userDocRef, {
            ...currentData,
            testTemplates: templates
          }, { merge: true });
        }
      });
    }
  }, [templates, user]);

  // Load templates from Firestore if user is logged in
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef).then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.testTemplates) {
            setTemplates(data.testTemplates);
          }
        }
      });
    }
  }, [user]);

  // 3. Auto-sync student results back to main Student profile's MockExams array
  useEffect(() => {
    // We check if there are newly submitted tests in any cabinet
    // that are not yet recorded in the corresponding student's mockExams list!
    let studentsUpdated = false;
    const updatedStudents = students.map((student) => {
      if (!student.cabinetId) return student;
      const cabinet = cabinets[student.cabinetId];
      if (!cabinet) return student;

      // Find all completed tests in this cabinet
      const completedTests = cabinet.assignedTests.filter(t => t.status === 'submitted');
      if (completedTests.length === 0) return student;

      // Check which completed tests are already in student.mockExams
      const currentMockExams = student.mockExams || [];
      const newMockExamsToAdd: any[] = [];

      completedTests.forEach((test) => {
        const examId = `cab_test_${test.id}`;
        const alreadyExists = currentMockExams.some(e => e.id === examId);

        if (!alreadyExists) {
          // Prepare formatted short breakdown of answers
          const breakdown = test.questions.map((q, idx) => {
            const isCorrect = test.checkedResults ? test.checkedResults[q.id] : false;
            return `Задание ${idx + 1}: ${isCorrect ? '+' : '-'}${test.wantToDiscuss?.[q.id] ? ' (обсудить)' : ''}`;
          }).join('\n');

          const notes = `Затрачено времени: ${Math.round((test.timeSpent || 0) / 60)} мин.\nВыходов из вкладки: ${test.tabSwitches || 0}\n\nРезультаты по заданиям:\n${breakdown}`;

          newMockExamsToAdd.push({
            id: examId,
            name: `Тест: ${test.title}`,
            date: test.submittedAt ? test.submittedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            score: test.score || 0,
            maxScore: test.totalQuestions || test.questions.length,
            gaps: test.checkedResults 
              ? test.questions.filter(q => !test.checkedResults?.[q.id]).map(q => q.text) 
              : [],
            notes: notes
          });
        }
      });

      if (newMockExamsToAdd.length > 0) {
        studentsUpdated = true;
        return {
          ...student,
          mockExams: [...currentMockExams, ...newMockExamsToAdd]
        };
      }

      return student;
    });

    if (studentsUpdated) {
      onUpdateStudents(updatedStudents);
    }
  }, [cabinets, students]);

  // Create cabinet for student
  const handleCreateCabinet = async (student: Student) => {
    const cabinetId = `cab_${Math.random().toString(36).substring(2, 11)}`;
    const activeTutorId = user ? user.uid : (() => {
      let id = localStorage.getItem('guest_tutor_id');
      if (!id) {
        id = `guest_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem('guest_tutor_id', id);
      }
      return id;
    })();

    const newCabinet: StudentCabinet = {
      id: cabinetId,
      studentId: student.id,
      studentName: student.name,
      tutorId: activeTutorId,
      createdAt: new Date().toISOString(),
      assignedTests: []
    };

    // Instantly update local state and storage/cloud
    const localCabs = { ...cabinets, [cabinetId]: newCabinet };
    await saveCabinetsToStorage(localCabs);

    // Link in student object
    const updatedStudents = students.map(s => {
      if (s.id === student.id) {
        return { ...s, cabinetId };
      }
      return s;
    });
    onUpdateStudents(updatedStudents);
  };

  // Delete cabinet
  const handleDeleteCabinet = async (student: Student, cabinetId: string) => {
    if (!confirm(`Вы уверены, что хотите удалить личный кабинет ученика ${student.name}? Все нерешенные тесты и история прохождений будут стерты.`)) {
      return;
    }

    // Instantly update local state and storage/cloud
    const localCabs = { ...cabinets };
    delete localCabs[cabinetId];
    await saveCabinetsToStorage(localCabs);

    // Unlink in student object
    const updatedStudents = students.map(s => {
      if (s.id === student.id) {
        const copy = { ...s };
        delete copy.cabinetId;
        return copy;
      }
      return s;
    });
    onUpdateStudents(updatedStudents);
  };

  // Pre-populate questions for OGE or EGE
  const handlePrepopulateTemplate = (type: 'OGE' | 'EGE') => {
    setTestType(type);
    
    let defaultQs: TestQuestion[] = [];
    if (type === 'OGE') {
      // Questions 2-12
      for (let i = 2; i <= 12; i++) {
        defaultQs.push({
          id: `q-${i}-${Date.now()}`,
          type: 'short',
          text: `Задание ${i}`,
          correctAnswer: '',
          options: ['Вариант 1', 'Вариант 2'],
          correctOptions: [false, false]
        });
      }
    } else {
      // Questions 1-26
      for (let i = 1; i <= 26; i++) {
        defaultQs.push({
          id: `q-${i}-${Date.now()}`,
          type: 'short',
          text: `Задание ${i}`,
          correctAnswer: '',
          options: ['Вариант 1', 'Вариант 2'],
          correctOptions: [false, false]
        });
      }
    }
    setQuestions(defaultQs);
  };

  // Switch to creating a template
  const handleInitCreateTemplate = () => {
    setTestTitle('');
    setTestType('EGE');
    setEditingTemplate(null);
    handlePrepopulateTemplate('EGE');
    setView('create_template');
  };

  // Switch to editing template
  const handleInitEditTemplate = (template: TestTemplate) => {
    setEditingTemplate(template);
    setTestTitle(template.title);
    setTestType(template.type);
    setQuestions(template.questions);
    setView('edit_template');
  };

  // Add customized blank question
  const handleAddBlankQuestion = (type: 'short' | 'single' | 'multiple' | 'matching') => {
    const qNum = questions.length + 1;
    const newQ: TestQuestion = {
      id: `q-custom-${qNum}-${Date.now()}`,
      type,
      text: `Задание ${qNum}`,
      correctAnswer: '',
      options: ['Вариант 1', 'Вариант 2'],
      correctOptions: [false, false],
      matchingLeft: ['Строка А', 'Строка Б'],
      matchingRight: ['Вариант 1', 'Вариант 2'],
      matchingAnswers: [0, 1]
    };
    setQuestions(prev => [...prev, newQ]);
  };

  // Update specific question field
  const handleUpdateQuestion = (qId: string, updates: Partial<TestQuestion>) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, ...updates };
      }
      return q;
    }));
  };

  // Remove question
  const handleRemoveQuestion = (qId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== qId));
  };

  // Save template
  const handleSaveTemplate = () => {
    if (!testTitle.trim()) {
      alert('Пожалуйста, введите название теста.');
      return;
    }

    if (editingTemplate) {
      // Editing existing
      const updated = templates.map(t => {
        if (t.id === editingTemplate.id) {
          return {
            ...t,
            title: testTitle,
            type: testType,
            questions
          };
        }
        return t;
      });
      setTemplates(updated);
    } else {
      // Creating new
      const newTemplate: TestTemplate = {
        id: `tpl_${Date.now()}`,
        title: testTitle,
        type: testType,
        createdAt: new Date().toISOString(),
        questions
      };
      setTemplates(prev => [newTemplate, ...prev]);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    setView('list');
  };

  // Delete template from library
  const handleDeleteTemplate = (id: string) => {
    if (confirm('Вы уверены, что хотите безвозвратно удалить этот шаблон теста из вашей библиотеки?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  // Show Assign Dialog
  const handleOpenAssignModal = (cabinetId: string) => {
    setAssignTargetCabinetId(cabinetId);
    setShowAssignModal(true);
  };

  // Complete Assigning Test Template to Cabinet
  const handleAssignTest = async (template: TestTemplate) => {
    if (!assignTargetCabinetId) return;
    
    const cabinet = cabinets[assignTargetCabinetId];
    if (!cabinet) return;

    const assignedInstance: AssignedTest = {
      id: `asg_${Date.now()}`,
      templateId: template.id,
      title: template.title,
      type: template.type,
      questions: template.questions,
      status: 'pending',
      assignedAt: new Date().toISOString()
    };

    const updatedCabinet: StudentCabinet = {
      ...cabinet,
      assignedTests: [assignedInstance, ...(cabinet.assignedTests || [])]
    };

    // Instantly update local state & storage/cloud
    const localCabs = { ...cabinets, [assignTargetCabinetId]: updatedCabinet };
    await saveCabinetsToStorage(localCabs);

    setShowAssignModal(false);
    setAssignTargetCabinetId(null);
    alert(`Тест "${template.title}" успешно назначен ученику ${cabinet.studentName}!`);
  };

  // Copy personal link to clipboard (Cloud Link)
  const handleCopyLinkCloud = (cabinetId: string) => {
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    const link = `${origin}${window.location.pathname}?cabinet=${cabinetId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedCloudId(cabinetId);
      setTimeout(() => setCopiedCloudId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  // Copy personal link to clipboard (Offline Link - compressed with lz-string)
  const handleCopyLinkOffline = (cabinetId: string) => {
    const cabinetObj = cabinets[cabinetId];
    if (!cabinetObj) {
      alert('Ошибка: кабинет не найден.');
      return;
    }
    const encoded = encodeData(cabinetObj);
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    const link = `${origin}${window.location.pathname}?cabinet_data=${encoded}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedOfflineId(cabinetId);
      setTimeout(() => setCopiedOfflineId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy offline link:', err);
    });
  };

  if (view === 'preview_cabinet' && previewCabinetId) {
    return (
      <div className="bg-white min-h-screen">
        <div className="bg-slate-900 px-6 py-4 flex items-center gap-3 border-b border-white/5">
          <button
            onClick={() => {
              setView('list');
              setPreviewCabinetId(null);
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition text-xs flex items-center gap-1 cursor-pointer font-semibold uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Назад к кабинетам
          </button>
          <div className="text-white/40 font-mono text-xs">/</div>
          <div className="text-white/90 text-sm font-semibold flex items-center gap-2">
            <span>Просмотр кабинета ученика:</span>
            <span className="bg-purple-500/20 border border-purple-500/30 text-purple-200 px-2.5 py-1 rounded-xl text-xs font-mono font-bold">
              {cabinets[previewCabinetId]?.studentName}
            </span>
          </div>
        </div>
        <StudentCabinetView 
          cabinet={cabinets[previewCabinetId]} 
          onSaveAnswers={(updatedCabinet) => {
            const updatedCabs = { ...cabinets, [previewCabinetId]: updatedCabinet };
            saveCabinetsToStorage(updatedCabs);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-white relative animate-fadeIn">
      {/* View 1: Main List of Library and Student Cabinets */}
      {view === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Library & Template Generator */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden flex-1 shadow-2xl flex flex-col justify-between">
              <div className="absolute inset-0 bg-radial-at-t from-purple-500/[0.03] to-transparent pointer-events-none" />
              
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#F4B5CD]" />
                    Библиотека тестов
                  </h3>
                  
                  <button
                    onClick={handleInitCreateTemplate}
                    className="p-2 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/20 rounded-xl text-xs font-bold uppercase tracking-wider text-[#F4B5CD] flex items-center gap-1 transition duration-200 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Новый тест
                  </button>
                </div>

                {templates.length === 0 ? (
                  <div className="text-center py-16 text-white/40 text-xs italic border border-dashed border-white/5 rounded-2xl bg-white/[0.005]">
                    Библиотека шаблонов пуста. Нажмите кнопку выше, чтобы создать ваш первый интерактивный тест.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                    {templates.map(tpl => (
                      <div key={tpl.id} className="bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition duration-150 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono font-extrabold text-[#F4B5CD] bg-[#F4B5CD]/10 border border-[#F4B5CD]/25 px-1.5 py-0.5 rounded uppercase tracking-widest">
                              {tpl.type}
                            </span>
                            <span className="text-[10px] text-white/30 font-mono">
                              {tpl.questions.length} заданий
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white/80 leading-snug">{tpl.title}</h4>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleInitEditTemplate(tpl)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
                            title="Редактировать тест"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="p-2 rounded-lg bg-red-950/20 hover:bg-red-950/60 text-red-400 hover:text-red-300 transition border border-transparent hover:border-red-900/30 cursor-pointer"
                            title="Удалить тест"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                  💡 <strong>Как это работает:</strong> вы создаете шаблоны тестов ОГЭ или ЕГЭ в этой панели, а затем в один клик назначаете их ученикам. Результаты тестов автоматически возвращаются к вам в режиме реального времени!
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Cabinets Synchronizer */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-radial-at-t from-[#C3B4FC]/3 via-transparent to-transparent pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-4 border-b border-white/5">
                <div className="space-y-1">
                  <h3 className="font-serif text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-[#C3B4FC]" />
                    Личные кабинеты учеников
                  </h3>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    🔓 Ученикам <strong>не требуется регистрация или авторизация через Google</strong>. Они мгновенно переходят в свой личный кабинет по скопированной ссылке.
                  </p>
                </div>
                
                <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 shrink-0">
                  {/* Import Answers Button */}
                  <button
                    onClick={() => setShowImportAnswersModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 hover:text-purple-100 rounded-2xl text-[10px] font-sans font-medium transition cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Импортировать ответы</span>
                  </button>

                  {/* Cloud Sync Status Indicator */}
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3 py-1.5 text-[10px] text-emerald-400 font-sans font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Кабинеты: {Object.keys(cabinets).length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {students.map(student => {
                  const cabinet = student.cabinetId ? cabinets[student.cabinetId] : null;
                  
                  return (
                    <div key={student.id} className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Student Profile Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shadow-xs select-none">
                            {student.emoji && (student.emoji.startsWith('data:') || student.emoji.startsWith('http')) ? (
                              <img src={student.emoji} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 select-none" />
                            ) : (
                              <span>{student.emoji || '👤'}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white/90 leading-tight">{student.name}</h4>
                            <p className="text-[10px] text-white/30 font-medium mt-0.5">{student.program?.name || 'Нет программы обучения'}</p>
                          </div>
                        </div>

                        {/* Cabinet controls */}
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          {cabinet ? (
                            <>
                              {/* Cloud Copy Link Button */}
                              <button
                                onClick={() => handleCopyLinkCloud(cabinet.id)}
                                className={`px-2.5 py-1.5 rounded-xl border text-[9px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1 transition-all cursor-pointer ${
                                  copiedCloudId === cabinet.id
                                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                                    : 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400'
                                }`}
                                title="Короткая и надежная ссылка через облако. Работает везде, в том числе в РФ без VPN!"
                              >
                                {copiedCloudId === cabinet.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Ссылка скопирована!</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                                    <span>Короткая (Рекомендуется)</span>
                                  </>
                                )}
                              </button>

                              {/* Offline Copy Link Button */}
                              <button
                                onClick={() => handleCopyLinkOffline(cabinet.id)}
                                className={`px-2.5 py-1.5 rounded-xl border text-[9px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1 transition-all cursor-pointer ${
                                  copiedOfflineId === cabinet.id
                                    ? 'bg-purple-500/20 border-purple-500/35 text-purple-200'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/40 hover:text-white'
                                }`}
                                title="Оффлайн-ссылка (без облачной синхронизации). Внимание: ссылка ОЧЕНЬ длинная и может обрезаться в Telegram/WhatsApp!"
                              >
                                {copiedOfflineId === cabinet.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Резерв скопирован!</span>
                                  </>
                                ) : (
                                  <>
                                    <Award className="w-3 h-3 text-purple-400" />
                                    <span>Длинная (Резерв)</span>
                                  </>
                                )}
                              </button>

                              {/* Assign Test Button */}
                              <button
                                onClick={() => handleOpenAssignModal(cabinet.id)}
                                className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-200 hover:bg-purple-500/25 text-[9px] uppercase tracking-wider font-semibold transition cursor-pointer flex items-center gap-1"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Назначить тест
                              </button>

                              {/* Preview Cabinet Button */}
                              <button
                                onClick={() => {
                                  setPreviewCabinetId(cabinet.id);
                                  setView('preview_cabinet');
                                }}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition text-xs cursor-pointer"
                                title="Войти в личный кабинет ученика (просмотр и аналитика)"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Delete Cabinet Link */}
                              <button
                                onClick={() => handleDeleteCabinet(student, cabinet.id)}
                                className="p-1.5 rounded-xl bg-red-950/20 hover:bg-red-950/60 border border-red-950/30 text-red-400 transition text-xs cursor-pointer"
                                title="Удалить кабинет"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleCreateCabinet(student)}
                              className="px-4 py-1.5 rounded-xl bg-[#C3B4FC]/10 hover:bg-[#C3B4FC]/20 border border-[#C3B4FC]/25 text-[#C3B4FC] text-[9px] uppercase tracking-wider font-bold transition duration-200 cursor-pointer active:scale-95"
                            >
                              Создать личный кабинет
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Display assigned tests status inside cabinet listing */}
                      {cabinet && cabinet.assignedTests && cabinet.assignedTests.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center gap-1.5 flex-wrap overflow-x-auto no-scrollbar">
                          <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold font-mono mr-2">Тесты:</span>
                          {cabinet.assignedTests.map(at => {
                            const isSubmitted = at.status === 'submitted';
                            return (
                              <div
                                key={at.id}
                                className={`px-2 py-1 rounded-xl text-[9px] font-medium border flex items-center gap-1 font-sans ${
                                  isSubmitted
                                    ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                                    : 'bg-amber-500/5 border-amber-500/10 text-amber-400 animate-pulse'
                                }`}
                                title={isSubmitted ? `Пройден! Правильных: ${at.score}/${at.totalQuestions}. Время: ${Math.round((at.timeSpent || 0) / 60)} мин. Вкладку сворачивал: ${at.tabSwitches || 0} раз.` : 'Ожидает решения'}
                              >
                                {isSubmitted ? (
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                ) : (
                                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                                )}
                                <span className="font-bold truncate max-w-[110px]">{at.title}</span>
                                {isSubmitted && (
                                  <span className="font-mono bg-emerald-500/20 text-emerald-300 rounded px-1 font-bold">
                                    {at.score}/{at.totalQuestions}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Creating or Editing a Test Template */}
      {(view === 'create_template' || view === 'edit_template') && (
        <div className="max-w-4xl mx-auto bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-2xl relative">
          <div className="absolute inset-0 bg-radial-at-t from-purple-500/[0.02] to-transparent pointer-events-none" />
          
          {/* Header section */}
          <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-6">
            <div>
              <button
                onClick={() => setView('list')}
                className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white uppercase tracking-wider font-semibold pb-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Назад к списку
              </button>
              <h2 className="text-lg font-serif font-bold text-white/95">
                {editingTemplate ? 'Редактировать шаблон' : 'Создать шаблон теста'}
              </h2>
              <p className="text-[11px] text-white/40 mt-1">Добавьте вопросы: впишите текст задания и правильные ответы. Ученик увидит только форму ввода ответа.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrepopulateTemplate('OGE')}
                className={`px-3 py-1.5 rounded-xl border text-[9px] uppercase tracking-wider font-extrabold transition cursor-pointer ${
                  testType === 'OGE'
                    ? 'bg-[#F4B5CD]/10 border-[#F4B5CD]/20 text-[#F4B4CD]'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                }`}
              >
                Предустановить ОГЭ (2-12)
              </button>
              <button
                onClick={() => handlePrepopulateTemplate('EGE')}
                className={`px-3 py-1.5 rounded-xl border text-[9px] uppercase tracking-wider font-extrabold transition cursor-pointer ${
                  testType === 'EGE'
                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                }`}
              >
                Предустановить ЕГЭ (1-26)
              </button>
            </div>
          </div>

          {/* Test Meta Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
            <div className="md:col-span-2">
              <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1.5">Название теста (например: Вариант 5 ЕГЭ)</label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Например: ЕГЭ Русский Язык — Вариант 1"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 focus:border-purple-500/40 focus:bg-white/10 rounded-xl text-white text-xs font-semibold transition outline-none"
              />
            </div>
            
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1.5">Тип экзамена</label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as 'OGE' | 'EGE')}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white text-xs font-semibold rounded-xl outline-none focus:border-purple-500/40 cursor-pointer"
              >
                <option value="EGE">ЕГЭ (1-26)</option>
                <option value="OGE">ОГЭ (2-12)</option>
              </select>
            </div>
          </div>

          {/* Questions Editor Workspace */}
          <div className="space-y-4 mb-8 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {questions.map((q, qIdx) => (
              <div key={q.id} className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-5 relative transition">
                {/* Card header */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 font-bold font-mono">#{qIdx + 1}</span>
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => handleUpdateQuestion(q.id, { text: e.target.value })}
                      placeholder={`Задание ${qIdx + 1}`}
                      className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-purple-500/40 px-1 text-xs font-bold text-white outline-none w-28 transition"
                    />
                    
                    <select
                      value={q.type}
                      onChange={(e) => handleUpdateQuestion(q.id, { type: e.target.value as any })}
                      className="bg-white/5 border border-white/10 text-[9px] uppercase tracking-wider font-bold text-white/70 px-2 py-1 rounded-lg outline-none cursor-pointer"
                    >
                      <option value="short">Короткий ответ</option>
                      <option value="single">Один вариант</option>
                      <option value="multiple">Несколько вариантов</option>
                      <option value="matching">Соответствие</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/60 text-red-400 hover:text-red-300 border border-transparent hover:border-red-900/30 transition cursor-pointer"
                    title="Удалить вопрос"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Question specifics */}
                <div>
                  {q.type === 'short' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block">Правильный ответ (регистр не важен):</label>
                      <input
                        type="text"
                        value={q.correctAnswer || ''}
                        onChange={(e) => handleUpdateQuestion(q.id, { correctAnswer: e.target.value })}
                        placeholder="Введите ответ. При наличии синонимов разделите их знаком '/' (например: 1234/синоним)"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 focus:border-purple-500/35 rounded-xl text-white text-xs font-semibold outline-none transition"
                      />
                    </div>
                  )}

                  {q.type === 'single' && (
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block mb-1">Варианты ответов:</label>
                      {q.options?.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`correct-radio-${q.id}`}
                            checked={!!q.correctOptions?.[oIdx]}
                            onChange={() => {
                              const newCorrects = (q.options || []).map((_, i) => i === oIdx);
                              handleUpdateQuestion(q.id, { correctOptions: newCorrects });
                            }}
                            className="w-3.5 h-3.5 text-purple-600 bg-white/5 border-white/15"
                          />
                          <span className="text-[10px] text-white/40 uppercase font-mono font-bold">верно</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(q.options || [])];
                              newOpts[oIdx] = e.target.value;
                              handleUpdateQuestion(q.id, { options: newOpts });
                            }}
                            placeholder={`Вариант ${oIdx + 1}`}
                            className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-white/80 outline-none focus:border-purple-500/30 transition"
                          />
                          <button
                            onClick={() => {
                              const newOpts = q.options?.filter((_, i) => i !== oIdx) || [];
                              const newCorrects = q.correctOptions?.filter((_, i) => i !== oIdx) || [];
                              handleUpdateQuestion(q.id, { options: newOpts, correctOptions: newCorrects });
                            }}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newOpts = [...(q.options || []), `Новый вариант`];
                          const newCorrects = [...(q.correctOptions || []), false];
                          handleUpdateQuestion(q.id, { options: newOpts, correctOptions: newCorrects });
                        }}
                        className="py-1 px-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-lg text-[9px] uppercase tracking-wider font-bold transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Добавить вариант
                      </button>
                    </div>
                  )}

                  {q.type === 'multiple' && (
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block mb-1">Варианты ответов:</label>
                      {q.options?.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!q.correctOptions?.[oIdx]}
                            onChange={() => {
                              const newCorrects = [...(q.correctOptions || [])];
                              newCorrects[oIdx] = !newCorrects[oIdx];
                              handleUpdateQuestion(q.id, { correctOptions: newCorrects });
                            }}
                            className="w-3.5 h-3.5 text-purple-600 rounded bg-white/5 border-white/15 focus:ring-0"
                          />
                          <span className="text-[10px] text-white/40 uppercase font-mono font-bold">верно</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(q.options || [])];
                              newOpts[oIdx] = e.target.value;
                              handleUpdateQuestion(q.id, { options: newOpts });
                            }}
                            placeholder={`Вариант ${oIdx + 1}`}
                            className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-white/80 outline-none focus:border-purple-500/30 transition"
                          />
                          <button
                            onClick={() => {
                              const newOpts = q.options?.filter((_, i) => i !== oIdx) || [];
                              const newCorrects = q.correctOptions?.filter((_, i) => i !== oIdx) || [];
                              handleUpdateQuestion(q.id, { options: newOpts, correctOptions: newCorrects });
                            }}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newOpts = [...(q.options || []), `Новый вариант`];
                          const newCorrects = [...(q.correctOptions || []), false];
                          handleUpdateQuestion(q.id, { options: newOpts, correctOptions: newCorrects });
                        }}
                        className="py-1 px-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-lg text-[9px] uppercase tracking-wider font-bold transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Добавить вариант
                      </button>
                    </div>
                  )}

                  {q.type === 'matching' && (
                    <div className="space-y-4">
                      {/* Left statements */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold block mb-1">Левая колонка и ответы:</span>
                        {q.matchingLeft?.map((leftStr, lIdx) => (
                          <div key={lIdx} className="flex items-center gap-2.5">
                            <span className="text-[10px] font-mono font-bold text-white/30">{String.fromCharCode(65 + lIdx)}</span>
                            <input
                              type="text"
                              value={leftStr}
                              onChange={(e) => {
                                const newLeft = [...(q.matchingLeft || [])];
                                newLeft[lIdx] = e.target.value;
                                handleUpdateQuestion(q.id, { matchingLeft: newLeft });
                              }}
                              placeholder={`Элемент ${lIdx + 1} слева`}
                              className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-white/80 outline-none"
                            />
                            
                            <span className="text-white/30 text-xs font-mono">→</span>
                            
                            {/* Matching mapping right index selection */}
                            <select
                              value={q.matchingAnswers?.[lIdx] !== undefined ? q.matchingAnswers[lIdx] : ''}
                              onChange={(e) => {
                                const newAnswers = [...(q.matchingAnswers || [])];
                                newAnswers[lIdx] = e.target.value === '' ? 0 : parseInt(e.target.value);
                                handleUpdateQuestion(q.id, { matchingAnswers: newAnswers });
                              }}
                              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none cursor-pointer"
                            >
                              {q.matchingRight?.map((_, rIdx) => (
                                <option key={rIdx} value={rIdx}>
                                  Справа #{rIdx + 1}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => {
                                const newLeft = q.matchingLeft?.filter((_, i) => i !== lIdx) || [];
                                const newAnswers = q.matchingAnswers?.filter((_, i) => i !== lIdx) || [];
                                handleUpdateQuestion(q.id, { matchingLeft: newLeft, matchingAnswers: newAnswers });
                              }}
                              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newLeft = [...(q.matchingLeft || []), `Новый элемент слева`];
                            const newAnswers = [...(q.matchingAnswers || []), 0];
                            handleUpdateQuestion(q.id, { matchingLeft: newLeft, matchingAnswers: newAnswers });
                          }}
                          className="py-1 px-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-lg text-[9px] uppercase tracking-wider font-bold transition flex items-center gap-1 w-fit"
                        >
                          <Plus className="w-3 h-3" />
                          Добавить строку слева
                        </button>
                      </div>

                      {/* Right statements */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold block mb-1">Правая колонка (варианты сопоставления):</span>
                        {q.matchingRight?.map((rightStr, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-2.5">
                            <span className="text-[10px] font-mono font-bold text-white/30">#{rIdx + 1}</span>
                            <input
                              type="text"
                              value={rightStr}
                              onChange={(e) => {
                                const newRight = [...(q.matchingRight || [])];
                                newRight[rIdx] = e.target.value;
                                handleUpdateQuestion(q.id, { matchingRight: newRight });
                              }}
                              placeholder={`Вариант ${rIdx + 1} справа`}
                              className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-white/80 outline-none"
                            />
                            <button
                              onClick={() => {
                                const newRight = q.matchingRight?.filter((_, i) => i !== rIdx) || [];
                                handleUpdateQuestion(q.id, { matchingRight: newRight });
                              }}
                              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newRight = [...(q.matchingRight || []), `Новый элемент справа`];
                            handleUpdateQuestion(q.id, { matchingRight: newRight });
                          }}
                          className="py-1 px-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-lg text-[9px] uppercase tracking-wider font-bold transition flex items-center gap-1 w-fit"
                        >
                          <Plus className="w-3 h-3" />
                          Добавить вариант справа
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Question add toolbox */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 mb-8">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-3">Добавить новый пустой вопрос:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAddBlankQuestion('short')}
                className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                Короткий ответ
              </button>
              <button
                onClick={() => handleAddBlankQuestion('single')}
                className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-[#F4B5CD]" />
                Один вариант
              </button>
              <button
                onClick={() => handleAddBlankQuestion('multiple')}
                className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                Несколько вариантов
              </button>
              <button
                onClick={() => handleAddBlankQuestion('matching')}
                className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Соответствие
              </button>
            </div>
          </div>

          {/* Action Control footer */}
          <div className="flex justify-between items-center pt-4 border-t border-white/5">
            <button
              onClick={() => setView('list')}
              className="py-2.5 px-6 rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition text-xs font-semibold cursor-pointer"
            >
              Отмена
            </button>
            
            <button
              onClick={handleSaveTemplate}
              className="py-2.5 px-6 bg-[#C3B4FC]/20 hover:bg-[#C3B4FC]/30 border border-[#C3B4FC]/35 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition active:scale-95 shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#C3B4FC]" />
              <span>Сохранить тест</span>
            </button>
          </div>
        </div>
      )}

      {/* Assign Test Modal Picker Dialog */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#12131a] border border-white/10 rounded-3xl p-6 shadow-2xl max-w-md w-full animate-fadeIn max-h-[500px] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                <h3 className="text-sm font-bold text-white tracking-wide">Выбрать тест для назначения</h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignTargetCabinetId(null);
                  }}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
                >
                  ✕
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-xs italic">
                  У вас пока нет созданных шаблонов в библиотеке. Закройте это окно и сначала создайте тест.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 no-scrollbar">
                  {templates.map(tpl => (
                    <div
                      key={tpl.id}
                      onClick={() => handleAssignTest(tpl)}
                      className="bg-white/[0.01] hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition cursor-pointer flex justify-between items-center group text-left"
                    >
                      <div>
                        <span className="text-[8px] font-mono font-bold text-[#F4B5CD] bg-[#F4B5CD]/10 px-1 rounded uppercase tracking-wider block w-fit mb-1">
                          {tpl.type}
                        </span>
                        <h4 className="text-xs font-bold text-white group-hover:text-[#F4B5CD] transition">{tpl.title}</h4>
                        <span className="text-[9px] text-white/30 font-medium">{tpl.questions.length} заданий</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignTargetCabinetId(null);
                }}
                className="py-2 px-4 rounded-xl border border-white/5 bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/5 text-xs font-semibold"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Answers Modal */}
      {showImportAnswersModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#12131a] border border-white/10 rounded-3xl p-6 shadow-2xl max-w-lg w-full animate-fadeIn text-white">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <h3 className="font-serif text-sm font-bold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-purple-400" />
                Импорт результатов теста ученика
              </h3>
              <button
                onClick={() => {
                  setShowImportAnswersModal(false);
                  setImportError(null);
                  setImportAnswersText('');
                }}
                className="text-white/40 hover:text-white hover:bg-white/5 p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-white/60 leading-relaxed mb-4 font-sans">
              Вставьте сюда код результатов, который прислал вам ученик. Система автоматически распознает его, сопоставит с кабинетом ученика и сохранит подробную статистику ответов.
            </p>

            <textarea
              value={importAnswersText}
              onChange={(e) => setImportAnswersText(e.target.value)}
              placeholder="Вставьте скопированный от ученика код сюда (например: [РЕЗУЛЬТАТ-ТЕСТА] ...)"
              className="w-full h-32 p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-purple-500 mb-4"
            />

            {importError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-xs text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportAnswersModal(false);
                  setImportError(null);
                  setImportAnswersText('');
                }}
                className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition"
              >
                Отмена
              </button>
              <button
                onClick={handleImportAnswers}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer"
              >
                Импортировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
