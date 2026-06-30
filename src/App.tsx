import React, { useState, useEffect, useMemo } from 'react';
import { Student, SyllabusProgram, CalendarReminder, StudentCabinet } from './types';
import { getInitialStudents, saveStudents, INITIAL_STUDENTS, getInitialPrograms, savePrograms } from './data';
import { syncAllStudents } from './utils/paymentSync';
import { safeStorage } from './utils/safeStorage';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
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
  Calendar, FileText, Cloud, CloudOff, Award, ClipboardList,
  ChevronLeft, ChevronRight, X, Trash2, ArrowUp, Sparkles, Moon
} from 'lucide-react';
import { GradingCriteriaModal } from './components/GradingCriteriaModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StudentCabinetView } from './components/StudentCabinetView';
import { TestsManager } from './components/TestsManager';

export default function App() {
  // Direct student cabinet rendering from URL params (completely decouples student from Firebase)
  const queryParams = new URLSearchParams(window.location.search);
  const rawCabinetId = queryParams.get('cabinet');
  const cabinetId = rawCabinetId ? rawCabinetId.trim() : null;
  const cabinetData = queryParams.get('cabinet_data');

  if (cabinetId || cabinetData) {
    return (
      <ErrorBoundary fallbackTitle="Ошибка отображения кабинета ученика">
        <StudentCabinetView cabinetId={cabinetId} cabinetData={cabinetData} />
      </ErrorBoundary>
    );
  }

  const [students, setStudents] = useState<Student[]>(() => syncAllStudents(getInitialStudents()));
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tests'>('dashboard');

  // Dynamic Theme (gothic or cosmic)
  const [theme, setTheme] = useState<'gothic' | 'cosmic'>(() => {
    return (localStorage.getItem('tutor_theme') as 'gothic' | 'cosmic') || 'cosmic';
  });

  useEffect(() => {
    const bodyClass = document.body.classList;
    bodyClass.remove('theme-gothic', 'theme-cosmic');
    if (theme === 'gothic') {
      bodyClass.add('theme-gothic');
    } else {
      bodyClass.add('theme-cosmic');
    }
    localStorage.setItem('tutor_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Quick Notes state
  const [quickNotes, setQuickNotes] = useState<string>(() => localStorage.getItem('quick_notes') || '');
  
  // Interactive Calendar Reminders
  const [reminders, setReminders] = useState<CalendarReminder[]>(() => {
    try {
      const stored = localStorage.getItem('calendar_reminders');
      if (stored) {
        const parsed = JSON.parse(stored) as CalendarReminder[];
        const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
        // Auto-delete expired reminders (passed target date)
        const filtered = parsed.filter(item => item.date >= todayStr);
        if (filtered.length !== parsed.length) {
          localStorage.setItem('calendar_reminders', JSON.stringify(filtered));
        }
        return filtered;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const activeReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;

    return reminders.filter(r => {
      const remDate = new Date(r.date);
      remDate.setHours(0,0,0,0);
      const remTime = remDate.getTime();
      
      const startTime = remTime - twoDaysInMs;
      // Active for 2 days before and including target date
      return todayTime >= startTime && todayTime <= remTime;
    });
  }, [reminders]);

  const handleUpdateReminders = (updated: CalendarReminder[]) => {
    setReminders(updated);
    localStorage.setItem('calendar_reminders', JSON.stringify(updated));
  };

  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    handleUpdateReminders(updated);
  };

  // Interactive Year Calendar with Reminders
  const [showYearCalendar, setShowYearCalendar] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [calendarReminderText, setCalendarReminderText] = useState('');
  
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
  const [showGradingModal, setShowGradingModal] = useState(false);

  const [syllabusPrograms, setSyllabusPrograms] = useState<SyllabusProgram[]>(() => getInitialPrograms());
  const [showProgramManager, setShowProgramManager] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isReminderDismissed, setIsReminderDismissed] = useState(false);

  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [showPaymentReminder, setShowPaymentReminder] = useState(false);

  useEffect(() => {
    const checkReminder = () => {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const mskPlus2Date = new Date(utcTime + (5 * 3600000));
      const hours = mskPlus2Date.getHours();
      
      const yyyy = mskPlus2Date.getFullYear();
      const mm = String(mskPlus2Date.getMonth() + 1).padStart(2, '0');
      const dd = String(mskPlus2Date.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      const isClosedToday = localStorage.getItem(`tutor_payment_reminder_closed_${dateKey}`) === 'true';
      const isWithinActiveHours = hours >= 21 || hours < 1;

      if (isWithinActiveHours && !isClosedToday) {
        setShowPaymentReminder(true);
      } else {
        setShowPaymentReminder(false);
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCloseReminder = () => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mskPlus2Date = new Date(utcTime + (5 * 3600000));
    const yyyy = mskPlus2Date.getFullYear();
    const mm = String(mskPlus2Date.getMonth() + 1).padStart(2, '0');
    const dd = String(mskPlus2Date.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;

    localStorage.setItem(`tutor_payment_reminder_closed_${dateKey}`, 'true');
    setShowPaymentReminder(false);
  };

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
    reconnectSync,
  } = useFirebaseSync(students, setStudents, syllabusPrograms, setSyllabusPrograms);

  // Cabinets state (lifted up for global dashboard sync, cards & parent reports)
  const [cabinets, setCabinets] = useState<Record<string, StudentCabinet>>(() => {
    const stored = safeStorage.getItem('tutor_local_cabinets');
    try {
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Real-time listener for Tutor's Cabinets in Firestore (handles both logged-in and guest tutors)
  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    if (user) {
      const q = query(collection(db, 'cabinets'), where('tutorId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const dbCabs: Record<string, StudentCabinet> = {};
        snapshot.forEach((doc) => {
          dbCabs[doc.id] = doc.data() as StudentCabinet;
        });

        setCabinets(prev => {
          const merged = { ...prev, ...dbCabs };
          safeStorage.setItem('tutor_local_cabinets', JSON.stringify(merged));
          return merged;
        });
      }, (error) => {
        console.error('Error listening to cabinets in Firestore:', error);
      });
      unsubscribes.push(unsubscribe);
    } else {
      // Guest tutor: subscribe to cabinets of their local students for seamless instant sync
      const cabIds = students.map(s => s.cabinetId).filter(Boolean) as string[];
      cabIds.forEach(cabId => {
        const docRef = doc(db, 'cabinets', cabId);
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as StudentCabinet;
            setCabinets(prev => {
              const updated = { ...prev, [cabId]: data };
              safeStorage.setItem('tutor_local_cabinets', JSON.stringify(updated));
              return updated;
            });
          }
        });
        unsubscribes.push(unsubscribe);
      });
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, students.map(s => s.cabinetId).join(',')]);

  // Helper to save cabinets locally and sync to Cloud
  const handleUpdateCabinets = async (updatedCabs: Record<string, StudentCabinet>) => {
    setCabinets(updatedCabs);
    safeStorage.setItem('tutor_local_cabinets', JSON.stringify(updatedCabs));

    try {
      for (const [cabId, cab] of Object.entries(updatedCabs)) {
        const docRef = doc(db, 'cabinets', cabId);
        await setDoc(docRef, cab, { merge: true });
      }
    } catch (err) {
      console.error('Failed to sync updated cabinet to cloud:', err);
    }
  };

  const updateTimestamp = () => {
    const timestamp = new Date().toISOString();
    safeStorage.setItem('tutor_db_last_updated', timestamp);
    if (user) {
      safeStorage.setItem(`tutor_db_last_updated_${user.uid}`, timestamp);
    }
  };

  const handleSaveSyllabusPrograms = (updated: SyllabusProgram[]) => {
    setSyllabusPrograms(updated);
    savePrograms(updated);
    updateTimestamp();
  };

  // Save students on change
  const handleUpdateStudents = (updatedStudents: Student[]) => {
    const synced = syncAllStudents(updatedStudents);
    setStudents(synced);
    saveStudents(synced);
    updateTimestamp();
  };

  const handleRestoreBackup = (restoredStudents: Student[], restoredPrograms: SyllabusProgram[]) => {
    handleUpdateStudents(restoredStudents);
    if (restoredPrograms && restoredPrograms.length > 0) {
      handleSaveSyllabusPrograms(restoredPrograms);
    }
    updateTimestamp();
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
    setCustomConfirm({
      title: 'Удаление кабинета ученика',
      message: 'Вы уверены, что хотите безвозвратно удалить личный кабинет этого ученика? Все данные о пробниках, уроках и оплатах будут стерты.',
      onConfirm: () => {
        const updated = students.filter(s => s.id !== studentId);
        handleUpdateStudents(updated);
        setSelectedStudentId(null);
        setCustomConfirm(null);
      }
    });
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
    setCustomConfirm({
      title: 'Сброс демо-данных',
      message: 'Сбросить текущие изменения и восстановить демонстрационных учеников? Все ваши изменения будут стерты.',
      onConfirm: () => {
        safeStorage.removeItem('tutor_students_db');
        const defaults = getInitialStudents();
        setStudents(defaults);
        setSelectedStudentId(null);
        setCustomConfirm(null);
      }
    });
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

  // Sunday 18:00 to Monday 10:00 reminder window
  const showSundayReminder = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 1 is Monday
    const hours = now.getHours();
    if (day === 0) {
      return hours >= 18;
    }
    if (day === 1) {
      return hours < 10;
    }
    return false;
  }, []);

  return (
    <div className="bg-[var(--bg-color)] min-h-screen text-[var(--text-primary)] font-sans transition-colors duration-300">
      
      {/* Top micro motivational banner */}
      <div className="bg-gradient-to-r from-[#12131a] via-[#1c1421] to-[#12131a] border-b border-white/[0.03] text-center py-1.5 px-4 text-[10px] tracking-[0.25em] text-[#F4B5CD]/30 uppercase select-none font-medium flex items-center justify-center gap-2">
        <span>✦</span>
        <span>Кто сдох, тот лох</span>
        <span>✦</span>
      </div>

      {/* Universal Global Header Banner Navigation */}
      <nav className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-[#12131a] sticky top-0 z-40 relative overflow-hidden">
        {/* Beautiful vector pink snake */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-35">
          <svg className="h-14 w-[850px] text-[#F4B5CD] filter drop-shadow-[0_0_15px_rgba(244,181,205,0.45)] translate-x-0" viewBox="0 0 900 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F4B5CD" />
                <stop offset="30%" stopColor="#D8B4FE" />
                <stop offset="65%" stopColor="#C3B4FC" />
                <stop offset="100%" stopColor="#F5D0FE" />
              </linearGradient>
              <pattern id="scales" width="12" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
                <path d="M 0 3 L 6 0 L 12 3 L 6 6 Z" fill="none" stroke="#F4B5CD" strokeWidth="0.5" strokeOpacity="0.45" />
              </pattern>
            </defs>
            
            <g>
              {/* Layer 1: Outer glowing neon silhouette/edges (wide pink stroke) */}
              <path 
                d="M 70,42 C 100,42 120,20 140,20 C 160,20 170,35 170,45 C 170,55 155,65 145,55 C 135,45 145,25 175,25 C 210,25 230,58 250,58 C 270,58 280,40 280,30 C 280,20 265,10 255,20 C 245,30 255,50 285,50 C 320,50 340,18 360,18 C 380,18 390,32 390,42 C 390,52 375,62 365,52 C 355,42 365,22 395,22 C 430,22 450,58 470,58 C 490,58 500,40 500,30 C 500,20 485,10 475,20 C 465,30 475,50 505,50 C 540,50 560,18 580,18 C 600,18 610,32 610,42 C 610,52 595,62 585,52 C 575,42 585,22 615,22 C 650,22 670,58 690,58 C 710,58 720,40 720,30 C 720,20 705,10 695,20 C 685,30 695,50 725,50 C 760,50 780,40 810,40"
                stroke="url(#snakeGrad)"
                strokeWidth="13"
                strokeLinecap="butt"
                strokeLinejoin="round"
                fill="none"
                opacity="0.85"
              />

              {/* Layer 2: Mask core with background color to form a clean double-contour outline */}
              <path 
                d="M 70,42 C 100,42 120,20 140,20 C 160,20 170,35 170,45 C 170,55 155,65 145,55 C 135,45 145,25 175,25 C 210,25 230,58 250,58 C 270,58 280,40 280,30 C 280,20 265,10 255,20 C 245,30 255,50 285,50 C 320,50 340,18 360,18 C 380,18 390,32 390,42 C 390,52 375,62 365,52 C 355,42 365,22 395,22 C 430,22 450,58 470,58 C 490,58 500,40 500,30 C 500,20 485,10 475,20 C 465,30 475,50 505,50 C 540,50 560,18 580,18 C 600,18 610,32 610,42 C 610,52 595,62 585,52 C 575,42 585,22 615,22 C 650,22 670,58 690,58 C 710,58 720,40 720,30 C 720,20 705,10 695,20 C 685,30 695,50 725,50 C 760,50 780,40 810,40"
                stroke="var(--bg-card)"
                strokeWidth="11"
                strokeLinecap="butt"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Layer 3: Diamond scale patterns inside the body core */}
              <path 
                d="M 70,42 C 100,42 120,20 140,20 C 160,20 170,35 170,45 C 170,55 155,65 145,55 C 135,45 145,25 175,25 C 210,25 230,58 250,58 C 270,58 280,40 280,30 C 280,20 265,10 255,20 C 245,30 255,50 285,50 C 320,50 340,18 360,18 C 380,18 390,32 390,42 C 390,52 375,62 365,52 C 355,42 365,22 395,22 C 430,22 450,58 470,58 C 490,58 500,40 500,30 C 500,20 485,10 475,20 C 465,30 475,50 505,50 C 540,50 560,18 580,18 C 600,18 610,32 610,42 C 610,52 595,62 585,52 C 575,42 585,22 615,22 C 650,22 670,58 690,58 C 710,58 720,40 720,30 C 720,20 705,10 695,20 C 685,30 695,50 725,50 C 760,50 780,40 810,40"
                stroke="url(#scales)"
                strokeWidth="11"
                strokeLinecap="butt"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Layer 4: Segmented parallel underbelly lines (transverse lines) */}
              <path 
                d="M 70,42 C 100,42 120,20 140,20 C 160,20 170,35 170,45 C 170,55 155,65 145,55 C 135,45 145,25 175,25 C 210,25 230,58 250,58 C 270,58 280,40 280,30 C 280,20 265,10 255,20 C 245,30 255,50 285,50 C 320,50 340,18 360,18 C 380,18 390,32 390,42 C 390,52 375,62 365,52 C 355,42 365,22 395,22 C 430,22 450,58 470,58 C 490,58 500,40 500,30 C 500,20 485,10 475,20 C 465,30 475,50 505,50 C 540,50 560,18 580,18 C 600,18 610,32 610,42 C 610,52 595,62 585,52 C 575,42 585,22 615,22 C 650,22 670,58 690,58 C 710,58 720,40 720,30 C 720,20 705,10 695,20 C 685,30 695,50 725,50 C 760,50 780,40 810,40"
                stroke="url(#snakeGrad)"
                strokeWidth="11"
                strokeDasharray="1.2, 5.5"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                fill="none"
                opacity="0.35"
              />

              {/* Tapering tail at the start of the body */}
              <g transform="translate(70, 42) rotate(180)">
                <path 
                  d="M 0,-6.5 C 15,-4 30,-1.5 45,0 C 30,1.5 15,4 0,6.5" 
                  fill="none" 
                  stroke="#F4B5CD" 
                  strokeWidth="0.8" 
                />
                <path 
                  d="M 10,-5.5 L 10,5.5 M 20,-4 L 20,4 M 30,-2.5 L 30,2.5 M 40,-1 L 40,1" 
                  stroke="#F4B5CD" 
                  strokeWidth="0.5" 
                  strokeOpacity="0.3"
                />
              </g>

              {/* Snake head group, positioned at the end of the body */}
              <g transform="translate(810, 40) rotate(-6)">
                {/* Elegant realistic snake head profile outline (viper style) */}
                <path 
                  d="M -8,-5.5 
                     C -3,-9 5,-10.5 13,-9 
                     C 20,-8 28,-6 32,-3.5 
                     C 35,-1.5 36,0.5 33,1.8 
                     C 29,3.2 21,4.2 14,4.5 
                     C 6,4.8 -2,4.8 -8,5.5 Z"
                  fill="var(--bg-card)" 
                  stroke="url(#snakeGrad)" 
                  strokeWidth="1.4" 
                  strokeLinejoin="round"
                />
                {/* Head scale shading texture matching the body */}
                <path 
                  d="M -8,-5.5 
                     C -3,-9 5,-10.5 13,-9 
                     C 20,-8 28,-6 32,-3.5 
                     C 35,-1.5 36,0.5 33,1.8 
                     C 29,3.2 21,4.2 14,4.5 
                     C 6,4.8 -2,4.8 -8,5.5 Z"
                  fill="url(#scales)"
                  opacity="0.85"
                />
                {/* Underbelly detail curves in head */}
                <path d="M 12,4.2 C 5,4.5 -1,4.8 -8,5.5" stroke="url(#snakeGrad)" strokeWidth="0.8" strokeOpacity="0.4" fill="none" />
                {/* Scale shading lines inside head for realistic texture */}
                <path d="M 6,-9 C 11,-8 16,-6 20,-3.5 M 10,-9.2 C 15,-8.2 19,-6.2 23,-3.8" stroke="#F4B5CD" strokeWidth="0.6" strokeOpacity="0.3" fill="none" />
                {/* Sleek, eye-less minimalist viper head */}
                {/* Elegant closed mouth line */}
                <path d="M 18,1.2 Q 26,1.2 31,0" stroke="url(#snakeGrad)" strokeWidth="0.9" strokeOpacity="0.8" fill="none" />
                {/* Long, delicate, wavy forked tongue sliding out of snout */}
                <path d="M 32,1 C 40,0.5 45,-1.5 50,0 C 53,1 56,0 60,-1.5" stroke="#FF1E56" strokeWidth="1" strokeLinecap="round" fill="none" />
                <path d="M 50,0 C 52,1.2 55,2.5 59,3.5" stroke="#FF1E56" strokeWidth="1" strokeLinecap="round" fill="none" />
              </g>
            </g>

            {/* Sparkle star accents in the air */}
            <path d="M 120 10 L 122 12 L 120 14 L 118 12 Z" fill="#F4B5CD" opacity="0.6" />
            <path d="M 240 50 L 242 52 L 240 54 L 238 52 Z" fill="#C3B4FC" opacity="0.6" />
            <path d="M 330 15 L 331.5 17 L 330 19 L 328.5 17 Z" fill="#F4B5CD" opacity="0.5" />
          </svg>
        </div>

        <div className="flex items-center gap-4 md:gap-8 overflow-x-auto no-scrollbar z-10">
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
              <span className="text-white bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl flex items-center gap-1.5 overflow-hidden">
                {selectedStudent.emoji && (selectedStudent.emoji.startsWith('data:') || selectedStudent.emoji.startsWith('http')) ? (
                  <img src={selectedStudent.emoji} alt="" className="w-4 h-4 rounded-full object-cover shrink-0 select-none" />
                ) : (
                  <span>{selectedStudent.emoji}</span>
                )}
                <span>{selectedStudent.name}</span>
              </span>
            </div>
          )}
          <div className="flex gap-4 md:gap-6 text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-medium items-center shrink-0">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setSelectedStudentId(null);
                setFilterDebtOnly(false);
              }}
              className={`cursor-pointer transition duration-200 pb-0.5 ${
                activeTab === 'dashboard' && !selectedStudentId && !filterDebtOnly
                  ? 'text-white border-b border-[#F4B5CD] opacity-100 font-bold' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Рабочий стол
            </button>
            <button
              onClick={() => {
                setActiveTab('tests');
                setSelectedStudentId(null);
                setFilterDebtOnly(false);
              }}
              className={`cursor-pointer transition duration-200 pb-0.5 ${
                activeTab === 'tests' && !selectedStudentId
                  ? 'text-white border-b border-[#F4B5CD] opacity-100 font-bold' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Кабинеты & Тесты
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={() => setTheme(theme === 'gothic' ? 'cosmic' : 'gothic')}
            className="p-2 rounded-xl text-white/40 hover:text-[#F4B5CD] hover:bg-white/5 transition-all duration-300 cursor-pointer text-sm flex items-center justify-center gap-1.5 border border-transparent hover:border-white/10"
            title={theme === 'gothic' ? 'Активировать космическую тему' : 'Активировать черно-красную готическую тему'}
          >
            {theme === 'gothic' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#F4B5CD]" />
                <span className="text-[9px] uppercase font-bold tracking-wider">Космос</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="text-[9px] uppercase font-bold tracking-wider">Готика</span>
              </>
            )}
          </button>

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
                : 'sync'}
            </span>
          </button>
        </div>
      </nav>

      {/* Detail Cabinet routing view */}
      {selectedStudent ? (
        <div className="animate-fadeIn">
          <StudentDetail 
            student={selectedStudent}
            cabinet={selectedStudent.cabinetId ? cabinets[selectedStudent.cabinetId] : null}
            onBack={() => setSelectedStudentId(null)}
            onUpdateStudent={handleUpdateStudent}
          />
          
          {/* Advanced Danger Option inside Cabinet detail */}
          <div className="max-w-5xl mx-auto px-4 md:px-6 pb-20 -mt-10">
            <div className="bg-red-955/10 border border-red-900/20 rounded-2xl p-5 mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-red-100">Красная зона</h4>
                <p className="text-xs text-red-400/70 mt-1">Выпускной или завершение курса? Вы можете безвозвратно удалить профиль ученика и все связанные с ним данные.</p>
              </div>
              <button
                onClick={() => handleDeleteStudent(selectedStudent.id)}
                className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-900/55 text-xs font-semibold shadow-xs transition duration-200"
              >
                Удалить профиль ученика
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'tests' ? (
        <TestsManager 
          students={students} 
          onUpdateStudents={handleUpdateStudents} 
          user={user} 
          cabinets={cabinets}
          onUpdateCabinets={handleUpdateCabinets}
        />
      ) : (
        /* Home Workspace view */
        <div className="animate-fadeIn opacity-90 text-white/85">
          
          <div className="bg-white/[0.01] backdrop-blur-sm text-[#E2E8F0]/80 py-8 px-6 border-b border-white/5 relative">
            <div className="absolute inset-0 bg-radial-at-t from-[#F4B5CD]/5 via-transparent to-transparent opacity-60 pointer-events-none" />
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-stretch">
              
              {/* Left Column: Quick Notes / Todo Desk & Active Pink Reminders */}
              <div className="lg:col-span-8 flex flex-col sm:flex-row items-stretch gap-6">
                
                {/* Note desk */}
                <div className="flex flex-col space-y-2 shrink-0">
                  <div className="flex items-center gap-2 text-[10px] md:text-xs font-sans uppercase text-[#F4B5CD] tracking-widest font-extrabold animate-pulse">
                    <ClipboardList className="w-3.5 h-3.5 text-[#F4B5CD]" />
                    <span>НИКУСЬКА НЕ ЗАБУДЬ!!!!</span>
                  </div>
                  <div className="relative group">
                    <textarea
                      value={quickNotes}
                      spellCheck="false"
                      autoCorrect="off"
                      autoCapitalize="none"
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val && !val.startsWith('•')) {
                          val = '• ' + val;
                        }
                        setQuickNotes(val);
                        localStorage.setItem('quick_notes', val);
                      }}
                      onBlur={() => {
                        const cleaned = quickNotes
                          .split('\n')
                          .map(line => line.trim())
                          .filter(line => line !== '•' && line !== '• ' && line !== '')
                          .map(line => line.startsWith('•') ? line : `• ${line}`)
                          .join('\n');
                        setQuickNotes(cleaned);
                        localStorage.setItem('quick_notes', cleaned);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const textarea = e.currentTarget;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const val = textarea.value;

                          const before = val.substring(0, start);
                          const after = val.substring(end);

                          const linesBefore = before.split('\n');
                          const currentLine = linesBefore[linesBefore.length - 1];

                          if (currentLine.trim() === '•') {
                            const newBefore = linesBefore.slice(0, -1).join('\n') + '\n';
                            const newVal = newBefore + after;
                            setQuickNotes(newVal);
                            localStorage.setItem('quick_notes', newVal);
                            setTimeout(() => {
                              textarea.selectionStart = textarea.selectionEnd = newBefore.length;
                            }, 0);
                            return;
                          }

                          const insertText = '\n• ';
                          const newVal = before + insertText + after;
                          setQuickNotes(newVal);
                          localStorage.setItem('quick_notes', newVal);

                          setTimeout(() => {
                            textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
                          }, 0);
                        }
                      }}
                      placeholder="Впишите сюда важные дела, напоминания..."
                      className="w-48 h-48 bg-[#12131a]/40 hover:bg-[#12131a]/60 focus:bg-[#12131a]/80 border border-white/10 hover:border-white/15 focus:border-[#F4B5CD]/40 text-white/60 placeholder-white/20 text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#F4B5CD]/20 transition duration-200 resize-none font-sans leading-relaxed text-left"
                    />
                  </div>
                </div>

                {/* Active Pink Reminders List */}
                <div className="flex-1 flex flex-col space-y-2 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-sans uppercase text-[#F4B5CD]/60 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F4B5CD] animate-pulse" />
                    <span>ПЛАНЫ ПЛАНЫ ПЛАНЫ</span>
                  </div>
                  
                  <div className="bg-gradient-to-br from-[#12131a]/50 via-[#12131a]/60 to-[#F4B5CD]/[0.05] border border-white/5 rounded-2xl p-4 flex-1 flex flex-col justify-center min-h-[192px] shadow-lg">
                    {activeReminders.length === 0 ? (
                      <div className="text-center text-[11px] text-white/20 italic">
                        Ближайших дел и пробников нет. Нажмите 📅 в Сетке расписания, чтобы спланировать!
                      </div>
                    ) : (
                      <div className="space-y-2 overflow-y-auto no-scrollbar max-h-[160px] pr-1">
                        {activeReminders.map(rem => {
                          const dateObj = new Date(rem.date);
                          const formatted = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                          return (
                            <div key={rem.id} className="bg-gradient-to-r from-[#F4B5CD]/15 to-[#C3B4FC]/10 border border-[#F4B5CD]/25 hover:border-[#F4B5CD]/50 p-2.5 rounded-xl flex items-start justify-between gap-3 text-left animate-fadeIn hover:shadow-md transition duration-300">
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono font-bold text-[#F4B5CD] uppercase tracking-wider block">
                                  {formatted}
                                </span>
                                <p className="text-xs text-[#F4B5CD] font-medium leading-relaxed">{rem.text}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteReminder(rem.id)}
                                className="text-[#F4B5CD]/40 hover:text-[#F4B5CD] p-0.5 text-sm leading-none transition cursor-pointer"
                                title="Удалить напоминание"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Fast actions */}
              <div className="lg:col-span-4 flex flex-col justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] md:text-xs font-sans uppercase text-white/50 tracking-wider">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#C3B4FC]" />
                  <span>Быстрые действия</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 flex-1 items-stretch bg-gradient-to-br from-[#12131a]/80 to-[#F4B5CD]/[0.05] p-3.5 rounded-2xl border border-white/5 shadow-xl">
                  <button
                    onClick={() => setShowGradingModal(true)}
                    className="py-1.5 px-3 bg-[#C3B4FC]/5 hover:bg-[#C3B4FC]/15 border border-[#C3B4FC]/15 hover:border-[#C3B4FC]/30 text-[#C3B4FC] text-[10px] uppercase font-bold tracking-wider transition duration-200 rounded-lg flex items-center gap-2 cursor-pointer backdrop-blur-md active:scale-[0.98] shadow-sm justify-center"
                  >
                    <Award className="w-3.5 h-3.5 text-[#C3B4FC]/80 shrink-0" />
                    <span>Баллы</span>
                  </button>
                  <button
                    onClick={() => setShowProgramManager(true)}
                    className="py-1.5 px-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-[#F4B5CD]/20 text-[#F4B5CD]/80 text-[10px] uppercase font-bold tracking-wider transition duration-200 rounded-lg flex items-center gap-2 cursor-pointer backdrop-blur-md active:scale-[0.98] shadow-sm justify-center"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#F4B5CD]/70 shrink-0" />
                    <span>КТП</span>
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="py-1.5 px-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-white/70 text-[10px] uppercase font-bold tracking-wider rounded-lg transition duration-200 flex items-center gap-2 cursor-pointer backdrop-blur-md active:scale-[0.98] shadow-sm justify-center"
                  >
                    <Calendar className="w-3.5 h-3.5 text-white/50 shrink-0" />
                    <span>Расписание</span>
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="py-1.5 px-3 bg-[#F4B5CD]/5 hover:bg-[#F4B5CD]/15 border border-[#F4B5CD]/10 hover:border-[#F4B5CD]/30 text-[#F4B5CD] text-[10px] uppercase font-bold tracking-wider transition duration-200 rounded-lg flex items-center gap-2 cursor-pointer backdrop-blur-md active:scale-[0.98] shadow-sm justify-center"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#F4B5CD]/70 shrink-0" />
                    <span>Новый ученик</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Main workspace widgets */}
          <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
            
            {showSundayReminder && !isReminderDismissed && (
              <div className="relative overflow-hidden bg-gradient-to-r from-[#C3B4FC]/8 via-transparent to-[#F4B5CD]/8 border border-[#C3B4FC]/25 rounded-2xl p-5 md:p-6 shadow-xl animate-fadeIn backdrop-blur-md">
                <div className="absolute top-1 right-1 p-3 flex items-center gap-3">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F4B5CD] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F4B5CD]"></span>
                  </span>
                  <button 
                    onClick={() => setIsReminderDismissed(true)}
                    className="text-white/40 hover:text-white transition text-xs p-1 cursor-pointer"
                    title="Скрыть напоминание"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start gap-4 pr-10">
                  <div className="w-10 h-10 rounded-xl bg-[#C3B4FC]/15 border border-[#C3B4FC]/20 flex items-center justify-center text-lg shrink-0">
                    📜
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-white tracking-wide">
                      ✨ Напоминание: Время отправить отчеты родителям
                    </h3>
                    <p className="text-xs text-[#ccd3de]/70 leading-relaxed max-w-3xl">
                      Порадуйте родителей успехами детей за прошедшую неделю! Откройте карточку любого ученика и нажмите кнопку <strong className="text-white">«Отчет родителям»</strong>, чтобы выбрать и отправить красивый космический, классический или стальной отчет.
                    </p>
                    <div className="pt-3">
                      <button
                        onClick={() => {
                          document.getElementById('students-catalog')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-4 py-2 bg-[#C3B4FC]/15 hover:bg-[#C3B4FC]/25 active:scale-[0.98] border border-[#C3B4FC]/30 text-[#C3B4FC] text-[10px] uppercase tracking-wider font-semibold rounded-lg transition duration-200 cursor-pointer"
                      >
                        Перейти к списку учеников
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Global dashboard stats counters and schedule planner widget */}
            <DashboardStats 
              students={students} 
              onSelectStudent={(id) => setSelectedStudentId(id)}
              onUpdateStudents={handleUpdateStudents}
              reminders={reminders}
              onUpdateReminders={handleUpdateReminders}
              onOpenYearCalendar={() => setShowYearCalendar(true)}
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
                        {s.emoji && (s.emoji.startsWith('data:') || s.emoji.startsWith('http')) ? (
                          <img src={s.emoji} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 select-none" />
                        ) : (
                          <span className="text-xl shrink-0">{s.emoji}</span>
                        )}
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
                      {quickStudentId && 'Заметка добавится первой строкой в раздел "Планы и особенности"'}
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
                      cabinet={student.cabinetId ? cabinets[student.cabinetId] : null}
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
          students={students}
          syllabusPrograms={syllabusPrograms}
          onRestoreBackup={handleRestoreBackup}
          onReconnect={reconnectSync}
        />
      )}

      {/* Grading Criteria overlay Modal */}
      <GradingCriteriaModal 
        isOpen={showGradingModal}
        onClose={() => setShowGradingModal(false)}
      />

      {/* Year Calendar Modal with Reminders */}
      {showYearCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn" onClick={() => setShowYearCalendar(false)}>
          <div 
            className="relative w-full max-w-6xl max-h-[90vh] bg-[#0c0d12]/95 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#12131a]/40">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#F4B5CD]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#F4B5CD] tracking-widest uppercase">
                    Интерактивный Календарь на {calendarYear} год
                  </h3>
                  <p className="text-[10px] text-white/40">Нажмите на любой день, чтобы добавить, изменить или удалить важное напоминание</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarYear(prev => prev - 1)}
                  className="p-1.5 bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 rounded-lg text-white/60 hover:text-white transition cursor-pointer"
                  title="Предыдущий год"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-white/80 px-2">{calendarYear}</span>
                <button
                  onClick={() => setCalendarYear(prev => prev + 1)}
                  className="p-1.5 bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 rounded-lg text-white/60 hover:text-white transition cursor-pointer"
                  title="Следующий год"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowYearCalendar(false)}
                  className="ml-4 p-1.5 bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 rounded-lg text-white/40 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 12 Months Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 no-scrollbar bg-[#0a0b0e]">
              {Array.from({ length: 12 }).map((_, monthIndex) => {
                const monthName = [
                  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
                ][monthIndex];
                const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
                
                // Calculate days for the month
                const firstDay = new Date(calendarYear, monthIndex, 1);
                const dayOfWeek = firstDay.getDay(); 
                const startOffset = (dayOfWeek + 6) % 7; 
                const daysInMonth = new Date(calendarYear, monthIndex + 1, 0).getDate();
                
                const days: { dayNum: number | null; dateStr: string }[] = [];
                for (let i = 0; i < startOffset; i++) {
                  days.push({ dayNum: null, dateStr: '' });
                }
                for (let d = 1; d <= daysInMonth; d++) {
                  const mm = String(monthIndex + 1).padStart(2, '0');
                  const dd = String(d).padStart(2, '0');
                  const dateStr = `${calendarYear}-${mm}-${dd}`;
                  days.push({ dayNum: d, dateStr });
                }

                return (
                  <div key={monthIndex} className="bg-[#12131a]/30 border border-white/5 rounded-xl p-3 flex flex-col hover:border-white/10 transition-colors">
                    <h4 className="text-[11px] font-extrabold text-[#C3B4FC] tracking-wider uppercase mb-2 text-center">
                      {monthName}
                    </h4>
                    
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                      {weekdays.map(wd => (
                        <span key={wd} className="text-[8px] font-mono text-white/30 font-semibold">{wd}</span>
                      ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {days.map((day, idx) => {
                        if (day.dayNum === null) {
                          return <div key={`empty-${idx}`} />;
                        }

                        // Check if today
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isToday = day.dateStr === todayStr;

                        // Check if there is an active reminder on this date
                        const existingReminder = reminders.find(r => r.date === day.dateStr);

                        return (
                          <button
                            key={day.dateStr}
                            onClick={() => {
                              setSelectedCalendarDate(day.dateStr);
                              setCalendarReminderText(existingReminder ? existingReminder.text : '');
                            }}
                            className={`aspect-square text-[10px] font-mono rounded flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                              existingReminder 
                                ? 'bg-[#F4B5CD]/20 text-[#F4B5CD] font-bold border border-[#F4B5CD]/45 hover:bg-[#F4B5CD]/30'
                                : isToday
                                  ? 'bg-white/10 text-white font-bold border border-white/25 hover:bg-white/20'
                                  : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span>{day.dayNum}</span>
                            {existingReminder && (
                              <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#F4B5CD] animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer / Close */}
            <div className="px-6 py-4 border-t border-white/5 bg-[#12131a]/40 flex justify-end">
              <button
                onClick={() => setShowYearCalendar(false)}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white/60 hover:text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Закрыть календарь
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Edit Modal Overlay */}
      {selectedCalendarDate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedCalendarDate(null)}>
          <div 
            className="relative w-full max-w-md bg-[#0e1017] border border-white/10 rounded-2xl flex flex-col p-6 shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F4B5CD]" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Напоминание на дату
                </h4>
              </div>
              <button 
                onClick={() => {
                  setSelectedCalendarDate(null);
                  setCalendarReminderText('');
                }}
                className="text-white/40 hover:text-white transition cursor-pointer p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F4B5CD] tracking-widest block mb-1">
                  Выбранный день
                </span>
                <span className="text-sm font-semibold text-white">
                  {(() => {
                    try {
                      const parts = selectedCalendarDate.split('-');
                      const y = parseInt(parts[0], 10);
                      const m = parseInt(parts[1], 10) - 1;
                      const d = parseInt(parts[2], 10);
                      return new Date(y, m, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                    } catch (e) {
                      return selectedCalendarDate;
                    }
                  })()}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest block">
                  Текст дела / напоминания
                </label>
                <textarea
                  value={calendarReminderText}
                  onChange={(e) => setCalendarReminderText(e.target.value)}
                  placeholder="Например: Пробник у Юры, созвониться по переносу..."
                  className="w-full h-24 bg-[#12131a]/60 border border-white/10 focus:border-[#F4B5CD]/50 text-white placeholder-white/20 text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#F4B5CD]/20 transition duration-200 resize-none font-sans leading-relaxed"
                  autoFocus
                  spellCheck="false"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {reminders.some(r => r.date === selectedCalendarDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = reminders.filter(r => r.date !== selectedCalendarDate);
                      handleUpdateReminders(updated);
                      setSelectedCalendarDate(null);
                      setCalendarReminderText('');
                    }}
                    className="flex-1 py-2.5 bg-red-950/20 hover:bg-red-950/45 border border-red-500/30 hover:border-red-500/50 text-red-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Удалить</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCalendarDate(null);
                    setCalendarReminderText('');
                  }}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white/50 hover:text-white border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider transition text-center cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanedText = calendarReminderText.trim();
                    let updated = [...reminders];
                    if (!cleanedText) {
                      updated = reminders.filter(r => r.date !== selectedCalendarDate);
                    } else {
                      const existingIndex = reminders.findIndex(r => r.date === selectedCalendarDate);
                      if (existingIndex > -1) {
                        updated[existingIndex] = {
                          ...updated[existingIndex],
                          text: cleanedText
                        };
                      } else {
                        updated.push({
                          id: Math.random().toString(36).substring(2, 9),
                          date: selectedCalendarDate,
                          text: cleanedText
                        });
                      }
                    }
                    handleUpdateReminders(updated);
                    setSelectedCalendarDate(null);
                    setCalendarReminderText('');
                  }}
                  className="flex-[2] py-2.5 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/18 border border-[#F4B5CD]/35 text-[#F4B5CD] font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer text-center"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {customConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12131a] w-full max-w-sm border border-white/10 shadow-2xl rounded-2xl overflow-hidden text-left p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#F4B5CD] uppercase tracking-wider">{customConfirm.title}</h3>
              <p className="text-xs text-white/70 mt-3 leading-relaxed">{customConfirm.message}</p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCustomConfirm(null)}
                className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-[10px] uppercase tracking-wider font-extrabold transition cursor-pointer text-center"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  customConfirm.onConfirm();
                }}
                className="flex-1 py-2 px-4 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/40 text-[#F4B5CD] hover:text-[#F4B5CD] rounded-xl text-[10px] uppercase tracking-wider font-extrabold transition cursor-pointer text-center"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentReminder && (
        <div className="fixed bottom-6 right-6 z-[250] max-w-sm bg-[#12131a] border border-[#F4B5CD]/40 shadow-[0_8px_32px_rgba(244,181,205,0.15)] p-4 rounded-2xl flex items-center justify-between gap-4 animate-slideUp">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F4B5CD]/10 flex items-center justify-center border border-[#F4B5CD]/20 text-[#F4B5CD] shrink-0 animate-pulse">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-white uppercase tracking-widest">ОТМЕТЬ ОПЛАТЫ</p>
              <p className="text-[10px] text-white/50 font-light mt-0.5">Самое время проверить балансы занятий</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleCloseReminder}
            className="text-white/40 hover:text-white hover:bg-white/5 p-1 rounded-lg transition-all cursor-pointer"
            title="Закрыть уведомление"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showScrollTop && !selectedStudentId && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 z-40 bg-[#12131a]/30 hover:bg-[#12131a]/85 border border-white/5 hover:border-[#F4B5CD]/30 text-white/50 hover:text-[#F4B5CD] p-3 rounded-xl transition-all duration-300 backdrop-blur-md cursor-pointer flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 group"
          title="Наверх"
        >
          <ArrowUp className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
        </button>
      )}
    </div>
  );
}
