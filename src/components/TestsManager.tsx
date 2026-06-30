import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Plus, Edit2, Trash2, Copy, Check, Layers, Send, Share2, 
  Users, BarChart2, Grid, ExternalLink, Inbox, Eye, HelpCircle, 
  CheckCircle2, ArrowUp, ArrowDown, X, AlertCircle, Sparkles, ChevronLeft
} from 'lucide-react';
import { Student, StudentCabinet, TestTemplate, TestQuestion, AssignedTest } from '../types';
import { encodeData, decodeData, toCompact, fromCompact, decompressResult } from '../utils/codec';
import { safeStorage } from '../utils/safeStorage';

interface TestsManagerProps {
  students: Student[];
  onUpdateStudents: (updatedStudents: Student[]) => void;
  user: any; // tutor auth user
  cabinets?: Record<string, StudentCabinet>;
  onUpdateCabinets?: (updatedCabs: Record<string, StudentCabinet>) => void;
}

// Initial template seeds for immediate playability
const INITIAL_TEMPLATES: TestTemplate[] = [
  {
    id: 'tpl_ege_1',
    title: 'ЕГЭ Математика — Профильный уровень (Разбор)',
    type: 'EGE',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q_e1_1',
        type: 'single',
        text: 'В треугольнике ABC угол C равен 90°, AB = 10, BC = 8. Найдите sin A.',
        options: ['0.6', '0.8', '0.75', '1.25'],
        correctAnswer: '1' // BC/AB = 8/10 = 0.8 -> Index 1
      },
      {
        id: 'q_e1_2',
        type: 'short',
        text: 'Решите уравнение: 3^(x-5) = 27. В ответ запишите число.',
        correctAnswer: '8' // x-5 = 3 -> x=8
      },
      {
        id: 'q_e1_3',
        type: 'single',
        text: 'В гонке участвуют 5 спортсменов из России, 3 из Швеции и 2 из Норвегии. Порядок старта определяется жребием. Найдите вероятность того, что первым будет стартовать спортсмен из России.',
        options: ['0.5', '0.3', '0.2', '0.8'],
        correctAnswer: '0' // 5/10 = 0.5 -> Index 0
      }
    ]
  },
  {
    id: 'tpl_oge_1',
    title: 'ОГЭ Русский язык — Орфографический анализ',
    type: 'OGE',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q_o1_1',
        type: 'short',
        text: 'Укажите слово, в котором написание безударной чередующейся гласной в корне зависит от суффикса -А-. (Запишите слово строчными буквами, например: растение)',
        correctAnswer: 'собирать'
      },
      {
        id: 'q_o1_2',
        type: 'single',
        text: 'В каком слове пишется одна буква Н?',
        options: ['Песчаный', 'Стеклянный', 'Деревянный', 'Оловянный'],
        correctAnswer: '0' // Песчаный -> Index 0
      }
    ]
  }
];

