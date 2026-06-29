import React, { useState, useEffect, useRef } from 'react';
import { AssignedTest, TestQuestion, StudentCabinet } from '../types';
import { decodeData, encodeData } from '../utils/codec';
import { 
  Play, CheckCircle, Clock, AlertTriangle, ShieldAlert,
  ArrowRight, ExternalLink, RefreshCw, Star, BarChart2,
  Calendar, Check, X, MessageSquare, ChevronLeft, Award, Copy
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface StudentCabinetViewProps {
  cabinetId?: string | null;
  cabinetData?: string | null;
  cabinet?: StudentCabinet | null;
  onSaveAnswers?: (updatedCabinet: StudentCabinet) => void;
}

export function StudentCabinetView({ cabinetId, cabinetData, cabinet: propCabinet, onSaveAnswers }: StudentCabinetViewProps) {
  const [cabinet, setCabinet] = useState<StudentCabinet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultCodeToCopy, setResultCodeToCopy] = useState<string | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);
  
  // Active test solving state
  const [activeTest, setActiveTest] = useState<AssignedTest | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [wantToDiscuss, setWantToDiscuss] = useState<Record<string, boolean>>({});
  
  // Timer and tracking state
  const [timeSpent, setTimeSpent] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingError, setSubmittingError] = useState<string | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch or decode cabinet data
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (propCabinet) {
      // Tutor preview mode
      setCabinet(propCabinet);
      setLoading(false);
      return;
    }

    let decodedCab: StudentCabinet | null = null;

    if (cabinetData) {
      decodedCab = decodeData(cabinetData) as StudentCabinet;
    }

    if (!decodedCab && cabinetId) {
      // Fetch directly from Firestore so links can be short!
      getDoc(doc(db, 'cabinets', cabinetId)).then((snap) => {
        if (snap.exists()) {
          let fetchedCab = snap.data() as StudentCabinet;
          
          // Merge with student's local submissions progress to preserve completed tests
          const progressKey = `student_progress_${cabinetId}`;
          const savedProgressStr = localStorage.getItem(progressKey);
          if (savedProgressStr) {
            try {
              const savedTests = JSON.parse(savedProgressStr) as AssignedTest[];
              const mergedTests = fetchedCab.assignedTests.map(test => {
                const saved = savedTests.find(t => t.id === test.id);
                if (saved && saved.status === 'submitted') {
                  return { ...test, ...saved };
                }
                return test;
              });
              fetchedCab = { ...fetchedCab, assignedTests: mergedTests };
            } catch (e) {}
          }
          
          setCabinet(fetchedCab);
          localStorage.setItem(`student_cabinet_${cabinetId}`, JSON.stringify(fetchedCab));
        } else {
          // Fallback to local storage if offline or not found
          const stored = localStorage.getItem(`student_cabinet_${cabinetId}`);
          if (stored) {
            try {
              setCabinet(JSON.parse(stored));
            } catch (e) {
              setError('Кабинет не найден в системе. Обратитесь к преподавателю за ссылкой.');
            }
          } else {
            setError('Кабинет не найден в системе. Пожалуйста, обратитесь к вашему преподавателю за актуальной ссылкой.');
          }
        }
        setLoading(false);
      }).catch((err) => {
        console.error('Error fetching cabinet:', err);
        // Fallback to local storage on error
        const stored = localStorage.getItem(`student_cabinet_${cabinetId}`);
        if (stored) {
          try {
            setCabinet(JSON.parse(stored));
          } catch (e) {
            setError('Ошибка подключения к базе данных.');
          }
        } else {
          setError('Ошибка загрузки кабинета. Проверьте подключение к интернету.');
        }
        setLoading(false);
      });
      return;
    }

    if (decodedCab) {
      // Merge with student's local submissions progress to preserve completed tests
      const cabId = decodedCab.id;
      const progressKey = `student_progress_${cabId}`;
      const savedProgressStr = localStorage.getItem(progressKey);
      if (savedProgressStr) {
        try {
          const savedTests = JSON.parse(savedProgressStr) as AssignedTest[];
          // Map assigned tests: if they are completed in saved progress, update them
          const mergedTests = decodedCab.assignedTests.map(test => {
            const saved = savedTests.find(t => t.id === test.id);
            if (saved && saved.status === 'submitted') {
              return { ...test, ...saved };
            }
            return test;
          });
          decodedCab = { ...decodedCab, assignedTests: mergedTests };
        } catch (e) {
          console.error('Error merging saved progress:', e);
        }
      }

      setCabinet(decodedCab);
      // Save original/decoded cabinet structure locally as fallback
      localStorage.setItem(`student_cabinet_${decodedCab.id}`, JSON.stringify(decodedCab));
    } else {
      setError('Кабинет не найден или указана неверная ссылка. Пожалуйста, убедитесь, что вы скопировали ссылку полностью.');
    }
    setLoading(false);
  }, [cabinetId, cabinetData, propCabinet]);

  // 2. Track Page Blur (tab switches) and Timer when a test is being solved
  useEffect(() => {
    if (!activeTest) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Reset timer and switches
    setTimeSpent(0);
    setTabSwitches(0);

    // Timer interval
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    // Visibility change and blur listeners
    const handleBlur = () => {
      setTabSwitches(prev => prev + 1);
    };

    window.addEventListener('blur', handleBlur);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setTabSwitches(prev => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTest]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-sm font-medium">Загрузка вашего кабинета...</p>
      </div>
    );
  }

  if (error || !cabinet) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Доступ ограничен</h2>
        <p className="text-sm text-slate-500 max-w-md mb-4">
          {error || 'Указана неверная или устаревшая ссылка.'}
        </p>
        
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 max-w-md text-left text-xs text-amber-800 mb-6 space-y-2">
          <p className="font-semibold">💡 Как решить эту проблему:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Убедитесь, что вы перешли по полной ссылке, предоставленной вашим преподавателем, без лишних символов на конце.</li>
            <li>Если проблема повторяется, попросите преподавателя отправить вам ссылку повторно.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-md transition duration-150 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            Проверить снова
          </button>
          
          <p className="text-[10px] text-slate-400 sm:ml-2">Пожалуйста, свяжитесь со своим преподавателем, чтобы получить актуальную ссылку.</p>
        </div>
      </div>
    );
  }

  // Auto-checking helper function for short answers
  function checkShortAnswer(studentAns: string, correctAnswersStr: string): boolean {
    if (!studentAns || !correctAnswersStr) return false;
    const cleanStudent = studentAns.trim().toLowerCase();
    const options = correctAnswersStr.split('/').map(opt => opt.trim().toLowerCase());
    
    for (const opt of options) {
      if (cleanStudent === opt) return true;
      
      // Order-insensitive comparison for alphanumeric codes (e.g. "1234" vs "4321")
      const optSorted = opt.split('').sort().join('');
      const studSorted = cleanStudent.split('').sort().join('');
      if (optSorted === studSorted && optSorted.length > 0) return true;
    }
    return false;
  }

  // Handle Test Start
  const handleStartTest = (test: AssignedTest) => {
    setActiveTest(test);
    setStudentAnswers({});
    setWantToDiscuss({});
  };

  // Answer handler
  const handleSetAnswer = (questionId: string, value: any) => {
    setStudentAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Want to discuss toggle handler
  const handleToggleDiscuss = (questionId: string) => {
    setWantToDiscuss(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Submit Test logic
  const handleSubmitTest = async () => {
    if (!activeTest || !cabinet) return;
    setIsSubmitting(true);
    setSubmittingError(null);

    try {
      let score = 0;
      const checkedResults: Record<string, boolean> = {};

      activeTest.questions.forEach((q) => {
        const studentAns = studentAnswers[q.id];
        let isCorrect = false;

        if (q.type === 'short') {
          isCorrect = checkShortAnswer(studentAns || '', q.correctAnswer || '');
        } else if (q.type === 'single') {
          // Compare index of selected option
          if (studentAns !== undefined && q.correctOptions) {
            isCorrect = !!q.correctOptions[studentAns];
          }
        } else if (q.type === 'multiple') {
          // Check if student's boolean array matches true indices
          const studentArr = studentAns || [];
          isCorrect = (q.correctOptions || []).every((val, idx) => {
            return !!studentArr[idx] === !!val;
          });
        } else if (q.type === 'matching') {
          // Check mapping left index -> right index
          const studentMapping = studentAns || {};
          isCorrect = (q.matchingAnswers || []).every((val, idx) => {
            return studentMapping[idx] === val;
          });
        }

        checkedResults[q.id] = isCorrect;
        if (isCorrect) score++;
      });

      const updatedAssignedTests = cabinet.assignedTests.map(test => {
        if (test.id === activeTest.id) {
          return {
            ...test,
            status: 'submitted' as const,
            submittedAt: new Date().toISOString(),
            timeSpent,
            tabSwitches,
            answers: studentAnswers,
            wantToDiscuss,
            score,
            totalQuestions: test.questions.length,
            checkedResults
          };
        }
        return test;
      });

      const updatedCabinet: StudentCabinet = {
        ...cabinet,
        assignedTests: updatedAssignedTests
      };

      // 1. If in tutor preview mode, trigger the onSaveAnswers callback
      if (onSaveAnswers) {
        onSaveAnswers(updatedCabinet);
      }

      // Save directly to public Firestore collection for real-time teacher updates!
      try {
        await setDoc(doc(db, 'cabinets', cabinet.id), updatedCabinet);
      } catch (err) {
        console.error('Failed to sync student answers to Firestore:', err);
      }

      // 2. Update local state
      setCabinet(updatedCabinet);

      // 3. Save student progress locally in their browser so it persists across reloads
      const progressKey = `student_progress_${cabinet.id}`;
      localStorage.setItem(progressKey, JSON.stringify(updatedAssignedTests));
      localStorage.setItem(`student_cabinet_${cabinet.id}`, JSON.stringify(updatedCabinet));

      // 4. Generate result code for the student to send to their teacher
      const resultPayload = {
        cabinetId: cabinet.id,
        studentId: cabinet.studentId,
        testId: activeTest.id,
        score,
        totalQuestions: activeTest.questions.length,
        submittedAt: new Date().toISOString(),
        timeSpent,
        tabSwitches,
        answers: studentAnswers,
        wantToDiscuss,
        checkedResults
      };

      const encodedResult = encodeData(resultPayload);
      const formattedResultCode = `[РЕЗУЛЬТАТ-ТЕСТА] ${cabinet.studentName} | ${activeTest.title} | Оценка: ${score}/${activeTest.questions.length} | Код: ${encodedResult}`;
      setResultCodeToCopy(formattedResultCode);

      setActiveTest(null);
      setShowConfirmSubmit(false);
    } catch (err: any) {
      console.error('Error submitting test:', err);
      setSubmittingError('Не удалось сохранить результаты. Пожалуйста, попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const completedTests = cabinet.assignedTests.filter(t => t.status === 'submitted');
  const pendingTests = cabinet.assignedTests.filter(t => t.status === 'pending');

  // Chart data preprocessor
  const chartPoints = completedTests
    .map(t => {
      const percentage = t.totalQuestions ? Math.round((t.score || 0) / t.totalQuestions * 100) : 0;
      return {
        title: t.title,
        percentage,
        date: t.submittedAt ? new Date(t.submittedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''
      };
    })
    .slice(-10); // last 10 tests

  // Max questions in any test to dynamically set grid columns in the summary table
  const maxQuestionsCount = Math.max(...cabinet.assignedTests.map(t => t.questions.length), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-purple-100 selection:text-purple-900 pb-12">
      {/* Light Theme Header */}
      <header className="bg-white border-b border-slate-200 py-5 px-6 shadow-xs sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl shadow-xs border border-purple-100">
              🎓
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Кабинет ученика</h1>
              <p className="text-xs text-slate-500 font-medium">Привет, {cabinet.studentName}! Рады видеть тебя 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 text-slate-600 text-[10px] font-mono tracking-wider uppercase font-bold px-3 py-1.5 rounded-lg border border-slate-200">
            <span>Статус: Активен</span>
          </div>
        </div>
      </header>

      {cabinetData && (
        <div className="bg-purple-500/10 border-b border-purple-500/20 py-3 px-6 shadow-xs animate-fade-in">
          <div className="max-w-6xl mx-auto flex items-start sm:items-center gap-3 text-xs text-purple-900 font-sans font-medium">
            <Award className="w-5 h-5 text-purple-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold text-purple-950">⚡ Автономный режим активен:</span>{' '}
              Этот кабинет работает без баз данных и не требует VPN. Твои ответы сохраняются локально в твоем браузере. В конце теста ты получишь специальный короткий текстовый код, который нужно отправить преподавателю.
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {activeTest ? (
          /* Active Test Solver Interface */
          <div className="max-w-3xl mx-auto">
            {/* Header / Info bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest block font-mono">
                  {activeTest.type === 'OGE' ? 'Подготовка к ОГЭ' : 'Подготовка к ЕГЭ'}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{activeTest.title}</h2>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Timer Display */}
                <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl border border-purple-100 shadow-xs">
                  <Clock className="w-4 h-4 text-purple-600 animate-pulse" />
                  <span className="font-mono font-bold text-sm select-none">{formatTime(timeSpent)}</span>
                </div>
                
                {/* Blur warning indicator */}
                {tabSwitches > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-2 rounded-xl border border-amber-100 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Сворачиваний: {tabSwitches}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6 mb-8">
              {activeTest.questions.map((q, idx) => {
                const answer = studentAnswers[q.id];
                const discuss = !!wantToDiscuss[q.id];

                return (
                  <div key={q.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 shadow-xs transition duration-200 relative group">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 mb-4">
                      <div>
                        <span className="text-xs font-bold text-slate-400 font-mono block">Задание {idx + 1}</span>
                        <h3 className="text-sm font-semibold text-slate-800 mt-0.5">{q.text}</h3>
                      </div>
                      
                      {/* Discuss Flag Toggle */}
                      <button
                        onClick={() => handleToggleDiscuss(q.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition ${
                          discuss
                            ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                        title="Нажми, если сомневаешься и хочешь обсудить этот вопрос с учителем"
                      >
                        <MessageSquare className={`w-3.5 h-3.5 ${discuss ? 'text-amber-500 fill-amber-500/10' : ''}`} />
                        <span>{discuss ? 'Хочу обсудить' : 'Сомневаюсь'}</span>
                      </button>
                    </div>

                    {/* Question Input Form Controls */}
                    <div className="mt-2">
                      {q.type === 'short' && (
                        <div>
                          <label className="text-xs text-slate-400 font-medium block mb-2">Введите ваш ответ:</label>
                          <input
                            type="text"
                            value={answer || ''}
                            onChange={(e) => handleSetAnswer(q.id, e.target.value)}
                            placeholder="Ответ (символы, цифры или слово)..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-purple-400 focus:bg-white rounded-xl text-slate-800 text-sm font-medium transition duration-200 outline-none"
                          />
                        </div>
                      )}

                      {q.type === 'single' && (
                        <div className="space-y-2">
                          <span className="text-xs text-slate-400 font-medium block mb-1">Выберите один вариант:</span>
                          {q.options?.map((opt, oIdx) => (
                            <label
                              key={oIdx}
                              className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition duration-150 ${
                                answer === oIdx
                                  ? 'bg-purple-50 border-purple-200 text-purple-900 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={answer === oIdx}
                                onChange={() => handleSetAnswer(q.id, oIdx)}
                                className="w-4 h-4 text-purple-600 focus:ring-purple-400"
                              />
                              <span className="text-xs font-medium">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'multiple' && (
                        <div className="space-y-2">
                          <span className="text-xs text-slate-400 font-medium block mb-1">Выберите несколько вариантов:</span>
                          {q.options?.map((opt, oIdx) => {
                            const currentList = answer || [];
                            const isChecked = !!currentList[oIdx];
                            
                            const handleChange = () => {
                              const newList = [...currentList];
                              newList[oIdx] = !isChecked;
                              handleSetAnswer(q.id, newList);
                            };

                            return (
                              <label
                                key={oIdx}
                                className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition duration-150 ${
                                  isChecked
                                    ? 'bg-purple-50 border-purple-200 text-purple-900 shadow-xs'
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={handleChange}
                                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-400"
                                />
                                <span className="text-xs font-medium">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'matching' && (
                        <div className="space-y-4">
                          <span className="text-xs text-slate-400 font-medium block mb-1">Сопоставьте строки слева с вариантами справа:</span>
                          
                          {/* List of left statements */}
                          <div className="space-y-3">
                            {q.matchingLeft?.map((leftStr, lIdx) => {
                              const currentMapping = answer || {};
                              const selectedRightIdx = currentMapping[lIdx];

                              return (
                                <div key={lIdx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                                  <div className="flex-1 text-xs font-medium text-slate-700">
                                    {leftStr}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-slate-400 font-mono">→</span>
                                    <select
                                      value={selectedRightIdx !== undefined ? selectedRightIdx : ''}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                        const newMapping = { ...currentMapping, [lIdx]: val };
                                        handleSetAnswer(q.id, newMapping);
                                      }}
                                      className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-purple-400 outline-none font-medium shadow-xs max-w-[200px]"
                                    >
                                      <option value="">-- Выбрать --</option>
                                      {q.matchingRight?.map((rightStr, rIdx) => (
                                        <option key={rIdx} value={rIdx}>
                                          {rightStr}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error alerts */}
            {submittingError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3 text-red-800 text-xs">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>{submittingError}</span>
              </div>
            )}

            {/* Submit Control bar */}
            <div className="flex items-center justify-between gap-4 mb-16">
              <button
                onClick={() => {
                  if (confirm('Вы уверены, что хотите прервать тест? Прогресс не сохранится.')) {
                    setActiveTest(null);
                  }
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition text-xs font-semibold cursor-pointer"
              >
                Вернуться назад
              </button>
              
              <button
                onClick={() => setShowConfirmSubmit(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md hover:shadow-purple-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition duration-200 active:scale-95 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Завершить и отправить работу</span>
              </button>
            </div>

            {/* Confirm Submit Dialog Modal */}
            {showConfirmSubmit && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-fadeIn">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl mb-4 border border-purple-100 shadow-xs">
                    ✍️
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Отправить работу?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    Все ваши ответы будут автоматически проверены. Учитель сразу увидит результаты, включая затраченное время и отметки сомневающихся заданий.
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowConfirmSubmit(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition text-xs font-semibold"
                    >
                      Ещё порешать
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={handleSubmitTest}
                      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Отправка...</span>
                        </>
                      ) : (
                        <span>Отправить</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Result Code Modal */}
            {resultCodeToCopy && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-lg w-full animate-fadeIn">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-xl mb-4 border border-green-100 shadow-xs">
                    🎉
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Тест успешно выполнен!</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Твой результат сохранён в твоём браузере. <strong className="text-purple-600">Обязательно скопируй код ниже и отправь его учителю</strong> (в Telegram, WhatsApp или личные сообщения), чтобы он смог внести результаты в свой журнал:
                  </p>
                  
                  <div className="relative mb-6">
                    <textarea
                      readOnly
                      value={resultCodeToCopy}
                      className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(resultCodeToCopy);
                        setCopiedResult(true);
                        setTimeout(() => setCopiedResult(false), 2000);
                      }}
                      className="absolute right-2 bottom-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 transition"
                    >
                      {copiedResult ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Скопировано!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Скопировать</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => setResultCodeToCopy(null)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Student Cabinet Dashboard (Summary stats & test listings) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20 items-stretch">
            {/* Left side: assigned & history */}
            <div className="lg:col-span-8 flex flex-col space-y-8">
              {/* Assigned Pending Tests */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
                <div className="absolute inset-0 bg-radial-at-t from-purple-500/[0.02] to-transparent pointer-events-none" />
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-4">
                  <span className="text-purple-600">📝</span>
                  Назначенные тесты
                  {pendingTests.length > 0 && (
                    <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {pendingTests.length}
                    </span>
                  )}
                </h3>

                {pendingTests.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs italic">
                    На данный момент у вас нет невыполненных тестов. Отдыхайте! ☕
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pendingTests.map(test => (
                      <div key={test.id} className="bg-slate-50 border border-slate-200 hover:border-purple-200 rounded-xl p-4.5 flex flex-col justify-between hover:bg-purple-50/10 transition duration-200 group">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[9px] font-mono font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded uppercase tracking-wider">
                              {test.type === 'OGE' ? 'ОГЭ' : 'ЕГЭ'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              {test.assignedAt ? new Date(test.assignedAt).toLocaleDateString('ru-RU') : 'Сегодня'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 leading-tight group-hover:text-purple-900 transition">{test.title}</h4>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium">{test.questions.length} заданий с автопроверкой</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => handleStartTest(test)}
                            className="w-full py-2 bg-white hover:bg-purple-600 text-purple-600 hover:text-white border border-purple-200 hover:border-purple-600 rounded-lg text-[10px] uppercase font-bold tracking-wider transition duration-200 flex items-center justify-center gap-1.5 active:scale-98 shadow-xs cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Начать тест</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History Summary Grid / Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs overflow-hidden">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-4">
                  <span className="text-slate-700">📊</span>
                  Сводная таблица по заданиям
                </h3>

                {completedTests.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs italic">
                    Пройдите хотя бы один тест, чтобы здесь отображался детальный анализ ваших ответов.
                  </div>
                ) : (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="pb-3 pr-4 font-sans font-medium min-w-[90px]">Дата</th>
                          <th className="pb-3 pr-4 font-sans font-medium min-w-[130px]">Название теста</th>
                          <th className="pb-3 pr-4 font-sans font-medium text-center min-w-[60px]">Итог</th>
                          {/* List numbers 1 to maxQuestionsCount */}
                          {Array.from({ length: maxQuestionsCount }).map((_, i) => (
                            <th key={i} className="pb-3 px-1 text-center font-mono font-bold w-6">{i + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {completedTests.map(test => {
                          const dateObj = test.submittedAt ? new Date(test.submittedAt) : null;
                          const formattedDate = dateObj ? dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '---';
                          
                          return (
                            <tr key={test.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3.5 pr-4 text-slate-500 font-medium font-mono">{formattedDate}</td>
                              <td className="py-3.5 pr-4">
                                <span className="font-bold text-slate-800 block leading-snug">{test.title}</span>
                                <span className="text-[9px] text-slate-400 font-medium uppercase font-mono tracking-wider">{test.type === 'OGE' ? 'ОГЭ' : 'ЕГЭ'}</span>
                              </td>
                              <td className="py-3.5 pr-4 text-center">
                                <span className="bg-purple-100 text-purple-800 border border-purple-200/50 px-2 py-0.5 rounded-md font-bold font-mono text-[10px]">
                                  {test.score}/{test.totalQuestions}
                                </span>
                              </td>
                              
                              {/* Results by questions */}
                              {Array.from({ length: maxQuestionsCount }).map((_, i) => {
                                const question = test.questions[i];
                                if (!question) {
                                  return <td key={i} className="py-3.5 px-1 text-center text-slate-300">-</td>;
                                }

                                const isCorrect = test.checkedResults ? test.checkedResults[question.id] : false;
                                const wantDiscuss = test.wantToDiscuss ? test.wantToDiscuss[question.id] : false;

                                return (
                                  <td key={i} className="py-3.5 px-1 text-center align-middle">
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                      {isCorrect ? (
                                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-mono font-bold text-[10px]" title={`Задание ${i+1}: Верно`}>+</span>
                                      ) : (
                                        <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-mono font-bold text-[10px]" title={`Задание ${i+1}: Ошибка`}>-</span>
                                      )}
                                      
                                      {wantDiscuss && (
                                        <MessageSquare className="w-2.5 h-2.5 text-amber-500 fill-amber-500/10" title="Хочу обсудить" />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: visual chart & metrics stats */}
            <div className="lg:col-span-4 flex flex-col space-y-8">
              {/* Progress dynamic chart */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-4">
                  <span className="text-purple-600">📈</span>
                  График успеваемости
                </h3>

                {completedTests.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs italic flex-1 flex items-center justify-center">
                    График построится после сдачи тестов.
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between">
                    {/* SVG Line Chart */}
                    <div className="h-44 w-full relative pt-2 mb-2">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="100" y2="20" stroke="#f1f5f9" strokeWidth="0.5" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" />
                        <line x1="0" y1="80" x2="100" y2="80" stroke="#f1f5f9" strokeWidth="0.5" />
                        
                        {/* Score Line */}
                        {(() => {
                          const len = chartPoints.length;
                          if (len < 1) return null;
                          if (len === 1) {
                            const p = chartPoints[0];
                            const cy = 100 - p.percentage;
                            return <circle cx="50" cy={cy} r="4" fill="#C3B4FC" stroke="#8b5cf6" strokeWidth="2" />;
                          }
                          
                          const points = chartPoints.map((p, i) => {
                            const cx = (i / (len - 1)) * 100;
                            // percentages map 0% -> y=100, 100% -> y=0. We'll add some padding: 90 is max, 10 is min
                            const cy = 90 - (p.percentage / 100) * 80;
                            return { cx, cy, p };
                          });

                          const pathD = `M ${points.map(pt => `${pt.cx},${pt.cy}`).join(' L ')}`;

                          return (
                            <>
                              {/* Background Gradient Area under line */}
                              <path
                                d={`${pathD} L ${points[points.length - 1].cx},95 L ${points[0].cx},95 Z`}
                                fill="url(#chartGrad)"
                                opacity="0.15"
                              />
                              {/* Main Line */}
                              <path
                                d={pathD}
                                fill="none"
                                stroke="#8b5cf6"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              {/* Circular markers */}
                              {points.map((pt, i) => (
                                <circle
                                  key={i}
                                  cx={pt.cx}
                                  cy={pt.cy}
                                  r="3"
                                  fill="#fff"
                                  stroke="#8b5cf6"
                                  strokeWidth="2"
                                  className="transition-all hover:r-4 duration-150 cursor-pointer"
                                  title={`${pt.p.title}: ${pt.p.percentage}%`}
                                />
                              ))}
                              
                              {/* Definitions for gradient */}
                              <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8b5cf6" />
                                  <stop offset="100%" stopColor="#fff" />
                                </linearGradient>
                              </defs>
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* X-axis Labels */}
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold font-mono px-1">
                      {chartPoints.map((pt, i) => (
                        <span key={i} className="truncate max-w-[40px]" title={pt.title}>
                          {pt.date}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* General Performance Summary card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5 mb-3 border-b border-slate-100 pb-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    Результаты
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Решено тестов:</span>
                      <span className="text-xs font-bold text-slate-900 font-mono">{completedTests.length}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Средний результат:</span>
                      <span className="text-xs font-bold text-purple-700 font-mono bg-purple-50 px-2 py-0.5 rounded-md">
                        {completedTests.length > 0 
                          ? Math.round(completedTests.reduce((sum, t) => sum + (t.totalQuestions ? ((t.score || 0)/t.totalQuestions) * 100 : 0), 0) / completedTests.length)
                          : 0}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium">Ожидают решения:</span>
                      <span className="text-xs font-bold text-slate-900 font-mono">{pendingTests.length}</span>
                    </div>
                  </div>
                </div>

                {completedTests.length > 0 && (
                  <div className="mt-6 p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl">
                    <p className="text-[10px] text-purple-800 leading-relaxed font-medium">
                      💡 Результаты тестов сохраняются автоматически и синхронизируются с преподавателем в реальном времени. Все ошибки и сомнительные вопросы можно разобрать на ближайшем уроке!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
