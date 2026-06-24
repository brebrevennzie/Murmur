import React, { useState, useEffect, useMemo } from 'react';
import { Student, SyllabusProgram } from './types';
import { getInitialStudents, saveStudents, INITIAL_STUDENTS, getInitialPrograms, savePrograms } from './data';
import { syncAllStudents } from './utils/paymentSync';
import { safeStorage } from './utils/safeStorage';
import { StudentCard } from './components/StudentCard';
import { StudentDetail } from './components/StudentDetail';
import { DashboardStats } from './components/DashboardStats';
import { AddStudentModal } from './components/AddStudentModal';
import { ImportScheduleModal } from './components/ImportScheduleModal';
import { ProgramManagerModal } from './components/ProgramManagerModal';
import { FirebaseSyncModal } from './components/FirebaseSyncModal';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { 
  Plus, GraduationCap, Grid, SlidersHorizontal, 
  HelpCircle, RefreshCw, AlertCircle, BookOpen, Layers,
  Calendar, FileText, Cloud, CloudOff
} from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Filter state
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'progress'>('name');

  // Quick Post-Lesson Note states
  const [quickStudentId, setQuickStudentId] = useState<string>('');
  const [quickNote, setQuickNote] = useState<string>('');
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);

  // Modal open trigger
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [syllabusPrograms, setSyllabusPrograms] = useState<SyllabusProgram[]>([]);
  const [showProgramManager, setShowProgramManager] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const {
    user,
    loading: syncLoading,
    syncStatus,
    authError,
    setAuthError,
    handleSignIn,
    handleSignUp,
    handleGoogleSignIn,
    handleSignOut,
    isConnectionBlocked,
  } = useFirebaseSync(students, setStudents, syllabusPrograms, setSyllabusPrograms);

  // Load students and programs on start
  useEffect(() => {
    setStudents(syncAllStudents(getInitialStudents()));
    setSyllabusPrograms(getInitialPrograms());
  }, []);

  const handleSaveSyllabusPrograms = (updated: SyllabusProgram[]) => {
    setSyllabusPrograms(updated);
    savePrograms(updated);
  };

  // Save students on change
  const handleUpdateStudents = (updatedStudents: Student[]) => {
    const synced = syncAllStudents(updatedStudents);
    setStudents(synced);
    saveStudents(synced);
  };

  // Add individual student
  const handleAddStudent = (newStudent: Student) => {
    const updated = [...students, newStudent];
    handleUpdateStudents(updated);
    setShowAddModal(false);
  };

  // Update specific student (when edited in their cabinet)
  const handleUpdateStudent = (updatedStudent: Student) => {
    const updated = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    handleUpdateStudents(updated);
  };

  // Completely delete student cabinet
  const handleDeleteStudent = (studentId: string) => {
    if (window.confirm('Вы уверены, что хотите безвозвратно удалить личный кабинет этого ученика? Все данные о пробниках, уроках и оплатах будут стерты.')) {
      const updated = students.filter(s => s.id !== studentId);
      handleUpdateStudents(updated);
      setSelectedStudentId(null);
    }
  };

  // Dispatch a quick note to a student's cabinet from the dashboard
  const handleSendQuickNote = () => {
    if (!quickStudentId || !quickNote.trim()) return;

    const targetStudent = students.find(s => s.id === quickStudentId);
    if (!targetStudent) return;

    const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const formattedEntry = `• [${dateStr}] ${quickNote.trim()}`;

    // Prepend to notes
    const newNotes = targetStudent.notes
      ? `${formattedEntry}\n${targetStudent.notes}`
      : formattedEntry;

    // Update student notes
    handleUpdateStudent({
      ...targetStudent,
      notes: newNotes
    });

    // Alert success banner
    setQuickSuccess(`Заметка успешно добавлена в личный кабинет ученика ${targetStudent.emoji} ${targetStudent.name}!`);
    setQuickNote('');
    
    setTimeout(() => {
      setQuickSuccess(null);
    }, 4500);
  };

  // Demo Reset helpers
  const handleResetDemoData = () => {
    if (window.confirm('Сбросить текущие изменения и восстановить демонстрационных учеников? Все ваши изменения будут стерты.')) {
      safeStorage.removeItem('tutor_students_db');
      const defaults = getInitialStudents();
      setStudents(defaults);
      setSelectedStudentId(null);
    }
  };

  // Dynamically extract unique subjects for filtering dropdown list
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    students.forEach(s => {
      if (s.subject) subjects.add(s.subject);
    });
    return Array.from(subjects);
  }, [students]);

  // Selected student model getter
  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Debtors count calculation
  const debtCount = useMemo(() => {
    return students.filter(s => s.isActive && (s.balanceLessons < 0 || s.lessons.some(l => (l.status === 'attended' || l.status === 'missed_unexcused') && !l.isPaid))).length;
  }, [students]);

  // Filter Pipeline (No Search Bar, purely your personal categorizers)
  const filteredStudents = useMemo(() => {
    return students
      .filter(student => {
        const matchesSubject = selectedSubject === 'all' || student.subject === selectedSubject;
        const matchesDebt = !filterDebtOnly || (student.balanceLessons < 0 || student.lessons.some(l => (l.status === 'attended' || l.status === 'missed_unexcused') && !l.isPaid));

        return matchesSubject && matchesDebt;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        } else if (sortBy === 'balance') {
          return a.balanceLessons - b.balanceLessons; // ascending: most debt first
        } else if (sortBy === 'progress') {
          // average trial score descending
          const avgA = a.mockExams.length > 0 
            ? a.mockExams.reduce((sum, curr) => sum + (curr.score / curr.maxScore), 0) / a.mockExams.length
            : 0;
          const avgB = b.mockExams.length > 0 
            ? b.mockExams.reduce((sum, curr) => sum + (curr.score / curr.maxScore), 0) / b.mockExams.length
            : 0;
          return avgB - avgA;
        }
        return 0;
      });
  }, [students, selectedSubject, filterDebtOnly, sortBy]);

  return (
    <div className="bg-[#0b0c11] min-h-screen text-[#E2E8F0] font-sans">
      
      {/* Universal Global Header Banner Navigation */}
      <nav className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-[#12131a] sticky top-0 z-40">
        <div className="flex items-center gap-4 md:gap-8 overflow-x-auto no-scrollbar">
          <span 
            onClick={() => {
              setSelectedStudentId(null);
              setFilterDebtOnly(false);
            }}
            className="text-xs md:text-sm font-serif tracking-widest text-[#F4B5CD] cursor-pointer hover:opacity-80 transition shrink-0"
          >
            Wake up
          </span>
          {selectedStudent && (
            <div className="hidden md:flex items-center gap-2 text-white/30 text-xs font-mono shrink-0">
              <span>/</span>
              <span className="text-white bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1">
                {selectedStudent.emoji} {selectedStudent.name}
              </span>
            </div>
          )}
          <div className="flex gap-4 md:gap-6 text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-medium items-center shrink-0">
            <button
              onClick={() => {
                setSelectedStudentId(null);
                setFilterDebtOnly(false);
              }}
              className={`cursor-pointer transition duration-200 pb-0.5 ${
                !selectedStudentId && !filterDebtOnly 
                  ? 'text-white border-b border-[#F4B5CD] opacity-100 font-bold' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setSelectedStudentId(null);
                setFilterDebtOnly(false);
                setTimeout(() => {
                  document.getElementById('students-catalog')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="cursor-pointer transition duration-200 pb-0.5 text-white/40 hover:text-white"
            >
              Students
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={() => setShowSyncModal(true)}
            className={`px-3 py-1.5 rounded-xl border text-[9px] uppercase tracking-wider font-semibold font-mono flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
              user 
                ? isConnectionBlocked
                  ? 'bg-orange-500/10 border-orange-500/25 text-orange-300 hover:bg-orange-500/20'
                  : syncStatus === 'saved'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20'
                    : syncStatus === 'syncing'
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20 animate-pulse'
                : 'bg-[#F4B5CD]/10 border-[#F4B5CD]/20 text-[#F4B5CD] hover:bg-[#F4B5CD]/20 hover:border-[#F4B5CD]/40'
            }`}
            title={user ? (isConnectionBlocked ? 'Облако заблокировано (нет прокси/VPN)' : `Облако синхронизировано (${user.email})`) : "Включить синхронизацию во всех браузерах"}
          >
            {user ? (
              isConnectionBlocked ? (
                <CloudOff className="w-3 h-3 text-orange-400 shrink-0" />
              ) : syncStatus === 'syncing' ? (
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
              ) : (
                <Cloud className="w-3 h-3 text-emerald-400 shrink-0" />
              )
            ) : (
              <CloudOff className="w-3 h-3 text-[#F4B5CD] shrink-0 animate-pulse" />
            )}
            <span className="hidden sm:inline">
              {user 
                ? isConnectionBlocked
                  ? 'Блокировка РФ?'
                  : syncStatus === 'saved' 
                    ? 'облако: ок' 
                    : syncStatus === 'syncing'
                      ? 'синхронизация'
                      : 'ошибка sync' 
                : 'Сохранить в облако'}
            </span>
          </button>

          <button
            onClick={handleResetDemoData}
            className="px-2.5 py-1.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition duration-200"
            title="Откатить данные до демо примера"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Сброс демо</span>
          </button>
        </div>
      </nav>

      {/* Detail Cabinet routing view */}
      {selectedStudent ? (
        <div className="animate-fadeIn">
          <StudentDetail 
            student={selectedStudent}
            onBack={() => setSelectedStudentId(null)}
            onUpdateStudent={handleUpdateStudent}
          />
          
          {/* Advanced Danger Option inside Cabinet detail */}
          <div className="max-w-5xl mx-auto px-4 md:px-6 pb-20 -mt-10">
            <div className="bg-red-955/10 border border-red-900/20 rounded-2xl p-5 mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-red-100">Красная зона кабинета</h4>
                <p className="text-xs text-red-400/70 mt-1">Выпускной или завершение курса? Вы можете безвозвратно архивировать/стереть базу ученика.</p>
              </div>
              <button
                onClick={() => handleDeleteStudent(selectedStudent.id)}
                className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-900/55 text-xs font-semibold shadow-xs transition duration-200"
              >
                Удалить кабинет ученика
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Home Workspace view */
        <div className="animate-fadeIn opacity-90 text-white/85">
          
          <div className="bg-white/[0.01] backdrop-blur-sm text-[#E2E8F0]/80 py-10 px-6 border-b border-white/5 relative">
            <div className="absolute inset-0 bg-radial-at-t from-[#F4B5CD]/5 via-transparent to-transparent opacity-60 pointer-events-none" />
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div className="space-y-2">
                <h1 className="text-xs md:text-xs font-sans uppercase text-lavender/30 tracking-[0.3em] hover:text-lavender/60 transition duration-300 select-none">Кто сдох, тот лох</h1>
              </div>

              {/* Action buttons list */}
              <div className="shrink-0 flex flex-wrap gap-2">
                <button
                  onClick={() => setShowProgramManager(true)}
                  className="py-2 px-4 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-[#F4B5CD]/30 text-[#F4B5CD]/80 text-[10px] uppercase font-extrabold tracking-[0.12em] transition duration-200 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md active:scale-95 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-[#F4B5CD]/70" />
                  Управление программами КТП
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="py-2 px-4 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-white/20 text-white/70 text-[10px] uppercase font-extrabold tracking-[0.12em] rounded-lg transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md active:scale-95 shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#F4B5CD]/50" />
                  Загрузить расписание
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="py-2 px-4 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-[#F4B5CD]/30 text-[#F4B5CD]/80 text-[10px] uppercase font-extrabold tracking-[0.12em] transition duration-200 rounded-lg flex items-center justify-center gap-1 cursor-pointer backdrop-blur-md active:scale-95 shadow-sm"
                >
                  Зарегистрировать ученика
                </button>
              </div>
            </div>
          </div>

          {/* Main workspace widgets */}
          <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
            
            {/* Global dashboard stats counters and schedule planner widget */}
            <DashboardStats 
              students={students} 
              onSelectStudent={(id) => setSelectedStudentId(id)}
              onUpdateStudents={handleUpdateStudents}
            />

            {/* Quick Post-Lesson Note Board (BEZ AI) */}
            <div className="bg-[#12131a] border border-white/5 p-6 rounded-2xl relative overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-radial-at-t from-[#F4B5CD]/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4 mb-4 relative z-10">
                <div>
                  <h3 className="font-serif text-white text-base flex items-center gap-2">
                    <span className="text-[#F4B5CD]">⚡</span>
                    Быстрая заметка после урока
                  </h3>
                </div>
                {quickSuccess && (
                  <div className="bg-lavender/10 text-lavender border border-lavender/25 px-3.5 py-1.5 rounded-xl text-xs font-medium animate-pulse flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-lavender rounded-full inline-block" />
                    {quickSuccess}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                {/* Left: Interactive student list */}
                <div className="lg:col-span-4 space-y-2">
                  <span className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">
                    Кого выбрать?
                  </span>
                  <div className="flex lg:flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar scroll-smooth overflow-x-auto pb-1">
                    {students.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setQuickStudentId(s.id)}
                        className={`text-left px-3 py-2 border rounded-xl flex items-center gap-2.5 transition shrink-0 ${
                          quickStudentId === s.id
                            ? 'bg-[#F4B5CD]/10 border-[#F4B5CD] text-white font-semibold'
                            : 'bg-[#181920]/40 border-white/5 text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="text-xl shrink-0">{s.emoji}</span>
                        <div className="truncate">
                          <p className="text-xs font-medium truncate">{s.name}</p>
                          <p className="text-[9px] uppercase tracking-wider text-white/30 truncate">{s.subject}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Text box */}
                <div className="lg:col-span-8 flex flex-col justify-between gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1.5">
                      Текст заметки / Поручения / Просьбы
                    </label>
                    <textarea
                      placeholder="e.g. повторить формулы приведения и знаки тригонометрических функций к четвергу"
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      disabled={!quickStudentId}
                      className="w-full text-xs p-3.5 border border-white/5 bg-[#0d0f14]/80 text-white rounded-xl focus:outline-none focus:border-[#F4B5CD]/50 h-24 leading-relaxed resize-none placeholder-white/20 disabled:opacity-40 transition-all duration-300"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white/30 font-light">
                      {!quickStudentId 
                        ? 'Выберите ученика слева, чтобы отправить заметку' 
                        : 'Заметка добавится первой строкой в раздел "Планы и особенности"'
                      }
                    </span>
                    <button
                      type="button"
                      onClick={handleSendQuickNote}
                      disabled={!quickStudentId || !quickNote.trim()}
                      className="whitespace-nowrap px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 disabled:border-white/5 text-[#F4B5CD]/80 disabled:text-white/20 text-xs font-extrabold uppercase tracking-widest rounded-xl disabled:cursor-not-allowed transition duration-200 backdrop-blur-md active:scale-[0.98]"
                    >
                      Отправить заметку ⚡
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter controls toolbar panel */}
            <div id="students-catalog" className="bg-[#12131a] p-4 border border-white/5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
              
              <div className="text-xs font-sans text-white/50 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#F4B5CD] rounded-full animate-pulse" />
                <span>Личный фильтр преподавателя</span>
              </div>

              {/* Categorization controls & buttons */}
              <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-start md:justify-end">
                {/* Debt policy filter toggle */}
                <button
                  type="button"
                  onClick={() => setFilterDebtOnly(!filterDebtOnly)}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    filterDebtOnly 
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 font-bold shadow-[0_0_12px_rgba(239,68,68,0.1)]' 
                      : 'bg-[#0d0f14] border-white/10 text-white/50 hover:bg-white/[0.04] hover:text-white/80'
                  }`}
                >
                  ⚠️ Только долги ({debtCount})
                </button>

                {/* Subject filter spinner */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#E2E8F0]/60 hidden sm:inline uppercase text-[9px] tracking-wider font-semibold">Предмет:</span>
                  <select 
                     value={selectedSubject}
                     onChange={(e) => setSelectedSubject(e.target.value)}
                     className="px-3 py-1.5 border border-white/10 rounded-xl bg-[#0d0f14] font-medium text-white/80 focus:border-[#F4B5CD] focus:outline-none text-xs text-[#E2E8F0]"
                  >
                    <option value="all">Все предметы</option>
                    {uniqueSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#E2E8F0]/40 hidden sm:inline uppercase text-[9px] tracking-wider font-semibold">Сортировать:</span>
                  <select 
                     value={sortBy}
                     onChange={(e) => setSortBy(e.target.value as any)}
                     className="px-3 py-1.5 border border-white/10 rounded-xl bg-[#0d0f14] font-medium text-[#E2E8F0]/80 focus:border-[#F4B5CD] focus:outline-none text-xs text-[#E2E8F0]"
                  >
                    <option value="name">По имени</option>
                    <option value="progress">По прогрессу</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Students Grid List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <h2 className="font-serif text-xl text-white flex items-center gap-2">
                  <Grid className="w-5 h-5 text-[#F4B5CD]" />
                  Список учеников
                  <span className="text-xs bg-white/5 text-[#E2E8F0]/45 border border-white/10 px-2 py-0.5 rounded-full font-mono">
                    {filteredStudents.length}
                  </span>
                </h2>
                {filteredStudents.length !== students.length && (
                  <button 
                    onClick={() => {
                      setSelectedSubject('all');
                      setFilterDebtOnly(false);
                    }}
                    className="text-xs text-[#F4B5CD] hover:underline hover:text-indigo-200 font-semibold uppercase tracking-wider"
                  >
                    Сбросить фильтры
                  </button>
                )}
              </div>

              {filteredStudents.length === 0 ? (
                <div className="bg-gradient-to-br from-[#F4B5CD]/[0.05] via-white/[0.01] to-white/[0.01] backdrop-blur-xl border border-white/10 p-12 text-center max-w-xl mx-auto space-y-4 rounded-2xl shadow-xl">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30 border border-white/10">
                    <BookOpen className="w-6 h-6 text-[#F4B5CD]" />
                  </div>
                  <h3 className="font-serif text-lg text-white">Кабинеты не найдены</h3>
                  <p className="text-xs text-white/50 leading-relaxed font-light">
                    Нет активных кабинетов учащихся, соответствующих заданным критериям поиска. Вы можете зарегистрировать новый профиль ученика в системе за одну минуту.
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/20 text-[#F4B5CD] text-xs font-bold uppercase tracking-widest transition-colors rounded-xl"
                  >
                    Добавить ученика
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStudents.map(student => (
                    <StudentCard 
                      key={student.id}
                      student={student}
                      onSelect={() => setSelectedStudentId(student.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* Add Student overlay Modal */}
      {showAddModal && (
        <AddStudentModal 
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddStudent}
        />
      )}

      {/* Import Schedule overlay Modal */}
      {showImportModal && (
        <ImportScheduleModal
          onClose={() => setShowImportModal(false)}
          students={students}
          onImport={handleUpdateStudents}
        />
      )}

      {/* Program Manager overlay Modal */}
      {showProgramManager && (
        <ProgramManagerModal
          programs={syllabusPrograms}
          onSavePrograms={handleSaveSyllabusPrograms}
          onClose={() => setShowProgramManager(false)}
        />
      )}

      {/* Firebase Sync overlay Modal */}
      {showSyncModal && (
        <FirebaseSyncModal
          user={user}
          syncStatus={syncStatus}
          authError={authError}
          setAuthError={setAuthError}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
          onClose={() => setShowSyncModal(false)}
          isConnectionBlocked={isConnectionBlocked}
        />
      )}
    </div>
  );
}