export function TestsManager({ students, onUpdateStudents, user, cabinets: propCabinets, onUpdateCabinets }: TestsManagerProps) {
  // Tabs: 'cabinets' | 'templates'
  const [activeTab, setActiveTab] = useState<'cabinets' | 'templates'>('cabinets');
  
  // Loaded templates
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  // Loaded cabinets map (fallback when not passed as prop)
  const [localCabinets, setLocalCabinets] = useState<Record<string, StudentCabinet>>({});

  const cabinets = propCabinets || localCabinets;

  // Active modal / editor state for templates
  const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Cabinet inspection/detail state
  const [inspectedCabinetId, setInspectedCabinetId] = useState<string | null>(null);
  
  // Results Import Box
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Assign Test modal state
  const [assignTargetCabinetId, setAssignTargetCabinetId] = useState<string | null>(null);

  // Tooltip copy notification
  const [copiedCabinetId, setCopiedCabinetId] = useState<string | null>(null);

  // Load templates and cabinets on mount
  useEffect(() => {
    // 1. Load Templates
    const storedTemplates = safeStorage.getItem('tutor_test_templates');
    if (storedTemplates) {
      try {
        setTemplates(JSON.parse(storedTemplates));
      } catch {
        setTemplates(INITIAL_TEMPLATES);
      }
    } else {
      setTemplates(INITIAL_TEMPLATES);
      safeStorage.setItem('tutor_test_templates', JSON.stringify(INITIAL_TEMPLATES));
    }

    // 2. Load Cabinets fallback
    if (!propCabinets) {
      const storedCabs = safeStorage.getItem('tutor_local_cabinets');
      if (storedCabs) {
        try {
          setLocalCabinets(JSON.parse(storedCabs));
        } catch {}
      }
    }
  }, [propCabinets]);

  // Sync templates helper
  const saveTemplatesToStorage = (updatedTemplates: TestTemplate[]) => {
    setTemplates(updatedTemplates);
    safeStorage.setItem('tutor_test_templates', JSON.stringify(updatedTemplates));
  };

  // Sync cabinets helper
  const saveCabinetsToStorage = (updatedCabs: Record<string, StudentCabinet>) => {
    if (onUpdateCabinets) {
      onUpdateCabinets(updatedCabs);
    } else {
      setLocalCabinets(updatedCabs);
      safeStorage.setItem('tutor_local_cabinets', JSON.stringify(updatedCabs));
    }
  };

  // Create or Update Template
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.title.trim()) return;

    let updated: TestTemplate[];
    if (templates.some(t => t.id === editingTemplate.id)) {
      // Edit
      updated = templates.map(t => t.id === editingTemplate.id ? editingTemplate : t);
    } else {
      // Create
      updated = [
        ...templates, 
        { 
          ...editingTemplate, 
          id: `tpl_${Math.random().toString(36).substring(2, 11)}`,
          createdAt: new Date().toISOString() 
        }
      ];
    }

    saveTemplatesToStorage(updated);
    setShowTemplateModal(false);
    setEditingTemplate(null);
  };

  const handleStartCreateTemplate = () => {
    setEditingTemplate({
      id: '',
      title: '',
      type: 'EGE',
      createdAt: '',
      questions: [
        {
          id: `q_${Math.random().toString(36).substring(2, 11)}`,
          type: 'single',
          text: '',
          options: ['', ''],
          correctAnswer: '0'
        }
      ]
    });
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('Вы действительно хотите удалить этот шаблон теста из библиотеки?')) {
      const updated = templates.filter(t => t.id !== id);
      saveTemplatesToStorage(updated);
    }
  };

  // Manage Question modification inside templates editor
  const handleAddQuestion = () => {
    if (!editingTemplate) return;
    const newQuestion: TestQuestion = {
      id: `q_${Math.random().toString(36).substring(2, 11)}`,
      type: 'single',
      text: '',
      options: ['', ''],
      correctAnswer: '0'
    };
    setEditingTemplate({
      ...editingTemplate,
      questions: [...editingTemplate.questions, newQuestion]
    });
  };

  const handleDeleteQuestion = (qIdx: number) => {
    if (!editingTemplate) return;
    const questions = [...editingTemplate.questions];
    questions.splice(qIdx, 1);
    setEditingTemplate({
      ...editingTemplate,
      questions
    });
  };

  const handleQuestionChange = (qIdx: number, updates: Partial<TestQuestion>) => {
    if (!editingTemplate) return;
    const questions = editingTemplate.questions.map((q, idx) => {
      if (idx !== qIdx) return q;
      const updated = { ...q, ...updates };
      // Sanitize answers / options if type changes
      if (updates.type === 'short') {
        delete updated.options;
        updated.correctAnswer = '';
      } else if (updates.type === 'single' && !updated.options) {
        updated.options = ['', ''];
        updated.correctAnswer = '0';
      }
      return updated;
    });
    setEditingTemplate({
      ...editingTemplate,
      questions
    });
  };

  // Up / Down sorting of questions
  const handleMoveQuestion = (qIdx: number, direction: 'up' | 'down') => {
    if (!editingTemplate) return;
    const questions = [...editingTemplate.questions];
    const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    // Swap
    const temp = questions[qIdx];
    questions[qIdx] = questions[targetIdx];
    questions[targetIdx] = temp;

    setEditingTemplate({
      ...editingTemplate,
      questions
    });
  };

  // Students Cabinets Actions
  const handleCreateCabinet = (student: Student) => {
    const cabId = `cab_${Math.random().toString(36).substring(2, 11)}`;
    const activeTutorId = user ? user.uid : (localStorage.getItem('guest_tutor_id') || `guest_${Math.random().toString(36).substring(2, 11)}`);
    
    const newCabinet: StudentCabinet = {
      id: cabId,
      studentId: student.id,
      studentName: student.name,
      tutorId: activeTutorId,
      createdAt: new Date().toISOString(),
      assignedTests: []
    };

    // Update locally loaded cabinets
    const updatedCabs = { ...cabinets, [cabId]: newCabinet };
    saveCabinetsToStorage(updatedCabs);

    // Link cabinet ID to student model in App context
    const updatedStudents = students.map(s => s.id === student.id ? { ...s, cabinetId: cabId } : s);
    onUpdateStudents(updatedStudents);
  };

  // Delete a student cabinet completely
  const handleDeleteCabinet = (student: Student, cabinetId: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить личный кабинет ученика ${student.name}? Все результаты и тесты будут стёрты.`)) {
      const updatedCabs = { ...cabinets };
      delete updatedCabs[cabinetId];
      saveCabinetsToStorage(updatedCabs);

      const updatedStudents = students.map(s => {
        if (s.id === student.id) {
          const { cabinetId: _, ...rest } = s;
          return rest as Student;
        }
        return s;
      });
      onUpdateStudents(updatedStudents);
      if (inspectedCabinetId === cabinetId) {
        setInspectedCabinetId(null);
      }
    }
  };

  // Copy cabinet dynamic cloud-synced URL
  const handleCopyCabinetLink = (cab: StudentCabinet) => {
    const origin = window.location.origin;
    const link = `${origin}${window.location.pathname}?cabinetId=${cab.id}`;

    navigator.clipboard.writeText(link).then(() => {
      setCopiedCabinetId(cab.id);
      setTimeout(() => setCopiedCabinetId(null), 3000);
    });
  };

  // Assign Test to Student Cabinet
  const handleAssignTest = (template: TestTemplate) => {
    if (!assignTargetCabinetId) return;

    const cabinet = cabinets[assignTargetCabinetId];
    if (!cabinet) return;

    const newAssignedTest: AssignedTest = {
      id: `asg_${Math.random().toString(36).substring(2, 11)}`,
      templateId: template.id,
      title: template.title,
      type: template.type,
      questions: template.questions.map(q => ({ ...q })), // Deep copy questions
      status: 'pending',
      assignedAt: new Date().toISOString()
    };

    const updatedCabinet: StudentCabinet = {
      ...cabinet,
      assignedTests: [newAssignedTest, ...(cabinet.assignedTests || [])]
    };

    const updatedCabs = { ...cabinets, [assignTargetCabinetId]: updatedCabinet };
    saveCabinetsToStorage(updatedCabs);
    setAssignTargetCabinetId(null);

    alert(`Тест "${template.title}" успешно назначен! Теперь скопируйте ссылку кабинета и отправьте ученику.`);
  };

  // Import Student Response Code
  const handleImportResult = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);

    const code = importCode.trim();
    if (!code) {
      setImportError('Введите код ответа ученика.');
      return;
    }

    try {
      const decoded = decompressResult(code);
      if (!decoded || !decoded.i || !decoded.t) {
        setImportError('Некорректный или поврежденный код результатов. Попросите ученика скопировать и выслать его еще раз.');
        return;
      }

      const cabinet = cabinets[decoded.i];
      if (!cabinet) {
        setImportError('Кабинет ученика, отправившего этот тест, не найден на вашем устройстве.');
        return;
      }

      // Find the assigned test to fill answers
      const assignedTest = cabinet.assignedTests.find(t => t.id === decoded.t);
      if (!assignedTest) {
        setImportError(`В кабинете "${cabinet.studentName}" не найден назначенный тест с ID: ${decoded.t}`);
        return;
      }

      // Auto-check results
      let correctCount = 0;
      const checked: Record<string, boolean> = {};

      assignedTest.questions.forEach((q) => {
        const studentAnswer = (decoded.a[q.id] || '').trim().toLowerCase();
        const correctAnswer = (q.correctAnswer || '').trim().toLowerCase();
        const isCorrect = studentAnswer === correctAnswer;
        if (isCorrect) {
          correctCount++;
        }
        checked[q.id] = isCorrect;
      });

      const updatedTest: AssignedTest = {
        ...assignedTest,
        status: 'submitted',
        submittedAt: decoded.u,
        answers: decoded.a,
        wantToDiscuss: decoded.d,
        score: decoded.r, // or correctCount
        totalQuestions: assignedTest.questions.length,
        checkedResults: checked
      };

      const updatedTests = cabinet.assignedTests.map(t => t.id === decoded.t ? updatedTest : t);
      const updatedCabinet: StudentCabinet = {
        ...cabinet,
        assignedTests: updatedTests
      };

      const updatedCabs = { ...cabinets, [decoded.i]: updatedCabinet };
      saveCabinetsToStorage(updatedCabs);

      setImportSuccess(`Успешно импортировано! Ученик ${cabinet.studentName} решил тест "${assignedTest.title}" на ${decoded.r} из ${assignedTest.questions.length}.`);
      setImportCode('');
    } catch (err) {
      setImportError('Ошибка разбора кода. Убедитесь, что вы скопировали код полностью.');
    }
  };

  // Inspecting specific cabinet details for tutor
  const inspectedCabinet = useMemo(() => {
    if (!inspectedCabinetId) return null;
    return cabinets[inspectedCabinetId] || null;
  }, [inspectedCabinetId, cabinets]);

  // Questions student flagged for discussion in inspected cabinet
  const flaggedQuestionsCount = useMemo(() => {
    if (!inspectedCabinet) return 0;
    let count = 0;
    inspectedCabinet.assignedTests.forEach(t => {
      if (t.wantToDiscuss) {
        Object.values(t.wantToDiscuss).forEach(v => {
          if (v) count++;
        });
      }
    });
    return count;
  }, [inspectedCabinet]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-fadeIn text-white/90">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F4B5CD] animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#F4B5CD] font-mono">Модуль контроля</span>
          </div>
          <h1 className="text-2xl font-black font-sans tracking-tight text-white mt-1">
            Кабинеты & Тесты
          </h1>
          <p className="text-xs text-white/50 font-sans mt-1">
            Создавайте надежные тесты, назначайте их ученикам и анализируйте ошибки без баз данных и VPN.
          </p>
        </div>

        {/* Action button based on tab */}
        {activeTab === 'templates' && (
          <button
            onClick={handleStartCreateTemplate}
            className="py-2.5 px-5 bg-gradient-to-r from-[#F4B5CD]/20 to-purple-500/20 hover:from-[#F4B5CD]/30 hover:to-purple-500/30 border border-[#F4B5CD]/40 text-[#F4B5CD] text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-[#F4B5CD]/5"
          >
            <Plus className="w-4 h-4" />
            Создать новый тест
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4 border-b border-white/5 pb-px mb-6">
        <button
          onClick={() => {
            setActiveTab('cabinets');
            setInspectedCabinetId(null);
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider font-mono transition cursor-pointer relative ${
            activeTab === 'cabinets' ? 'text-white' : 'text-white/40 hover:text-white/70'
          }`}
        >
          <div className="flex items-center gap-2 px-2">
            <Users className="w-4 h-4" />
            <span>Личные кабинеты ({students.length})</span>
          </div>
          {activeTab === 'cabinets' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F4B5CD] rounded-full" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('templates');
            setInspectedCabinetId(null);
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider font-mono transition cursor-pointer relative ${
            activeTab === 'templates' ? 'text-white' : 'text-white/40 hover:text-white/70'
          }`}
        >
          <div className="flex items-center gap-2 px-2">
            <BookOpen className="w-4 h-4" />
            <span>Библиотека тестов ({templates.length})</span>
          </div>
          {activeTab === 'templates' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F4B5CD] rounded-full" />
          )}
        </button>
      </div>

      {/* Import Code Bar */}
      {activeTab === 'cabinets' && !inspectedCabinetId && (
        <form onSubmit={handleImportResult} className="bg-gradient-to-br from-purple-500/[0.03] to-white/[0.01] border border-[#F4B5CD]/15 p-5 rounded-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#F4B5CD]/10 border border-[#F4B5CD]/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <Inbox className="w-5 h-5 text-[#F4B5CD]" />
            </div>
            <div>
              <h3 className="text-xs font-bold">Быстрый импорт результатов ученика</h3>
              <p className="text-[10px] text-white/40 font-sans mt-0.5 max-w-sm">
                Ученик выслал вам код сданного теста? Вставьте его сюда, чтобы мгновенно обновить его карту ошибок и график прогресса.
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto md:flex-1 max-w-md">
            <input
              type="text"
              placeholder="Вставьте код ответов ученика..."
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#F4B5CD]/40 flex-1 min-w-[150px]"
            />
            <button
              type="submit"
              className="py-2.5 px-5 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 border border-[#F4B5CD]/35 text-[#F4B5CD] text-xs font-extrabold uppercase tracking-wider transition rounded-xl font-mono cursor-pointer shrink-0"
            >
              Импорт
            </button>
          </div>

          {/* Feedback logs */}
          {importError && (
            <div className="col-span-full w-full text-xs text-red-400 bg-red-500/5 border border-red-500/10 px-3 py-2 rounded-xl flex items-center gap-1.5 mt-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}
          {importSuccess && (
            <div className="col-span-full w-full text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 rounded-xl flex items-center gap-1.5 mt-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}
        </form>
      )}

      {/* Main tab content panels */}
      {activeTab === 'cabinets' ? (
        inspectedCabinet ? (
          /* Inspecting Specific Cabinet (Tutor's view of student) */
          <div className="space-y-6 animate-fadeIn">
            {/* Header / Back button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
              <button
                onClick={() => setInspectedCabinetId(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition text-xs font-bold uppercase tracking-wider font-mono cursor-pointer border border-white/5"
              >
                <ChevronLeft className="w-4 h-4" />
                Ко всем кабинетам
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-white/50">Кабинет ученика:</span>
                <span className="bg-purple-500/20 border border-purple-500/30 text-[#C3B4FC] px-3 py-1 rounded-xl text-xs font-mono font-bold">
                  {inspectedCabinet.studentName}
                </span>
              </div>
            </div>

            {/* Quick Actions Card for current inspected cabinet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[#F4B5CD] font-bold font-mono">Доступ ученика</h3>
                  <p className="text-xs text-white/50 mt-1">
                    Скопируйте и отправьте индивидуальную ссылку ученику. По этой ссылке он заходит в свой личный кабинет без паролей, видит назначенные тесты и свою статистику.
                  </p>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => handleCopyCabinetLink(inspectedCabinet)}
                    className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition font-mono cursor-pointer flex-1 flex items-center justify-center gap-1.5 ${
                      copiedCabinetId === inspectedCabinet.id
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                        : 'bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/25 text-[#F4B5CD]'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    {copiedCabinetId === inspectedCabinet.id ? 'Ссылка скопирована!' : 'Скопировать ссылку'}
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-purple-400 font-bold font-mono">Выдать новый тест</h3>
                  <p className="text-xs text-white/50 mt-1">
                    Выберите любой шаблон теста из вашей библиотеки, чтобы мгновенно назначить его в кабинет этого ученика.
                  </p>
                </div>
                <div className="mt-5">
                  <button
                    onClick={() => setAssignTargetCabinetId(inspectedCabinet.id)}
                    className="py-2 px-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/35 text-purple-200 text-xs font-bold uppercase tracking-wider rounded-xl transition w-full flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                  >
                    <Plus className="w-4 h-4" />
                    Назначить тест ученику
                  </button>
                </div>
              </div>
            </div>

            {/* Notification if student requested discussion */}
            {flaggedQuestionsCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-xs text-amber-200 font-sans">
                  <span className="font-bold">Ученик просит обсудить вопросы!</span> Нажмите кнопки вопросов ниже, чтобы увидеть, какие задания помечены меткой <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1 rounded">ОБСУДИТЬ</span>.
                </div>
              </div>
            )}

            {/* Detailed History & Statistics for this cabinet (Duplicates UI of cabinet for tutor to inspect) */}
            <div className="space-y-6">
              {inspectedCabinet.assignedTests.length === 0 ? (
                <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-10 text-center">
                  <Inbox className="w-10 h-10 text-white/20 mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-white/80">Пока нет назначенных тестов</h3>
                  <p className="text-xs text-white/40 mt-1">
                    Нажмите «Назначить тест ученику» выше, чтобы начать обучение.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {/* Performance stats summary */}
                  <div className="bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/5 p-6 rounded-2xl">
                    <h3 className="text-sm font-bold mb-4 font-sans uppercase tracking-wider text-white/40">Назначенные тесты и статусы</h3>
                    
                    <div className="divide-y divide-white/5 space-y-3">
                      {inspectedCabinet.assignedTests.map((t) => {
                        const isSubmitted = t.status === 'submitted';
                        return (
                          <div key={t.id} className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div>
                              <div className="font-bold text-white/90">{t.title}</div>
                              <div className="text-[10px] text-white/40 mt-0.5 font-mono">
                                Выдан: {new Date(t.assignedAt).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {isSubmitted ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                    {t.score} / {t.totalQuestions}
                                  </span>
                                  <span className="text-[10px] text-white/30 font-mono">
                                    {t.submittedAt}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] uppercase font-bold text-[#F4B5CD] font-mono bg-[#F4B5CD]/5 px-2 py-0.5 rounded border border-[#F4B5CD]/10">
                                  В процессе решения
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Matrix of errors */}
                  {inspectedCabinet.assignedTests.some(t => t.status === 'submitted') && (
                    <div className="bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/5 p-6 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                        <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-white/40">Сводная таблица результатов & ошибок</h3>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-white/50">
                          <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> Верно</span>
                          <span className="flex items-center gap-1"><X className="w-3.5 h-3.5 text-red-400" /> Ошибка</span>
                          <span className="flex items-center gap-1 text-amber-400"><HelpCircle className="w-3.5 h-3.5" /> Обсудить</span>
                        </div>
                      </div>

                      {/* Matrix Grid */}
                      <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-[9px] uppercase tracking-wider font-mono text-white/40 font-bold">
                              <th className="py-3 px-4 font-normal">Тест / Дата</th>
                              {Array.from({ length: Math.max(...inspectedCabinet.assignedTests.filter(t => t.status === 'submitted').map(t => t.questions.length)) }).map((_, idx) => (
                                <th key={idx} className="py-3 px-3 text-center font-normal">
                                  Зад. {idx + 1}
                                </th>
                              ))}
                              <th className="py-3 px-4 text-right font-normal">Оценка</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs">
                            {inspectedCabinet.assignedTests.filter(t => t.status === 'submitted').map((t) => (
                              <tr key={t.id} className="hover:bg-white/[0.01] transition">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-white/95">{t.title}</div>
                                  <div className="text-[9px] text-white/30 font-mono mt-0.5">{t.submittedAt}</div>
                                </td>

                                {Array.from({ length: Math.max(...inspectedCabinet.assignedTests.filter(t => t.status === 'submitted').map(t => t.questions.length)) }).map((_, idx) => {
                                  const q = t.questions[idx];
                                  if (!q) return <td key={idx} className="py-3 px-3 text-center text-white/10">—</td>;

                                  const isCorrect = t.checkedResults?.[q.id];
                                  const isDiscussed = t.wantToDiscuss?.[q.id];

                                  return (
                                    <td key={idx} className="py-3 px-3 text-center">
                                      <div className="inline-flex flex-col items-center gap-1">
                                        {isCorrect ? (
                                          <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          </div>
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                                            <X className="w-3.5 h-3.5 text-red-400" />
                                          </div>
                                        )}

                                        {isDiscussed && (
                                          <span className="text-[7px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1 rounded font-mono font-bold animate-pulse">
                                            ОБСУДИТЬ
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}

                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                                  {t.score} / {t.questions.length}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* General Student Cabinets List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
            {students.map((student) => {
              const cabinet = student.cabinetId ? cabinets[student.cabinetId] : null;
              
              return (
                <div
                  key={student.id}
                  className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between transition duration-200 group relative"
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold truncate max-w-[150px] group-hover:text-[#F4B5CD] transition">
                        {student.name}
                      </span>
                      
                      {cabinet ? (
                        <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-emerald-400 font-mono bg-emerald-500/5 px-2 py-0.5 rounded-xl border border-emerald-500/10">
                          Кабинет создан
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-white/30 font-mono bg-white/5 px-2 py-0.5 rounded-xl">
                          Не создан
                        </span>
                      )}
                    </div>

                    {/* Stats or explanation */}
                    {cabinet ? (
                      <div className="text-[10px] text-white/50 space-y-1 font-mono mt-4">
                        <div>Выдано тестов: <span className="text-white font-bold">{cabinet.assignedTests.length}</span></div>
                        <div>Решено тестов: <span className="text-emerald-400 font-bold">{(cabinet.assignedTests || []).filter(t => t.status === 'submitted').length}</span></div>
                      </div>
                    ) : (
                      <p className="text-xs text-white/40 font-sans mt-4 leading-normal">
                        Личный кабинет позволяет ученику проходить тесты, видеть графики и сохранять историю ошибок.
                      </p>
                    )}
                  </div>

                  {/* Controls footer */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                    {cabinet ? (
                      <>
                        <div className="flex gap-1.5 w-full">
                          <button
                            onClick={() => setInspectedCabinetId(cabinet.id)}
                            className="flex-1 py-1.5 px-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 text-[10px] uppercase font-extrabold tracking-wider transition rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Просмотр
                          </button>
                          
                          <button
                            onClick={() => handleCopyCabinetLink(cabinet)}
                            className={`flex-1 py-1.5 px-3 border text-[10px] uppercase font-extrabold tracking-wider transition rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-mono ${
                              copiedCabinetId === cabinet.id
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 text-[#F4B5CD] border-[#F4B5CD]/30'
                            }`}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            {copiedCabinetId === cabinet.id ? 'Ссылка!' : 'Ссылка'}
                          </button>

                          <button
                            onClick={() => handleDeleteCabinet(student, cabinet.id)}
                            className="py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition cursor-pointer"
                            title="Стереть кабинет"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => handleCreateCabinet(student)}
                        className="w-full py-1.5 px-4 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 border border-[#F4B5CD]/35 text-[#F4B5CD] text-[10px] uppercase font-extrabold tracking-wider transition rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Создать кабинет
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Test templates library tab content */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
          {templates.length === 0 ? (
            <div className="col-span-full bg-white/[0.01] border border-white/5 rounded-3xl p-10 text-center">
              <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-white/80">Ваша библиотека тестов пуста</h3>
              <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto leading-normal">
                Создайте свой первый тест с вопросами с автопроверкой, нажав кнопку «Создать новый тест» в правом верхнем углу.
              </p>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between transition duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-purple-500/15 border border-purple-500/25 text-[#C3B4FC] text-[9px] font-bold font-mono px-2 py-0.5 rounded-xl uppercase tracking-wider">
                      {template.type}
                    </span>
                    <span className="text-[10px] text-white/30 font-mono uppercase">
                      {template.questions.length} вопросов
                    </span>
                  </div>

                  <h3 className="text-sm font-bold leading-snug group-hover:text-[#F4B5CD] transition">
                    {template.title}
                  </h3>
                </div>

                {/* Template controls footer */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingTemplate(JSON.parse(JSON.stringify(template))); // deep copy
                      setShowTemplateModal(true);
                    }}
                    className="flex-1 py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-[10px] uppercase font-bold tracking-wider rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Редактировать
                  </button>

                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="py-1.5 px-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition cursor-pointer"
                    title="Удалить тест"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Select test to assign to student cabinet */}
      {assignTargetCabinetId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0D12] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scaleIn">
            <button
              onClick={() => setAssignTargetCabinetId(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-400 font-mono mb-1">
              Назначить тест
            </h3>
            <p className="text-xs text-white/50 mb-5 font-sans leading-relaxed">
              Выберите тест из библиотеки, который вы хотите назначить в личный кабинет ученика <span className="text-white font-bold">{cabinets[assignTargetCabinetId]?.studentName}</span>.
            </p>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {templates.length === 0 ? (
                <div className="text-center py-6 text-xs text-white/40">
                  Сначала создайте шаблоны тестов в библиотеке.
                </div>
              ) : (
                templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleAssignTest(tpl)}
                    className="w-full text-left p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#F4B5CD]/30 rounded-xl transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white/90 truncate max-w-[200px]">{tpl.title}</div>
                      <div className="text-[9px] text-white/40 mt-0.5 font-mono">{tpl.type} • {tpl.questions.length} зад.</div>
                    </div>
                    <span className="text-[#F4B5CD] font-mono font-bold shrink-0">Выбрать →</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal / Side Panel: Test Template Editor */}
      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0C0D12] border border-white/10 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative my-8 animate-scaleIn">
            <button
              onClick={() => {
                setShowTemplateModal(false);
                setEditingTemplate(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#F4B5CD] font-mono mb-4">
              {editingTemplate.id ? 'Редактирование теста' : 'Создание нового теста'}
            </h3>

            <form onSubmit={handleSaveTemplate} className="space-y-6">
              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-white/40 font-bold">Название теста</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Тема 4. Квадратные уравнения"
                    value={editingTemplate.title}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F4B5CD]/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-white/40 font-bold">Категория</label>
                  <select
                    value={editingTemplate.type}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value as 'OGE' | 'EGE' })}
                    className="w-full bg-[#12131C] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F4B5CD]/40 cursor-pointer"
                  >
                    <option value="EGE">ЕГЭ Профиль</option>
                    <option value="OGE">ОГЭ Математика</option>
                  </select>
                </div>
              </div>

              {/* Questions List Section */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-white/50">Список вопросов ({editingTemplate.questions.length})</h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="py-1.5 px-3 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-300 text-[10px] uppercase font-bold tracking-wider rounded-lg transition flex items-center gap-1.5 cursor-pointer font-mono"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Добавить вопрос
                  </button>
                </div>

                {/* Loop questions */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 space-y-4">
                  {editingTemplate.questions.map((q, qIdx) => (
                    <div key={q.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl relative group/item">
                      
                      {/* Item header controls */}
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-white/5 text-[9px] font-mono text-white/50 px-2 py-0.5 rounded">
                            № {qIdx + 1}
                          </span>
                          
                          {/* Question type selector */}
                          <select
                            value={q.type}
                            onChange={(e) => handleQuestionChange(qIdx, { type: e.target.value as 'short' | 'single' })}
                            className="bg-black/30 border border-white/10 text-[9px] text-white/70 rounded px-1.5 py-0.5 font-mono cursor-pointer"
                          >
                            <option value="single">Один вариант</option>
                            <option value="short">Краткий ответ</option>
                          </select>
                        </div>

                        {/* Move & Delete controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(qIdx, 'up')}
                            disabled={qIdx === 0}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(qIdx, 'down')}
                            disabled={qIdx === editingTemplate.questions.length - 1}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(qIdx)}
                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Question Content Input */}
                      <div className="space-y-3">
                        <textarea
                          required
                          placeholder="Текст вопроса или задания..."
                          value={q.text}
                          onChange={(e) => handleQuestionChange(qIdx, { text: e.target.value })}
                          rows={2}
                          className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#F4B5CD]/30"
                        />

                        {/* If single choice, edit options */}
                        {q.type === 'single' && q.options && (
                          <div className="space-y-2 pl-3 border-l border-white/10">
                            <label className="text-[9px] uppercase font-mono text-white/40 block">Варианты ответов & Правильный</label>
                            
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                {/* Radio for correct answer */}
                                <input
                                  type="radio"
                                  name={`correct_${q.id}`}
                                  checked={q.correctAnswer === String(optIdx)}
                                  onChange={() => handleQuestionChange(qIdx, { correctAnswer: String(optIdx) })}
                                  className="accent-[#F4B5CD] cursor-pointer"
                                  title="Выбрать как правильный"
                                />
                                
                                <input
                                  type="text"
                                  required
                                  placeholder={`Вариант ${optIdx + 1}`}
                                  value={opt}
                                  onChange={(e) => {
                                    const opts = [...(q.options || [])];
                                    opts[optIdx] = e.target.value;
                                    handleQuestionChange(qIdx, { options: opts });
                                  }}
                                  className="flex-1 bg-black/20 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-white"
                                />

                                {q.options!.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const opts = [...(q.options || [])];
                                      opts.splice(optIdx, 1);
                                      // If deleted the correct answer, reset to index 0
                                      let correct = q.correctAnswer;
                                      if (Number(correct) >= opts.length) {
                                        correct = '0';
                                      }
                                      handleQuestionChange(qIdx, { options: opts, correctAnswer: correct });
                                    }}
                                    className="p-1 text-red-400 hover:bg-red-500/10 rounded cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}

                            {q.options.length < 6 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const opts = [...(q.options || []), ''];
                                  handleQuestionChange(qIdx, { options: opts });
                                }}
                                className="text-[9px] text-[#F4B5CD] hover:underline font-mono"
                              >
                                + Добавить вариант
                              </button>
                            )}
                          </div>
                        )}

                        {/* If short answer, edit answer text */}
                        {q.type === 'short' && (
                          <div className="space-y-1.5 pl-3 border-l border-white/10">
                            <label className="text-[9px] uppercase font-mono text-white/40 block">Правильный ответ</label>
                            <input
                              type="text"
                              required
                              placeholder="Правильный ответ (например: 15 или свобода)"
                              value={q.correctAnswer || ''}
                              onChange={(e) => handleQuestionChange(qIdx, { correctAnswer: e.target.value })}
                              className="w-full bg-black/20 border border-white/5 focus:border-[#F4B5CD]/20 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Save footer */}
              <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="py-2.5 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 border border-[#F4B5CD]/35 text-[#F4B5CD] text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Сохранить шаблон
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
