import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, X, MessageCircle, Send, Copy, ChevronLeft, BookOpen, 
  Award, TrendingUp, Calendar, List, Sparkles, Clock, Share2, HelpCircle 
} from 'lucide-react';
import { StudentCabinet, AssignedTest, TestQuestion } from '../types';
import { decodeData, toCompact, fromCompact, compressResult, CompactResult } from '../utils/codec';
import { safeStorage } from '../utils/safeStorage';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface StudentCabinetViewProps {
  cabinetId?: string | null;
  cabinetData?: string | null;
}

export function StudentCabinetView({ cabinetId, cabinetData }: StudentCabinetViewProps) {
  // State for loaded cabinet
  const [cabinet, setCabinet] = useState<StudentCabinet | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active test being taken
  const [activeTest, setActiveTest] = useState<AssignedTest | null>(null);
  // Answers being filled
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Discuss flags
  const [discussFlags, setDiscussFlags] = useState<Record<string, boolean>>({});

  // Submission state
  const [submittedResult, setSubmittedResult] = useState<{
    score: number;
    total: number;
    code: string;
    testTitle: string;
    discussList: number[];
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  // Tab state in cabinet
  const [activeCabinetTab, setActiveCabinetTab] = useState<'tests' | 'progress'>('tests');

  // Load cabinet data on mount with Firestore Realtime Sync
  useEffect(() => {
    try {
      if (cabinetData) {
        // Load from URL data
        const decoded = decodeData(cabinetData);
        if (decoded) {
          const loadedCabinet = decoded.i ? fromCompact(decoded) : (decoded as StudentCabinet);
          setCabinet(loadedCabinet);
          // Cache in localStorage so student doesn't lose it on reload
          safeStorage.setItem(`student_cached_cabinet_${loadedCabinet.id}`, JSON.stringify(loadedCabinet));
          safeStorage.setItem('last_viewed_student_cabinet_id', loadedCabinet.id);
        } else {
          throw new Error('Не удалось декодировать данные кабинета');
        }
      } else if (cabinetId) {
        // Try loading from localStorage cache first (offline-first, super snappy)
        const stored = safeStorage.getItem(`student_cached_cabinet_${cabinetId}`);
        if (stored) {
          try {
            setCabinet(JSON.parse(stored));
          } catch (e) {
            console.error(e);
          }
        }

        // Connect real-time subscription to cloud document
        const docRef = doc(db, 'cabinets', cabinetId);
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const cloudCabinet = snapshot.data() as StudentCabinet;
            setCabinet(cloudCabinet);
            safeStorage.setItem(`student_cached_cabinet_${cabinetId}`, JSON.stringify(cloudCabinet));
            safeStorage.setItem('last_viewed_student_cabinet_id', cabinetId);
          } else {
            if (!stored) {
              setError('Кабинет не найден на сервере. Возможно, репетитор удалил его.');
            }
          }
        }, (err) => {
          console.error('Firestore subscription error:', err);
        });

        return () => unsubscribe();
      } else {
        // Fallback to last viewed cabinet
        const lastId = safeStorage.getItem('last_viewed_student_cabinet_id');
        if (lastId) {
          const stored = safeStorage.getItem(`student_cached_cabinet_${lastId}`);
          if (stored) {
            try {
              setCabinet(JSON.parse(stored));
              return;
            } catch (e) {
              console.error(e);
            }
          }
        }
        setError('Ссылка пуста или недействительна. Попросите репетитора отправить вам прямую ссылку на кабинет.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Ошибка при загрузке кабинета. Убедитесь, что ссылка скопирована полностью.');
    }
  }, [cabinetId, cabinetData]);

  // Handle selecting a test to solve
  const handleStartTest = (test: AssignedTest) => {
    if (test.status === 'submitted') return;
    setActiveTest(test);
    setAnswers(test.answers || {});
    setDiscussFlags(test.wantToDiscuss || {});
    setSubmittedResult(null);
  };

  // Toggle discussion flag
  const toggleDiscuss = (qId: string) => {
    setDiscussFlags(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  // Submit test and perform autocheck
  const handleSubmitTest = () => {
    if (!activeTest || !cabinet) return;

    let correctCount = 0;
    const checked: Record<string, boolean> = {};

    activeTest.questions.forEach((q) => {
      const studentAnswer = (answers[q.id] || '').trim().toLowerCase();
      const correctAnswer = (q.correctAnswer || '').trim().toLowerCase();
      const isCorrect = studentAnswer === correctAnswer;
      if (isCorrect) {
        correctCount++;
      }
      checked[q.id] = isCorrect;
    });

    const submittedAtStr = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Update test instance
    const updatedTest: AssignedTest = {
      ...activeTest,
      status: 'submitted',
      submittedAt: submittedAtStr,
      answers,
      wantToDiscuss: discussFlags,
      score: correctCount,
      totalQuestions: activeTest.questions.length,
      checkedResults: checked
    };

    // Update cabinet list
    const updatedTests = cabinet.assignedTests.map(t => t.id === activeTest.id ? updatedTest : t);
    const updatedCabinet: StudentCabinet = {
      ...cabinet,
      assignedTests: updatedTests
    };

    // Save to state and localStorage
    setCabinet(updatedCabinet);
    safeStorage.setItem(`student_cached_cabinet_${cabinet.id}`, JSON.stringify(updatedCabinet));

    // Real-time Cloud Sync (requires zero registration or steps from student)
    const docRef = doc(db, 'cabinets', cabinet.id);
    setDoc(docRef, updatedCabinet, { merge: true })
      .then(() => {
        console.log('Cabinet results auto-saved to cloud successfully!');
      })
      .catch((err) => {
        console.error('Failed to auto-save results to cloud:', err);
      });

    // Generate compressed response code
    const compactResult: CompactResult = {
      i: cabinet.id,
      t: activeTest.id,
      a: answers,
      d: discussFlags,
      r: correctCount,
      u: submittedAtStr
    };

    const resultString = compressResult(compactResult);

    // List of question indices student wants to discuss
    const discussIndices: number[] = [];
    activeTest.questions.forEach((q, idx) => {
      if (discussFlags[q.id]) {
        discussIndices.push(idx + 1);
      }
    });

    setSubmittedResult({
      score: correctCount,
      total: activeTest.questions.length,
      code: resultString,
      testTitle: activeTest.title,
      discussList: discussIndices
    });
  };

  // Copy result code
  const handleCopyCode = () => {
    if (!submittedResult) return;
    navigator.clipboard.writeText(submittedResult.code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  // Generate messenger text
  const getShareText = () => {
    if (!submittedResult || !cabinet) return '';
    const name = cabinet.studentName;
    const percent = Math.round((submittedResult.score / submittedResult.total) * 100);
    let msg = `🎓 Ученик ${name} сдал тест "${submittedResult.testTitle}"\n`;
    msg += `📊 Результат: ${submittedResult.score} из ${submittedResult.total} (${percent}%)\n`;
    if (submittedResult.discussList.length > 0) {
      msg += `❓ Вопросы на обсуждение: ${submittedResult.discussList.join(', ')}\n`;
    }
    msg += `🔑 Код ответа (вставьте в приложении репетитора):\n${submittedResult.code}`;
    return encodeURIComponent(msg);
  };

  // Completed tests list for graph & matrix
  const completedTests = useMemo(() => {
    if (!cabinet) return [];
    return (cabinet.assignedTests || []).filter(t => t.status === 'submitted');
  }, [cabinet]);

  // Max number of questions across completed tests (for error matrix sizing)
  const maxQuestionCount = useMemo(() => {
    if (completedTests.length === 0) return 0;
    return Math.max(...completedTests.map(t => t.questions.length));
  }, [completedTests]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0C0D12] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mb-6">
          <X className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold font-sans text-red-200">Личный кабинет не доступен</h1>
        <p className="text-sm text-white/50 max-w-md mt-2 font-sans">
          {error}
        </p>
      </div>
    );
  }

  if (!cabinet) {
    return (
      <div className="min-h-screen bg-[#0C0D12] text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-[#F4B5CD]/20 border-t-[#F4B5CD] rounded-full animate-spin"></div>
        <p className="text-sm text-white/50 mt-4 font-mono">Загрузка личного кабинета...</p>
      </div>
    );
  }

  // Active Test-Taking Panel
  if (activeTest) {
    return (
      <div className="min-h-screen bg-[#0C0D12] text-white/95 pb-20">
        {/* Tutor Back-to-Dashboard Navigation Banner */}
        {(safeStorage.getItem('tutor_local_cabinets') || safeStorage.getItem('guest_tutor_id')) && (
          <div className="bg-gradient-to-r from-purple-950 via-[#F4B5CD]/20 to-purple-950 border-b border-[#F4B5CD]/20 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs relative z-50">
            <span className="text-white/80 font-sans text-center sm:text-left">
              👨‍🏫 Вы зашли по ссылке ученика. Режим просмотра кабинета <strong className="text-white">{cabinet.studentName}</strong>.
            </span>
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('cabinetId');
                url.searchParams.delete('cabinet');
                url.searchParams.delete('cabinet_data');
                window.location.href = url.pathname;
              }}
              className="px-3 py-1 bg-[#F4B5CD] hover:bg-[#F4B5CD]/90 text-black font-extrabold uppercase text-[10px] rounded-lg transition font-mono cursor-pointer shrink-0"
            >
              Вернуться в панель репетитора
            </button>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 z-50 bg-[#0C0D12]/90 backdrop-blur-md border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.confirm('Вы уверены, что хотите выйти из теста? Ваши ответы будут сохранены, но тест не будет сдан.')) {
                // Save answers to draft
                const draftTest: AssignedTest = {
                  ...activeTest,
                  answers,
                  wantToDiscuss: discussFlags
                };
                const updated = cabinet.assignedTests.map(t => t.id === activeTest.id ? draftTest : t);
                const updatedCab = { ...cabinet, assignedTests: updated };
                setCabinet(updatedCab);
                safeStorage.setItem(`student_cached_cabinet_${cabinet.id}`, JSON.stringify(updatedCab));
                
                // Auto-save draft to cloud
                const docRef = doc(db, 'cabinets', cabinet.id);
                setDoc(docRef, updatedCab, { merge: true })
                  .catch((err) => console.error('Failed to auto-save draft to cloud:', err));

                setActiveTest(null);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition text-xs font-bold uppercase tracking-wider font-mono cursor-pointer border border-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
            В кабинет
          </button>
          
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-wider text-[#F4B5CD] font-bold">Выполняется тест</span>
            <span className="text-sm font-semibold truncate max-w-[180px] sm:max-w-xs">{activeTest.title}</span>
          </div>
        </div>

        {/* Test Submission Success View */}
        {submittedResult ? (
          <div className="max-w-2xl mx-auto px-4 py-12 animate-fadeIn text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            
            <h1 className="text-2xl font-bold font-sans text-emerald-300">Тест успешно сдан!</h1>
            
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 my-6 text-left max-w-sm mx-auto flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Синхронизация с репетитором</h4>
                <p className="text-[11px] text-emerald-400/80 leading-relaxed mt-0.5">
                  Ваши ответы сохранены в облаке и уже отправлены вашему преподавателю. От вас ничего более не требуется!
                </p>
              </div>
            </div>

            <p className="text-white/40 text-xs mt-2 max-w-md mx-auto">
              Если преподаватель работает офлайн, вы можете переслать ему код ответа вручную:
            </p>

            {/* Score Showcase */}
            <div className="bg-gradient-to-br from-emerald-500/5 to-white/5 border border-emerald-500/20 p-6 rounded-2xl my-8 max-w-sm mx-auto">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">Ваш результат</span>
              <div className="text-4xl font-extrabold mt-2 text-white font-sans">
                {submittedResult.score} <span className="text-white/30 text-2xl">/ {submittedResult.total}</span>
              </div>
              <div className="text-xs text-white/50 mt-1">
                Точность: {Math.round((submittedResult.score / submittedResult.total) * 100)}%
              </div>
            </div>

            {/* Code Copy block */}
            <div className="bg-[#12131C] border border-white/5 p-5 rounded-2xl text-left max-w-md mx-auto mb-8">
              <span className="text-[9px] uppercase tracking-wider font-bold text-[#F4B5CD] font-mono block mb-2">
                Код результатов для репетитора
              </span>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={submittedResult.code}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white/70 flex-1 outline-none"
                />
                <button
                  onClick={handleCopyCode}
                  className={`px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition font-mono cursor-pointer flex items-center justify-center gap-1.5 ${
                    copiedCode 
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                      : 'bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/20 text-[#F4B5CD]'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedCode ? 'Сделано!' : 'Копировать'}
                </button>
              </div>
            </div>

            {/* Send Options */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <a
                href={`https://t.me/share/url?url=&text=${getShareText()}`}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-5 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/30 text-[#229ED9] text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                В Telegram
              </a>
              <a
                href={`https://api.whatsapp.com/send?text=${getShareText()}`}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                В WhatsApp
              </a>
              <button
                onClick={() => {
                  setActiveTest(null);
                  setSubmittedResult(null);
                }}
                className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Вернуться в кабинет
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-8 animate-fadeIn">
            {/* Question List */}
            <div className="space-y-6">
              {activeTest.questions.map((q, index) => {
                const isSelected = (val: string) => answers[q.id] === val;
                const isDiscussed = !!discussFlags[q.id];

                return (
                  <div 
                    key={q.id}
                    className={`bg-gradient-to-b from-white/[0.03] to-white/[0.01] border p-6 rounded-2xl transition duration-300 relative group ${
                      isDiscussed ? 'border-[#F4B5CD]/30 shadow-lg shadow-[#F4B5CD]/5' : 'border-white/5'
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex items-center justify-between mb-4 gap-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-white/5 px-2.5 py-1 rounded-xl text-[10px] font-bold text-white/70 font-mono uppercase tracking-wider">
                          Задание {index + 1}
                        </span>
                        <span className="text-[10px] text-white/30 font-mono uppercase">
                          {q.type === 'single' ? 'Один вариант' : 'Краткий ответ'}
                        </span>
                      </div>
                      
                      {/* Discuss button */}
                      <button
                        type="button"
                        onClick={() => toggleDiscuss(q.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] uppercase font-bold tracking-wider font-mono transition cursor-pointer border ${
                          isDiscussed 
                            ? 'bg-[#F4B5CD]/20 border-[#F4B5CD]/35 text-[#F4B5CD]' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'
                        }`}
                        title="Хочу подробно обсудить это задание на уроке с репетитором"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Хочу обсудить</span>
                      </button>
                    </div>

                    {/* Question text */}
                    <p className="text-sm font-sans text-white/90 leading-relaxed mb-6 font-medium">
                      {q.text}
                    </p>

                    {/* Input controls based on type */}
                    {q.type === 'single' && q.options ? (
                      <div className="space-y-2.5">
                        {q.options.map((opt, optIdx) => (
                          <label
                            key={optIdx}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer text-xs select-none ${
                              isSelected(String(optIdx))
                                ? 'bg-[#F4B5CD]/10 border-[#F4B5CD]/35 text-white'
                                : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02] text-white/70'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question_${q.id}`}
                              checked={isSelected(String(optIdx))}
                              onChange={() => setAnswers(prev => ({ ...prev, [q.id]: String(optIdx) }))}
                              className="sr-only"
                            />
                            {/* Visual Radio mark */}
                            <div className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                              isSelected(String(optIdx))
                                ? 'border-[#F4B5CD] bg-[#F4B5CD]/20'
                                : 'border-white/20'
                            }`}>
                              {isSelected(String(optIdx)) && (
                                <div className="w-1.5 h-1.5 rounded-full bg-[#F4B5CD]" />
                              )}
                            </div>
                            <span className="leading-normal font-sans">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          placeholder="Введите ответ..."
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 focus:border-[#F4B5CD]/40 rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 outline-none transition"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="mt-10 bg-gradient-to-b from-[#12131C] to-black/30 border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest block font-mono">Тест заполнен на</span>
                <p className="text-xs text-white/80 font-sans mt-0.5 font-bold">
                  {Object.keys(answers).length} из {activeTest.questions.length} вопросов ({Math.round((Object.keys(answers).length / activeTest.questions.length) * 100)}%)
                </p>
              </div>
              <button
                onClick={handleSubmitTest}
                className="w-full sm:w-auto py-3 px-8 bg-gradient-to-r from-emerald-500/80 to-emerald-400/80 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold uppercase tracking-wider transition rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/5 border border-emerald-500/25"
              >
                <Check className="w-4 h-4" />
                Сдать тест на проверку
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0D12] text-white/95 pb-20 font-sans">
      {/* Tutor Back-to-Dashboard Navigation Banner */}
      {(safeStorage.getItem('tutor_local_cabinets') || safeStorage.getItem('guest_tutor_id')) && (
        <div className="bg-gradient-to-r from-purple-950 via-[#F4B5CD]/20 to-purple-950 border-b border-[#F4B5CD]/20 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs relative z-50">
          <span className="text-white/80 font-sans text-center sm:text-left">
            👨‍🏫 Вы зашли по ссылке ученика. Режим просмотра кабинета <strong className="text-white">{cabinet.studentName}</strong>.
          </span>
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('cabinetId');
              url.searchParams.delete('cabinet');
              url.searchParams.delete('cabinet_data');
              window.location.href = url.pathname;
            }}
            className="px-3 py-1 bg-[#F4B5CD] hover:bg-[#F4B5CD]/90 text-black font-extrabold uppercase text-[10px] rounded-lg transition font-mono cursor-pointer shrink-0"
          >
            Вернуться в панель репетитора
          </button>
        </div>
      )}

      {/* Sparkle background decoration */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none select-none" />

      {/* Hero Welcome banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6 relative z-10">
        <div className="bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-[#F4B5CD]/20 to-purple-500/20 border border-[#F4B5CD]/30 rounded-2xl flex items-center justify-center shrink-0">
              <Award className="w-7 h-7 text-[#F4B5CD]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 rounded-xl text-purple-300 font-mono uppercase font-bold tracking-wider">
                  Кабинет ученика
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-sans tracking-tight text-white mt-1">
                {cabinet.studentName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs text-white/50 bg-black/20 px-4 py-2.5 rounded-2xl border border-white/5">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-white/30 tracking-wider">Всего тестов</span>
              <span className="text-sm font-bold text-white/80 mt-0.5">{cabinet.assignedTests.length}</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-white/30 tracking-wider">Решено</span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5">{completedTests.length}</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase text-white/30 tracking-wider">Ожидает</span>
              <span className="text-sm font-bold text-[#F4B5CD] mt-0.5">
                {cabinet.assignedTests.length - completedTests.length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2.5 mt-8 border-b border-white/5 pb-px">
          <button
            onClick={() => setActiveCabinetTab('tests')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider font-mono transition cursor-pointer relative ${
              activeCabinetTab === 'tests' 
                ? 'text-white' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <div className="flex items-center gap-2 px-3">
              <List className="w-4 h-4" />
              <span>Назначенные тесты</span>
            </div>
            {activeCabinetTab === 'tests' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F4B5CD] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveCabinetTab('progress')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider font-mono transition cursor-pointer relative ${
              activeCabinetTab === 'progress' 
                ? 'text-white' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <div className="flex items-center gap-2 px-3">
              <TrendingUp className="w-4 h-4" />
              <span>Прогресс & Ошибки</span>
            </div>
            {activeCabinetTab === 'progress' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F4B5CD] rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeCabinetTab === 'tests' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cabinet.assignedTests.length === 0 ? (
                <div className="col-span-full bg-white/[0.01] border border-white/5 rounded-3xl p-10 text-center">
                  <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-white/80">Пока нет назначенных тестов</h3>
                  <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto leading-relaxed">
                    Репетитор добавит тесты, и они сразу появятся на этой странице.
                  </p>
                </div>
              ) : (
                cabinet.assignedTests.map((t) => {
                  const isSubmitted = t.status === 'submitted';
                  
                  return (
                    <div
                      key={t.id}
                      className={`bg-gradient-to-br from-white/[0.03] to-white/[0.01] border rounded-2xl p-5 flex flex-col justify-between transition group ${
                        isSubmitted 
                          ? 'border-white/5 opacity-80' 
                          : 'border-white/10 hover:border-[#F4B5CD]/30 hover:shadow-lg hover:shadow-[#F4B5CD]/2'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="bg-purple-500/10 border border-purple-500/20 text-[#C3B4FC] text-[9px] font-bold font-mono px-2 py-0.5 rounded-xl uppercase tracking-wider">
                            {t.type}
                          </span>
                          
                          {isSubmitted ? (
                            <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-emerald-400 font-mono bg-emerald-500/5 px-2 py-0.5 rounded-xl border border-emerald-500/10">
                              <Check className="w-3 h-3" />
                              Сдано
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-[#F4B5CD] font-mono bg-[#F4B5CD]/5 px-2 py-0.5 rounded-xl border border-[#F4B5CD]/10">
                              <Clock className="w-3 h-3" />
                              Ожидает решения
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold leading-snug group-hover:text-[#F4B5CD] transition">
                          {t.title}
                        </h3>

                        <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono mt-4">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 opacity-60" />
                            {t.questions.length} зад.
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 opacity-60" />
                            {new Date(t.assignedAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                        {isSubmitted ? (
                          <div className="text-xs font-mono">
                            Результат:{' '}
                            <span className="text-emerald-400 font-bold font-sans">
                              {t.score}
                            </span>{' '}
                            / {t.totalQuestions}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#F4B5CD] font-mono font-bold animate-pulse">
                            Начать сейчас →
                          </div>
                        )}

                        <button
                          onClick={() => handleStartTest(t)}
                          disabled={isSubmitted}
                          className={`py-1.5 px-4 text-[10px] uppercase font-extrabold tracking-wider transition rounded-xl font-mono ${
                            isSubmitted
                              ? 'bg-white/5 border border-white/5 text-white/30 cursor-not-allowed'
                              : 'bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 border border-[#F4B5CD]/35 text-[#F4B5CD] cursor-pointer'
                          }`}
                        >
                          {isSubmitted ? 'Сдано' : 'Решать'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Progress & Error Matrix Tab */
            <div className="space-y-6">
              {completedTests.length === 0 ? (
                <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-10 text-center">
                  <TrendingUp className="w-10 h-10 text-white/20 mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-white/80">Пока нет статистики</h3>
                  <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
                    Выполните и сдайте первый тест, чтобы здесь появился график прогресса успеваемости и подробный анализ ошибок.
                  </p>
                </div>
              ) : (
                <>
                  {/* Custom Svg Chart */}
                  <div className="bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/5 p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Динамика успеваемости</span>
                        <h3 className="text-sm font-bold mt-0.5">Средняя точность ответов</h3>
                      </div>
                      <div className="text-emerald-400 font-mono text-sm font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                        {Math.round(
                          (completedTests.reduce((sum, t) => sum + (t.score || 0), 0) /
                            completedTests.reduce((sum, t) => sum + (t.totalQuestions || 0), 0)) *
                            100
                        )}
                        %
                      </div>
                    </div>

                    {/* Beautiful minimalist line chart inside SVG */}
                    <div className="h-44 w-full mt-4">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
                        {/* Define gradients */}
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F4B5CD" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#F4B5CD" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Guidelines */}
                        <line x1="0" y1="10" x2="500" y2="10" stroke="rgba(255,255,255,0.04)" strokeDasharray="4" strokeWidth="0.5" />
                        <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="4" strokeWidth="0.5" />
                        <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.04)" strokeDasharray="4" strokeWidth="0.5" />

                        {/* Chart path builder */}
                        {(() => {
                          const padding = 15;
                          const w = 500;
                          const h = 100;
                          const points = completedTests.map((t, idx) => {
                            const x = idx === 0 && completedTests.length === 1 
                              ? w / 2 
                              : padding + (idx * (w - padding * 2)) / Math.max(1, completedTests.length - 1);
                            
                            const scorePercent = t.totalQuestions ? (t.score || 0) / t.totalQuestions : 0;
                            // Invert: 0% -> 90px, 100% -> 10px
                            const y = 90 - scorePercent * 80;
                            return { x, y, title: t.title, percent: Math.round(scorePercent * 100) };
                          });

                          let dPath = '';
                          let dArea = '';

                          if (points.length > 0) {
                            dPath = `M ${points[0].x} ${points[0].y}`;
                            dArea = `M ${points[0].x} 95 L ${points[0].x} ${points[0].y}`;
                            
                            for (let i = 1; i < points.length; i++) {
                              dPath += ` L ${points[i].x} ${points[i].y}`;
                              dArea += ` L ${points[i].x} ${points[i].y}`;
                            }
                            
                            dArea += ` L ${points[points.length - 1].x} 95 Z`;
                          }

                          return (
                            <>
                              {/* Filled Area */}
                              {dArea && <path d={dArea} fill="url(#chartGrad)" />}
                              
                              {/* Line */}
                              {dPath && (
                                <path 
                                  d={dPath} 
                                  fill="none" 
                                  stroke="#F4B5CD" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                />
                              )}

                              {/* Interactive dots */}
                              {points.map((p, idx) => (
                                <g key={idx} className="group/dot cursor-pointer">
                                  <circle 
                                    cx={p.x} 
                                    cy={p.y} 
                                    r="4" 
                                    fill="#0C0D12" 
                                    stroke="#F4B5CD" 
                                    strokeWidth="2.5" 
                                    className="transition-all duration-200 group-hover/dot:r-5 group-hover/dot:stroke-white"
                                  />
                                  {/* Tooltip on hover */}
                                  <foreignObject
                                    x={p.x - 45}
                                    y={p.y - 30}
                                    width="90"
                                    height="25"
                                    className="opacity-0 group-hover/dot:opacity-100 transition duration-200 pointer-events-none"
                                  >
                                    <div className="bg-[#12131C] border border-white/10 rounded px-1.5 py-0.5 text-[8px] font-mono text-center text-white/90 truncate shadow-xl">
                                      {p.percent}%
                                    </div>
                                  </foreignObject>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Timeline indicators */}
                    <div className="flex justify-between items-center text-[8px] font-mono text-white/30 px-2 mt-2">
                      <span>Начало</span>
                      <span>Всего {completedTests.length} реш. тестов</span>
                      <span>Конец</span>
                    </div>
                  </div>

                  {/* Summary Error Matrix */}
                  <div className="bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/5 p-6 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Сводная матрица</span>
                        <h3 className="text-sm font-bold mt-0.5">Карта ошибок по заданиям</h3>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-white/50">
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> Верно
                        </span>
                        <span className="flex items-center gap-1">
                          <X className="w-3 h-3 text-red-400" /> Ошибка
                        </span>
                        <span className="flex items-center gap-1 text-[#F4B5CD]">
                          <HelpCircle className="w-3 h-3" /> Обсудить
                        </span>
                      </div>
                    </div>

                    {/* Responsive table wrapper */}
                    <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02] text-[9px] uppercase tracking-wider font-mono text-white/40 font-bold">
                            <th className="py-3 px-4 font-normal">Название теста / Дата</th>
                            {Array.from({ length: maxQuestionCount }).map((_, idx) => (
                              <th key={idx} className="py-3 px-3 text-center font-normal">
                                Зад. {idx + 1}
                              </th>
                            ))}
                            <th className="py-3 px-4 text-right font-normal">Верно</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs">
                          {completedTests.map((t) => (
                            <tr key={t.id} className="hover:bg-white/[0.01] transition font-sans">
                              <td className="py-3 px-4">
                                <div className="font-bold text-white/90 truncate max-w-[180px] sm:max-w-xs">{t.title}</div>
                                <div className="text-[9px] text-white/30 font-mono mt-0.5">
                                  {t.submittedAt || 'Дата не указана'}
                                </div>
                              </td>
                              
                              {/* Tasks matrix cells */}
                              {Array.from({ length: maxQuestionCount }).map((_, idx) => {
                                const q = t.questions[idx];
                                if (!q) {
                                  return (
                                    <td key={idx} className="py-3 px-3 text-center text-white/10 font-mono text-[10px]">
                                      —
                                    </td>
                                  );
                                }

                                const isCorrect = t.checkedResults?.[q.id];
                                const isDiscussed = t.wantToDiscuss?.[q.id];

                                return (
                                  <td key={idx} className="py-3 px-3 text-center">
                                    <div className="inline-flex flex-col items-center gap-1">
                                      {isCorrect ? (
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        </div>
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                          <X className="w-3 h-3 text-red-400" />
                                        </div>
                                      )}
                                      
                                      {isDiscussed && (
                                        <span className="text-[8px] bg-[#F4B5CD]/10 text-[#F4B5CD] border border-[#F4B5CD]/20 px-1 rounded font-mono font-bold">
                                          ОБСУДИТЬ
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}

                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                                {t.score} <span className="text-white/30 text-[10px]">/ {t.questions.length}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
