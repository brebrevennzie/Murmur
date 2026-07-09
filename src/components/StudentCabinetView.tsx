import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { StudentCabinet, AssignedTest, TestQuestion } from '../types';
import { Check, X, AlertCircle, Sparkles, BookOpen, Clock, Activity, Calendar, Award, LogOut, FileText, ChevronRight, HelpCircle } from 'lucide-react';

interface StudentCabinetViewProps {
  cabinetId: string;
  onBack?: () => void;
}

export const StudentCabinetView: React.FC<StudentCabinetViewProps> = ({ cabinetId, onBack }) => {
  const [cabinet, setCabinet] = useState<StudentCabinet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active state
  const [activeTest, setActiveTest] = useState<AssignedTest | null>(null);
  const [viewingResultsTest, setViewingResultsTest] = useState<AssignedTest | null>(null);

  // Solving states
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [wantToDiscuss, setWantToDiscuss] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // Tracking and view mode states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tabSwitchesCount, setTabSwitchesCount] = useState(0);
  const [teacherMode, setTeacherMode] = useState(!!onBack);

  // Timer & Tab Switches Defocus Listener
  useEffect(() => {
    if (!activeTest) {
      setElapsedSeconds(0);
      setTabSwitchesCount(0);
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    let lastDefocus = 0;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const now = Date.now();
        if (now - lastDefocus > 1500) {
          setTabSwitchesCount(prev => prev + 1);
          lastDefocus = now;
        }
      }
    };

    const handleWindowBlur = () => {
      const now = Date.now();
      if (now - lastDefocus > 1500) {
        setTabSwitchesCount(prev => prev + 1);
        lastDefocus = now;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [activeTest]);

  // Real-time Firestore sync (Using HTTP API fallback for unauthenticated students)
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (teacherMode) {
      // Tutor Mode - directly connect to Firestore for instant real-time sync
      const docRef = doc(db, 'cabinets', cabinetId);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          setCabinet(snapshot.data() as StudentCabinet);
        } else {
          // Look in local storage as a guest fallback
          const localData = localStorage.getItem('tutor_local_cabinets');
          if (localData) {
            try {
              const parsed = JSON.parse(localData) as Record<string, StudentCabinet>;
              if (parsed[cabinetId]) {
                setCabinet(parsed[cabinetId]);
                setLoading(false);
                return;
              }
            } catch (e) {
              console.error('Failed to parse local cabinets:', e);
            }
          }
          setError('Кабинет не найден. Пожалуйста, обратитесь к вашему преподавателю за верной ссылкой!');
        }
        setLoading(false);
      }, (err) => {
        console.error('Error loading cabinet:', err);
        // Fallback
        const localData = localStorage.getItem('tutor_local_cabinets');
        if (localData) {
          try {
            const parsed = JSON.parse(localData) as Record<string, StudentCabinet>;
            if (parsed[cabinetId]) {
              setCabinet(parsed[cabinetId]);
              setLoading(false);
              return;
            }
          } catch {}
        }
        setError('Ошибка при загрузке кабинета. Проверьте подключение к Интернету.');
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Student Mode - use standard HTTP API to fetch cabinet data, bypassing Firestore gRPC/WebSocket ports entirely
      let isMounted = true;
      let intervalId: any;

      const fetchCabinet = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
          const res = await fetch(`/api/cabinet/${cabinetId}`);
          if (res.status === 404) {
            if (isMounted) {
              setError('Кабинет не найден. Пожалуйста, убедитесь, что ссылка верна, или обратитесь к вашему преподавателю!');
            }
            return;
          }
          if (!res.ok) {
            throw new Error(`HTTP error ${res.status}`);
          }
          const result = await res.json();
          if (isMounted) {
            if (result.success && result.data) {
              setCabinet(result.data);
              setError(null);
            } else {
              setError('Кабинет не найден. Обратитесь к вашему преподавателю за верной ссылкой!');
            }
          }
        } catch (err) {
          console.error('API error loading cabinet:', err);
          if (isMounted) {
            // LocalStorage fallback for offline capability
            const localData = localStorage.getItem('tutor_local_cabinets');
            if (localData) {
              try {
                const parsed = JSON.parse(localData) as Record<string, StudentCabinet>;
                if (parsed[cabinetId]) {
                  setCabinet(parsed[cabinetId]);
                  setError(null);
                  setLoading(false);
                  return;
                }
              } catch {}
            }
            if (showLoading) {
              setError('Не удалось загрузить данные кабинета. Проверьте подключение к Интернету или обновите страницу.');
            }
          }
        } finally {
          if (isMounted && showLoading) {
            setLoading(false);
          }
        }
      };

      // Initial HTTP load
      fetchCabinet(true);

      // Lightweight polling every 12 seconds to detect newly assigned tests by tutor
      intervalId = setInterval(() => {
        fetchCabinet(false);
      }, 12000);

      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    }
  }, [cabinetId, teacherMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#F4B5CD] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-white/50 uppercase tracking-widest font-bold">Загрузка кабинета...</p>
        </div>
      </div>
    );
  }

  if (error || !cabinet) {
    return (
      <div className="min-h-screen bg-[#07080a] flex items-center justify-center p-6">
        <div className="bg-[#12131a] border border-white/5 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <p className="text-xs text-white/80 leading-relaxed font-light">
            {error || 'Не удалось загрузить данные личного кабинета.'}
          </p>
        </div>
      </div>
    );
  }

  const { studentName, assignedTests = [] } = cabinet;
  const pendingTests = assignedTests.filter(t => t.status === 'pending');
  const completedTests = assignedTests.filter(t => t.status === 'submitted');

  // Extract all unique task numbers from completed tests for the progress table
  const allTaskNumbers = (() => {
    const numbers = new Set<string>();
    completedTests.forEach(test => {
      test.questions.forEach(q => {
        const num = q.taskNumber || q.text || '';
        if (num.trim()) {
          numbers.add(num.trim());
        }
      });
    });
    return Array.from(numbers).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  })();

  const getCellStatus = (test: AssignedTest, taskNum: string) => {
    const matchingQuestions = test.questions.filter(q => (q.taskNumber || q.text || '').trim() === taskNum);
    if (matchingQuestions.length === 0) {
      return 'none'; // прочерк
    }
    const allCorrect = matchingQuestions.every(q => test.checkedResults?.[q.id] === true);
    return allCorrect ? 'correct' : 'incorrect';
  };

  // Start solving a test
  const handleStartSolve = (test: AssignedTest) => {
    setActiveTest(test);
    setViewingResultsTest(null);
    setAnswers({});
    setWantToDiscuss({});
    setElapsedSeconds(0);
    setTabSwitchesCount(0);
  };

  // Answer selection handlers
  const handleShortAnswerChange = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSingleAnswerChange = (qId: string, optIdx: number) => {
    setAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };

  const handleMultipleAnswerChange = (qId: string, optIdx: number, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[qId] as number[]) || [];
      if (checked) {
        return { ...prev, [qId]: [...current, optIdx].sort((a, b) => a - b) };
      } else {
        return { ...prev, [qId]: current.filter(idx => idx !== optIdx) };
      }
    });
  };

  const handleToggleDiscuss = (qId: string) => {
    setWantToDiscuss(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Auto-grade test on submit
  const handleSubmitTest = async () => {
    if (!activeTest) return;
    
    setSubmitting(true);

    const checkedResults: Record<string, boolean> = {};
    let correctCount = 0;

    activeTest.questions.forEach((q) => {
      const studentAns = answers[q.id];

      if (q.type === 'short' || q.type === 'matching') {
        const studentStr = typeof studentAns === 'string' ? studentAns.trim().toLowerCase() : '';
        const correctOptionsList = (q.correctAnswer || '').split('/').map(s => s.trim().toLowerCase()).filter(Boolean);
        const isCorrect = correctOptionsList.includes(studentStr) && studentStr !== '';
        checkedResults[q.id] = isCorrect;
        if (isCorrect) correctCount++;
      } else if (q.type === 'single') {
        // q.correctOptions is boolean array, e.g. [false, true, false]
        const correctIdx = (q.correctOptions || []).findIndex(val => val === true);
        const isCorrect = studentAns === correctIdx;
        checkedResults[q.id] = isCorrect;
        if (isCorrect) correctCount++;
      } else if (q.type === 'multiple') {
        // multiple correct choices
        const correctIndices = (q.correctOptions || [])
          .map((val, idx) => (val ? idx : -1))
          .filter(idx => idx !== -1);
        
        const studentIndices = (studentAns as number[]) || [];
        // compare arrays
        const isCorrect = 
          correctIndices.length === studentIndices.length &&
          correctIndices.every(idx => studentIndices.includes(idx));
        
        checkedResults[q.id] = isCorrect;
        if (isCorrect) correctCount++;
      }
    });

    const score = correctCount;
    const totalQuestions = activeTest.questions.length;

    const updatedAssignedTest: AssignedTest = {
      ...activeTest,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      answers,
      wantToDiscuss,
      score,
      totalQuestions,
      checkedResults,
      timeSpent: elapsedSeconds,
      tabSwitches: tabSwitchesCount
    };

    // Update cabinet list
    const updatedTestsList = assignedTests.map(t => {
      if (t.id === activeTest.id) return updatedAssignedTest;
      return t;
    });

    const updatedCabinet: StudentCabinet = {
      ...cabinet,
      assignedTests: updatedTestsList
    };

    // Save locally immediately
    const localCabs = localStorage.getItem('tutor_local_cabinets');
    if (localCabs) {
      try {
        const parsed = JSON.parse(localCabs);
        parsed[cabinetId] = updatedCabinet;
        localStorage.setItem('tutor_local_cabinets', JSON.stringify(parsed));
      } catch {}
    }

    // Update state instantly to close active test, stop timer, and show results
    setCabinet(updatedCabinet);
    setViewingResultsTest(updatedAssignedTest);
    setActiveTest(null);
    setSubmitting(false);

    // Scroll back to top so results are instantly visible
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

    // Sync to cloud in the background without blocking the UI
    // We try to save via the API route first (highly robust, bypassing VPN/ISP blocks)
    fetch('/api/submit-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cabinetId,
        cabinetData: updatedCabinet
      })
    }).catch((e) => {
      console.error('Failed to update cabinet on cloud via API:', e);
    });

    // If in teacher/tutor mode, also try direct Firestore save as a backup
    if (teacherMode) {
      const docRef = doc(db, 'cabinets', cabinetId);
      setDoc(docRef, updatedCabinet, { merge: true }).catch((e) => {
        console.error('Failed to update cabinet on cloud directly:', e);
      });
    }
  };

  // Visual Custom SVG line chart for Progress Curve
  const renderProgressCurve = () => {
    // Sort submitted tests by date
    const sortedSubmitted = [...completedTests].sort((a, b) => 
      new Date(a.submittedAt || '').getTime() - new Date(b.submittedAt || '').getTime()
    );

    if (sortedSubmitted.length < 1) {
      return (
        <div className="h-40 flex items-center justify-center text-white/30 text-xs">
          Решите хотя бы один тест, чтобы построить график прогресса
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = 30;

    const formatDateShort = (isoString?: string) => {
      if (!isoString) return '';
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}.${month}`;
    };

    const points = sortedSubmitted.map((t, idx) => {
      const percentage = t.totalQuestions ? Math.round(((t.score || 0) / t.totalQuestions) * 100) : 0;
      const x = padding + (idx / (sortedSubmitted.length === 1 ? 1 : sortedSubmitted.length - 1)) * (width - padding * 2);
      const y = height - padding - (percentage / 100) * (height - padding * 2);
      return { x, y, percentage, title: t.title, date: formatDateShort(t.submittedAt) };
    });

    // Create SVG Path line
    let pathD = '';
    points.forEach((p, idx) => {
      if (idx === 0) {
        pathD += `M ${p.x} ${p.y}`;
      } else {
        // Curve to make it look highly professional
        const prev = points[idx - 1];
        const cpX1 = prev.x + (p.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (p.x - prev.x) / 2;
        const cpY2 = p.y;
        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
      }
    });

    return (
      <div className="w-full overflow-x-auto custom-scrollbar pt-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px] h-[180px] overflow-visible">
          <defs>
            <linearGradient id="gradientCurve" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F4B5CD" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#C3B4FC" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="strokeCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C3B4FC" />
              <stop offset="50%" stopColor="#F4B5CD" />
              <stop offset="100%" stopColor="#E0F2FE" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

          {/* Vertical connectors from nodes to date labels */}
          {points.map((p, idx) => (
            <line
              key={`v-conn-${idx}`}
              x1={p.x}
              y1={p.y}
              x2={p.x}
              y2={height - padding}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="2 3"
            />
          ))}

          {/* Fill Area */}
          {sortedSubmitted.length > 1 && (
            <path
              d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
              fill="url(#gradientCurve)"
            />
          )}

          {/* Main Path Line */}
          {sortedSubmitted.length > 1 ? (
            <path d={pathD} fill="none" stroke="url(#strokeCurve)" strokeWidth="3" strokeLinecap="round" />
          ) : (
            <circle cx={points[0].x} cy={points[0].y} r="4" fill="#F4B5CD" />
          )}

          {/* Nodes */}
          {points.map((p, idx) => (
            <g key={idx} className="group/node cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                fill="#12131a"
                stroke="#F4B5CD"
                strokeWidth="2.5"
                className="transition duration-200 group-hover/node:r-8 group-hover/node:fill-[#F4B5CD]"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="2"
                fill="white"
              />
              
              {/* Tooltip on top of node */}
              <text
                x={p.x}
                y={p.y - 14}
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-white/80 opacity-0 group-hover/node:opacity-100 transition-opacity bg-[#12131a]/95 duration-200"
              >
                {p.percentage}%
              </text>

              {/* X Axis Labels */}
              <text
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                className="text-[9px] font-mono font-bold fill-white/70"
              >
                {p.date}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-white/90 selection:bg-[#F4B5CD]/30 selection:text-white">
      {/* Top Banner Header */}
      <header className="border-b border-white/5 bg-[#12131a]/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F4B5CD]/20 to-[#C3B4FC]/10 border border-white/10 flex items-center justify-center shadow-lg">
              🎓
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-extrabold text-[#F4B5CD]/80">Кабинет ученика</p>
              <h1 className="text-xs font-serif text-white/90 font-medium truncate">{studentName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBack && (
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl mr-2">
                <button
                  type="button"
                  onClick={() => setTeacherMode(false)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider font-bold transition cursor-pointer ${
                    !teacherMode
                      ? 'bg-[#F4B5CD] text-[#12131a]'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Ученик
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherMode(true)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider font-bold transition cursor-pointer flex items-center gap-1 ${
                    teacherMode
                      ? 'bg-[#C3B4FC] text-[#12131a]'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  👑 Учитель
                </button>
              </div>
            )}
            {onBack && (
              <button
                type="button"
                onClick={() => {
                  if (activeTest && !window.confirm('Вы действительно хотите выйти из просмотра кабинета?')) {
                    return;
                  }
                  onBack();
                }}
                className="px-3.5 h-8 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/20 text-[#F4B5CD] transition rounded-lg text-[9px] uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer mr-2"
              >
                Панель репетитора
              </button>
            )}
            {activeTest || viewingResultsTest ? (
              <button
                onClick={() => {
                  if (activeTest && !window.confirm('Вы действительно хотите выйти? Прогресс решения не сохранится!')) {
                    return;
                  }
                  setActiveTest(null);
                  setViewingResultsTest(null);
                }}
                className="px-3.5 h-8 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-white/70 hover:text-white transition rounded-lg text-[9px] uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
              >
                Вернуться
              </button>
            ) : (
              <div className="text-[10px] font-mono text-white/20">
                Автопроверка включена • В сети
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {activeTest ? (
          /* ACTIVE TEST SOLVING SCREEN */
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-[#12131a]/95 border border-white/5 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-b from-[#F4B5CD]/[0.02] to-transparent rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-start gap-4 pb-3 border-b border-white/5 mb-6">
                <div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-[#F4B5CD]/10 text-[#F4B5CD] px-2 py-0.5 rounded border border-[#F4B5CD]/20">
                    {activeTest.type}
                  </span>
                  <h2 className="font-serif text-base md:text-lg text-white font-medium mt-1.5 leading-snug">
                    {activeTest.title}
                  </h2>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] uppercase tracking-widest text-white/30">Вопросов</p>
                  <p className="text-xs font-mono font-bold text-white/80">{activeTest.questions.length} заданий</p>
                </div>
              </div>

              {/* Real-time Anti-Cheating & Time Tracking Panel */}
              <div className="mb-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <span className="text-[10px] text-[#F4B5CD]/90 uppercase tracking-widest font-extrabold block">Режим контроля</span>
                    <span className="text-[9px] text-white/30 font-mono">Сворачивания вкладки фиксируются</span>
                  </div>
                </div>
                <div className="flex items-center gap-5 font-mono text-[11px] self-end sm:self-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">⏱️ Время:</span>
                    <span className="text-[#C3B4FC] font-extrabold text-xs">
                      {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">🚫 Сворачиваний:</span>
                    <span className={`font-extrabold text-xs transition-colors ${tabSwitchesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {tabSwitchesCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Questions list */}
              <div className="space-y-6">
                {activeTest.questions.map((q, idx) => {
                  const studentAns = answers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="p-4 md:p-5 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-xl space-y-4 transition"
                    >
                      {/* Quest Header */}
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-[10px] font-mono font-extrabold text-[#F4B5CD]/90 uppercase tracking-widest">
                          {q.taskNumber ? `Задание №${q.taskNumber}` : `Задание ${idx + 1}`}
                        </span>

                        {/* Discuss Flag */}
                        <button
                          type="button"
                          onClick={() => handleToggleDiscuss(q.id)}
                          className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                            wantToDiscuss[q.id]
                              ? 'bg-[#C3B4FC]/10 border-[#C3B4FC]/20 text-[#C3B4FC]'
                              : 'bg-white/5 border-white/5 text-white/30 hover:text-white/60'
                          }`}
                        >
                          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Обсудить на уроке</span>
                        </button>
                      </div>

                      {/* Question label text */}
                      <p className="text-xs text-white/85 whitespace-pre-wrap leading-relaxed font-light">
                        {q.text}
                      </p>

                      {/* Answers fields */}
                      {q.type === 'short' || q.type === 'matching' ? (
                        <div className="space-y-1">
                          <label className="block text-[8px] uppercase tracking-widest font-bold text-white/30">
                            {q.type === 'matching' ? 'Введите ответ на соответствие (например, 4152):' : 'Введите краткий ответ:'}
                          </label>
                          <input
                            type="text"
                            value={studentAns || ''}
                            onChange={(e) => handleShortAnswerChange(q.id, e.target.value)}
                            placeholder={q.type === 'matching' ? 'Например: 4152' : 'Ваш ответ...'}
                            className="w-full text-xs px-3.5 py-2.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl placeholder-white/20 transition duration-200"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="block text-[8px] uppercase tracking-widest font-bold text-white/30 mb-1">
                            Выберите правильный вариант:
                          </label>
                          {(q.options || []).map((opt, optIdx) => {
                            const isSelected = q.type === 'multiple' 
                              ? ((studentAns as number[]) || []).includes(optIdx)
                              : studentAns === optIdx;

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => {
                                  if (q.type === 'multiple') {
                                    handleMultipleAnswerChange(q.id, optIdx, !isSelected);
                                  } else {
                                    handleSingleAnswerChange(q.id, optIdx);
                                  }
                                }}
                                className={`w-full p-3 border rounded-xl text-left text-xs transition duration-200 flex items-center gap-3 cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#F4B5CD]/10 border-[#F4B5CD]/30 text-white shadow-[0_0_8px_rgba(244,181,205,0.05)]'
                                    : 'bg-white/5 border-white/5 hover:bg-white/[0.08] text-white/70 hover:text-white'
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 text-[10px] ${
                                  isSelected 
                                    ? 'bg-[#F4B5CD] border-[#F4B5CD] text-[#12131a]' 
                                    : 'border-white/20'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </span>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Solve Footer Actions */}
              <div className="flex gap-4 pt-6 border-t border-white/5 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Вы действительно хотите отменить решение? Введенные ответы не будут сохранены.')) {
                      setActiveTest(null);
                    }
                  }}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition text-[10px] tracking-widest uppercase font-bold cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSubmitTest}
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-[#F4B5CD]/20 to-[#C3B4FC]/20 hover:from-[#F4B5CD]/35 hover:to-[#C3B4FC]/35 border border-[#F4B5CD]/30 text-[#F4B5CD] rounded-xl transition text-[10px] tracking-widest uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Award className="w-4 h-4" />
                  <span>{submitting ? 'Отправка...' : 'Сдать на проверку'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : viewingResultsTest ? (
          /* TEST RESULTS ANALYSIS / ERROR VIEW */
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
              <span className="text-lg">🎉</span>
              <h4 className="text-xs font-serif text-emerald-400 font-bold">Тест проверен.</h4>
            </div>

            <div className="bg-[#12131a]/95 border border-white/5 rounded-2xl p-5 md:p-6 shadow-2xl space-y-5">
              
              {/* Score header box */}
              <div className="bg-gradient-to-r from-[#12131a] via-[#F4B5CD]/5 to-transparent border border-white/5 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <span className="text-[9px] font-mono font-bold bg-[#F4B5CD]/10 text-[#F4B5CD] border border-[#F4B5CD]/20 px-2 py-0.5 rounded">
                    Результаты проверки
                  </span>
                  <h3 className="font-serif text-base text-white font-medium mt-2">
                    {viewingResultsTest.title}
                  </h3>
                  <p className="text-[10px] text-white/40 mt-1">
                    Сдано: {viewingResultsTest.submittedAt ? new Date(viewingResultsTest.submittedAt).toLocaleString() : ''}
                  </p>
                </div>

                {/* Score bubble */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center shrink-0 min-w-[110px]">
                  <p className="text-[8px] uppercase tracking-wider text-white/40">Правильно</p>
                  <p className="text-2xl font-mono font-bold text-[#F4B5CD] mt-0.5">
                    {viewingResultsTest.score} / {viewingResultsTest.totalQuestions}
                  </p>
                  <p className="text-[9px] text-white/30 font-mono mt-0.5">
                    {viewingResultsTest.totalQuestions ? Math.round(((viewingResultsTest.score || 0) / viewingResultsTest.totalQuestions) * 100) : 0}% баллов
                  </p>
                </div>
              </div>

              {/* Submission metadata strip (Time Spent and Tab defocus tracking) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl font-mono text-[11px]">
                <div className="flex items-center justify-between px-1">
                  <span className="text-white/45">⏱️ Время решения:</span>
                  <span className="text-[#C3B4FC] font-extrabold">
                    {viewingResultsTest.timeSpent !== undefined ? (
                      `${Math.floor(viewingResultsTest.timeSpent / 60)} мин ${viewingResultsTest.timeSpent % 60} сек`
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0">
                  <span className="text-white/45">🚫 Сворачиваний вкладки (контроль):</span>
                  <span className={`font-extrabold ${viewingResultsTest.tabSwitches && viewingResultsTest.tabSwitches > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {viewingResultsTest.tabSwitches !== undefined ? `${viewingResultsTest.tabSwitches} раз` : '—'}
                  </span>
                </div>
              </div>

              {/* Questions review */}
              <div className="space-y-4">
                {viewingResultsTest.questions.map((q, idx) => {
                  const studentAns = viewingResultsTest.answers?.[q.id];
                  const isCorrect = viewingResultsTest.checkedResults?.[q.id];
                  const isDiscussed = viewingResultsTest.wantToDiscuss?.[q.id];

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border space-y-3 transition ${
                        isCorrect
                          ? 'bg-emerald-500/[0.02] border-emerald-500/10'
                          : 'bg-rose-500/[0.02] border-rose-500/10'
                      }`}
                    >
                      <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                        <span className="text-[10px] font-mono font-bold text-white/40">
                          {q.taskNumber ? `Задание №${q.taskNumber}` : `Задание ${idx + 1}`}
                        </span>

                        <div className="flex items-center gap-2">
                          {isDiscussed && (
                            <span className="px-2 py-0.5 rounded text-[8px] font-bold font-mono bg-[#C3B4FC]/10 text-[#C3B4FC] border border-[#C3B4FC]/15 uppercase tracking-wider">
                              К обсуждению 🙋‍♀️
                            </span>
                          )}

                          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 ${
                            isCorrect
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {isCorrect ? (
                              <>
                                <Check className="w-3 h-3" /> Верно
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" /> Неверно
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed font-light">
                        {q.text}
                      </p>

                      {/* Student's answer vs Correct Answer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* Student ans block */}
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-1">
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Твой ответ:</p>
                          <p className="text-xs font-serif text-white/85">
                            {q.type === 'short' || q.type === 'matching' ? (
                              studentAns || <span className="text-white/20 italic">Пусто</span>
                            ) : q.type === 'single' ? (
                              q.options?.[studentAns] || <span className="text-white/20 italic">Не выбрано</span>
                            ) : (
                              ((studentAns as number[]) || []).map(idx => q.options?.[idx]).join(', ') || <span className="text-white/20 italic">Не выбрано</span>
                            )}
                          </p>
                        </div>

                        {/* Correct ans block */}
                        <div className="p-3 bg-[#F4B5CD]/5 border border-[#F4B5CD]/10 rounded-lg space-y-1">
                          <p className="text-[8px] uppercase tracking-widest text-[#F4B5CD] font-bold">Правильный ответ:</p>
                          <p className="text-xs font-serif text-[#F4B5CD] font-medium">
                            {q.type === 'short' || q.type === 'matching' ? (
                              q.correctAnswer
                            ) : q.type === 'single' ? (
                              q.options?.[(q.correctOptions || []).findIndex(v => v === true)]
                            ) : (
                              (q.correctOptions || [])
                                .map((val, idx) => (val ? q.options?.[idx] : null))
                                .filter(Boolean)
                                .join(', ')
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Explanation Block */}
                      {q.explanation && (
                        <div className="p-3.5 bg-[#C3B4FC]/5 border border-[#C3B4FC]/10 rounded-lg space-y-1 mt-2">
                          <p className="text-[8px] uppercase tracking-widest text-[#C3B4FC] font-extrabold">Пояснение / Правило:</p>
                          <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed font-light">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Review footer */}
              <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setViewingResultsTest(null)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition text-[10px] tracking-widest uppercase font-bold cursor-pointer"
                >
                  Закрыть обзор
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD STUDENT DASHBOARD VIEW */
          <div className="space-y-8">
            
            {/* Banner Greeting */}
            <div className="relative bg-[#12131a]/80 border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="absolute inset-0 bg-radial-at-t from-[#F4B5CD]/5 to-transparent pointer-events-none" />
              <div className="absolute top-4 right-4 opacity-35 animate-pulse">
                <Sparkles className="w-5 h-5 text-[#F4B5CD]" />
              </div>

              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F4B5CD] animate-pulse" />
                  <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-[#F4B5CD]/80">Личный учебный хаб</span>
                </div>
                <h2 className="font-serif text-lg md:text-2xl text-white tracking-wide">
                  Привет, {studentName}! 👋
                </h2>
                <p className="text-xs text-white/45 leading-relaxed font-light">
                  Здесь находятся твои варианты и тесты по русскому языку с автоматической проверкой ответов. Решай новые задания и следи за динамикой правильных решений!
                </p>
              </div>

              {/* Fast simple stats widget */}
              <div className="flex gap-4 items-center shrink-0">
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center min-w-[100px]">
                  <p className="text-[8px] uppercase tracking-wider text-white/30 font-bold">Сдано тестов</p>
                  <p className="text-xl font-mono font-extrabold text-[#F4B5CD] mt-0.5">{completedTests.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center min-w-[100px]">
                  <p className="text-[8px] uppercase tracking-wider text-white/30 font-bold">Средний балл</p>
                  <p className="text-xl font-mono font-extrabold text-[#C3B4FC] mt-0.5">
                    {completedTests.length > 0
                      ? Math.round(
                          completedTests.reduce((acc, t) => {
                            const ratio = t.totalQuestions ? (t.score || 0) / t.totalQuestions : 0;
                            return acc + ratio * 100;
                          }, 0) / completedTests.length
                        ) + '%'
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Middle Section: Tests & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column (8 cols): Pending and Completed lists */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Available Tests */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-sans uppercase text-white/40 tracking-widest font-extrabold pb-2 border-b border-white/5 flex items-center justify-between">
                    <span>Доступные варианты ({pendingTests.length})</span>
                    <BookOpen className="w-3.5 h-3.5 text-[#F4B5CD]" />
                  </h3>

                  {pendingTests.length === 0 ? (
                    <div className="bg-white/[0.01] border border-dashed border-white/5 rounded-2xl p-10 text-center space-y-2">
                      <p className="text-xs text-white/40 font-light">Отличная работа! Новых назначенных тестов нет.</p>
                      <p className="text-[10px] text-white/20">Преподаватель добавит новые задания, когда они потребуются.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingTests.map(test => (
                        <div
                          key={test.id}
                          className="bg-[#12131a]/80 hover:bg-[#12131a] border border-white/5 hover:border-white/15 p-4 rounded-2xl flex items-center justify-between gap-4 transition duration-300 shadow-lg group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#F4B5CD]/5 to-transparent rounded-full pointer-events-none" />
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-[#F4B5CD]/10 text-[#F4B5CD] border border-[#F4B5CD]/15">
                                {test.type}
                              </span>
                              <span className="text-[9px] font-mono text-white/30">
                                {test.questions?.length || 0} заданий
                              </span>
                            </div>
                            <h4 className="font-serif text-xs font-semibold text-white/90 truncate leading-snug">
                              {test.title}
                            </h4>
                          </div>

                          <button
                            onClick={() => handleStartSolve(test)}
                            className="px-4 py-2.5 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[9px] font-extrabold tracking-widest uppercase transition rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <span>Решать</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* History / Results */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-sans uppercase text-white/40 tracking-widest font-extrabold pb-2 border-b border-white/5 flex items-center justify-between">
                    <span>История решений ({completedTests.length})</span>
                    <Clock className="w-3.5 h-3.5 text-white/30" />
                  </h3>

                  {completedTests.length === 0 ? (
                    <div className="text-center py-6 text-white/20 text-xs italic">
                      У вас пока нет решенных тестов.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {[...completedTests].reverse().map(test => {
                        const scoreRatio = test.totalQuestions ? (test.score || 0) / test.totalQuestions : 0;
                        const percentage = Math.round(scoreRatio * 100);

                        return (
                          <div
                            key={test.id}
                            className="bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl flex items-center justify-between gap-4 transition hover:bg-white/[0.03]"
                          >
                            <div className="min-w-0 flex-1">
                              <h4 className="font-serif text-xs text-white/85 truncate leading-snug">
                                {test.title}
                              </h4>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-white/30 mt-1 font-mono">
                                <span>Сдано: {test.submittedAt ? new Date(test.submittedAt).toLocaleDateString() : ''}</span>
                                <span>•</span>
                                <span>{test.totalQuestions} заданий</span>
                                {test.timeSpent !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[#C3B4FC]">⏱️ {Math.floor(test.timeSpent / 60)}м {test.timeSpent % 60}с</span>
                                  </>
                                )}
                                {test.tabSwitches !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span className={test.tabSwitches > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                                      🚫 {test.tabSwitches} {test.tabSwitches === 1 ? 'сворачивание' : test.tabSwitches > 1 && test.tabSwitches < 5 ? 'сворачивания' : 'сворачиваний'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="text-xs font-mono font-bold text-[#F4B5CD]">
                                  {test.score} / {test.totalQuestions}
                                </p>
                                <p className="text-[8px] text-white/30 font-mono">
                                  {percentage}%
                                </p>
                              </div>

                              <button
                                onClick={() => setViewingResultsTest(test)}
                                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-white/60 hover:text-white text-[9px] font-bold uppercase tracking-wider transition rounded-xl cursor-pointer"
                              >
                                Ошибки
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (5 cols): Analytics and Progress Chart */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Visual Progress Curve */}
                <div className="bg-[#12131a]/80 border border-white/5 p-5 rounded-2xl shadow-xl space-y-4 backdrop-blur-md">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-[10px] font-sans uppercase text-[#F4B5CD]/80 tracking-widest font-extrabold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Кривая прогресса
                    </span>
                  </div>

                  {renderProgressCurve()}
                </div>

                {/* Performance table / metrics (Redesigned as requested: Dates on top, Task numbers on the left) */}
                <div className="bg-[#12131a]/80 border border-white/5 p-5 rounded-2xl shadow-xl space-y-4 backdrop-blur-md">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-[10px] font-sans uppercase text-[#C3B4FC]/90 tracking-widest font-extrabold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Таблица прогресса по заданиям
                    </span>
                  </div>

                  {completedTests.length === 0 ? (
                    <p className="text-[10px] text-white/35 italic py-2">Таблица будет доступна после сдачи первого теста.</p>
                  ) : (
                    <div className="w-full overflow-x-auto custom-scrollbar pt-1">
                      <table className="w-full text-center border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-[9px] font-bold text-white/40 uppercase tracking-wider">
                            <th className="py-2.5 px-2 text-left font-semibold sticky left-0 bg-[#12131a] z-10 min-w-[70px]">Задание</th>
                            {completedTests.map(test => {
                              const dateFormatted = test.submittedAt 
                                ? new Date(test.submittedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) 
                                : '';
                              return (
                                <th key={test.id} className="py-2.5 px-2 font-mono text-[9px] text-white/60 font-medium min-w-[55px]">
                                  <div className="flex flex-col items-center">
                                    <span className="text-white/80 font-bold">{dateFormatted}</span>
                                    <span className="text-[7px] text-white/30 truncate max-w-[45px] mt-0.5" title={test.title}>
                                      {test.title}
                                    </span>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                          {allTaskNumbers.map(taskNum => (
                            <tr key={taskNum} className="hover:bg-white/[0.02] transition">
                              <td className="py-2.5 px-2 text-left font-mono font-bold text-white/60 sticky left-0 bg-[#12131a]/95 z-10 border-r border-white/5">
                                № {taskNum}
                              </td>
                              {completedTests.map(test => {
                                const status = getCellStatus(test, taskNum);
                                return (
                                  <td key={test.id} className="py-2.5 px-2 font-mono text-center">
                                    {status === 'correct' ? (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/10 text-xs" title={`${test.title}: Верно`}>
                                        +
                                      </span>
                                    ) : status === 'incorrect' ? (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/10 text-xs" title={`${test.title}: Ошибка`}>
                                        −
                                      </span>
                                    ) : (
                                      <span className="text-white/25 text-xs font-light" title={`${test.title}: Не было в тесте`}>
                                        —
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
