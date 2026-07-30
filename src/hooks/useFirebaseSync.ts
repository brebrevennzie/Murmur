import { useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Student, SyllabusProgram, CalendarReminder } from '../types';
import { syncAllStudents } from '../utils/paymentSync';
import { safeStorage } from '../utils/safeStorage';

interface QuickTodo {
  id: string;
  text: string;
  completed: boolean;
  completedAtDate?: string;
}

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
};

export function useFirebaseSync(
  students: Student[],
  setStudents: (s: Student[]) => void,
  syllabusPrograms: SyllabusProgram[],
  setSyllabusPrograms: (p: SyllabusProgram[]) => void,
  quickTodos?: QuickTodo[],
  setQuickTodos?: (t: QuickTodo[] | ((prev: QuickTodo[]) => QuickTodo[])) => void,
  reminders?: CalendarReminder[],
  setReminders?: (r: CalendarReminder[] | ((prev: CalendarReminder[]) => CalendarReminder[])) => void
) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const [authError, setAuthError] = useState<string | null>(null);

  // Keep refs of current states to avoid dependency loop issues in listeners
  const studentsRef = useRef<Student[]>(students);
  studentsRef.current = students;
  
  const programsRef = useRef<SyllabusProgram[]>(syllabusPrograms);
  programsRef.current = syllabusPrograms;

  const quickTodosRef = useRef<QuickTodo[] | undefined>(quickTodos);
  quickTodosRef.current = quickTodos;

  const remindersRef = useRef<CalendarReminder[] | undefined>(reminders);
  remindersRef.current = reminders;

  // Track the last synced cloud payload signature to avoid redundant or loop writes
  const lastCloudPayloadRef = useRef<string>('');

  // Tracks if the first load from Firestore has finished
  const hasInitialLoadCompleted = useRef(false);
  const [isConnectionBlocked, setIsConnectionBlocked] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const reconnectSync = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Monitor network online and tab visibility changes to automatically refresh/reconnect
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network online. Re-initializing Firebase listener.');
      reconnectSync();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab visible. Re-initializing Firebase listener.');
        reconnectSync();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Monitor auth status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Switch local state keys and load data when user logs in or out
  useEffect(() => {
    const studentKey = user ? `tutor_students_db_${user.uid}` : 'tutor_students_db';
    const programKey = user ? `tutor_syllabus_programs_${user.uid}` : 'tutor_syllabus_programs';
    
    const localStudentsData = safeStorage.getItem(studentKey);
    const localProgramsData = safeStorage.getItem(programKey);
    
    if (localStudentsData) {
      try {
        const parsed = JSON.parse(localStudentsData);
        setStudents(parsed);
        studentsRef.current = parsed;
      } catch (e) {
        console.error('Failed to parse user local students:', e);
      }
    } else {
      if (!user) {
        const guestStudents = safeStorage.getItem('tutor_students_db');
        if (guestStudents) {
          try {
            const parsed = JSON.parse(guestStudents);
            setStudents(parsed);
            studentsRef.current = parsed;
          } catch (e) {}
        }
      }
    }
    
    if (localProgramsData) {
      try {
        const parsed = JSON.parse(localProgramsData);
        setSyllabusPrograms(parsed);
        programsRef.current = parsed;
      } catch (e) {
        console.error('Failed to parse user local programs:', e);
      }
    } else {
      if (!user) {
        const guestPrograms = safeStorage.getItem('tutor_syllabus_programs');
        if (guestPrograms) {
          try {
            const parsed = JSON.parse(guestPrograms);
            setSyllabusPrograms(parsed);
            programsRef.current = parsed;
          } catch (e) {}
        }
      }
    }
    
    lastCloudPayloadRef.current = '';
  }, [user]);

  // Sync state changes directly to local storage keys
  useEffect(() => {
    const studentKey = user ? `tutor_students_db_${user.uid}` : 'tutor_students_db';
    const programKey = user ? `tutor_syllabus_programs_${user.uid}` : 'tutor_syllabus_programs';
    
    safeStorage.setItem(studentKey, JSON.stringify(students));
    safeStorage.setItem(programKey, JSON.stringify(syllabusPrograms));
  }, [students, syllabusPrograms, user]);

  // Set up real-time listener when user changes or refreshKey changes
  useEffect(() => {
    if (!user) {
      setSyncStatus('idle');
      hasInitialLoadCompleted.current = false;
      setIsConnectionBlocked(false);
      return;
    }

    hasInitialLoadCompleted.current = false;
    setSyncStatus('syncing');
    setIsConnectionBlocked(false);

    const timeoutId = setTimeout(() => {
      if (!hasInitialLoadCompleted.current) {
        setIsConnectionBlocked(true);
        console.warn('Firebase connection timed out. Might be blocked by firewall.');
      }
    }, 5000);

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      setIsConnectionBlocked(false);
      clearTimeout(timeoutId);

      const isPristineDefault = (list: Student[]) => {
        if (!list || list.length !== 3) return false;
        const defaultNames = ['Александр Смирнов', 'Маргарита Кузнецова', 'Даниил Петров'];
        return list.every((s, idx) => s.id === `stud-${idx + 1}` && s.name === defaultNames[idx]);
      };

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        const dbStudents = data.students ? syncAllStudents(data.students) : [];
        const localStudents = studentsRef.current;
        
        const isDbPristine = isPristineDefault(dbStudents);
        const isLocalPristine = isPristineDefault(localStudents);

        const cloudLastUpdated = data.lastUpdated ? new Date(data.lastUpdated).getTime() : 0;
        const localLastUpdatedKey = `tutor_db_last_updated_${user.uid}`;
        const localLastUpdatedStr = safeStorage.getItem(localLastUpdatedKey);
        const localLastUpdated = localLastUpdatedStr ? new Date(localLastUpdatedStr).getTime() : 0;

        // Apply incoming cloud data across ALL app sections
        const applyCloudData = () => {
          if (data.students) {
            setStudents(dbStudents);
            const studentKey = `tutor_students_db_${user.uid}`;
            safeStorage.setItem(studentKey, JSON.stringify(dbStudents));
          }

          if (data.programs) {
            setSyllabusPrograms(data.programs);
            const programKey = `tutor_syllabus_programs_${user.uid}`;
            safeStorage.setItem(programKey, JSON.stringify(data.programs));
          }

          if (data.quickTodos && setQuickTodos) {
            setQuickTodos(data.quickTodos);
            safeSetItem('quick_notes_todos', JSON.stringify(data.quickTodos));
          }

          if (data.reminders && setReminders) {
            setReminders(data.reminders);
            safeSetItem('calendar_reminders', JSON.stringify(data.reminders));
          }

          if (data.usefulLinks) {
            const val = typeof data.usefulLinks === 'string' ? data.usefulLinks : JSON.stringify(data.usefulLinks);
            safeSetItem('useful_links', val);
          }

          if (data.secretNotesData) {
            safeSetItem('secret_notes_data', data.secretNotesData);
          }

          if (data.fanficCharacters) {
            const val = typeof data.fanficCharacters === 'string' ? data.fanficCharacters : JSON.stringify(data.fanficCharacters);
            safeSetItem('secret_notes_fanfic_characters', val);
          }

          if (data.fanficLores) {
            const val = typeof data.fanficLores === 'string' ? data.fanficLores : JSON.stringify(data.fanficLores);
            safeSetItem('secret_notes_fanfic_lores', val);
          }

          if (data.gradingCriteria) {
            const val = typeof data.gradingCriteria === 'string' ? data.gradingCriteria : JSON.stringify(data.gradingCriteria);
            safeSetItem('tutor_grading_criteria', val);
          }

          if (data.waterMl !== undefined && data.waterMl !== null) {
            safeSetItem('water_ml', String(data.waterMl));
          }

          if (data.lastUpdated) {
            safeStorage.setItem(localLastUpdatedKey, data.lastUpdated);
          }

          // Trigger custom event so all active tab components reload state from localStorage
          window.dispatchEvent(new Event('app_cloud_synced'));
          window.dispatchEvent(new Event('storage'));
        };

        if (!hasInitialLoadCompleted.current) {
          if (!isLocalPristine && isDbPristine) {
            hasInitialLoadCompleted.current = true;
            pushLocalToCloud(user.uid);
          } else if (!isLocalPristine && localLastUpdated > cloudLastUpdated) {
            hasInitialLoadCompleted.current = true;
            pushLocalToCloud(user.uid);
          } else {
            applyCloudData();
            hasInitialLoadCompleted.current = true;
            setSyncStatus('saved');
          }
        } else {
          if (docSnap.metadata.hasPendingWrites) {
            return;
          }
          applyCloudData();
          setSyncStatus('saved');
        }
      } else {
        // Document doesn't exist yet on firestore, let's push local data as starting state
        hasInitialLoadCompleted.current = true;
        pushLocalToCloud(user.uid);
      }
    }, (error) => {
      console.error('Firestore listener error:', error);
      setIsConnectionBlocked(true);
      clearTimeout(timeoutId);
      setSyncStatus('error');
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user, refreshKey]);

  // Push full payload changes to cloud whenever students, programs, todos, or reminders change
  useEffect(() => {
    if (!user || !hasInitialLoadCompleted.current) return;

    const payloadObj = buildPayloadObj(students, syllabusPrograms, quickTodos, reminders);
    const payloadStr = JSON.stringify(payloadObj);

    if (payloadStr === lastCloudPayloadRef.current) {
      setSyncStatus('saved');
      return;
    }

    setSyncStatus('syncing');

    const timestamp = new Date().toISOString();
    const lastUpdatedKey = `tutor_db_last_updated_${user.uid}`;
    safeStorage.setItem(lastUpdatedKey, timestamp);
    safeStorage.setItem('tutor_db_last_updated', timestamp);

    const delayDebounce = setTimeout(() => {
      pushLocalToCloud(user.uid, timestamp);
    }, 800);

    return () => clearTimeout(delayDebounce);
  }, [students, syllabusPrograms, quickTodos, reminders, user]);

  const buildPayloadObj = (
    sList: Student[], 
    pList: SyllabusProgram[], 
    todos?: QuickTodo[], 
    rems?: CalendarReminder[]
  ) => {
    const usefulLinks = safeGetItem('useful_links');
    const secretNotesData = safeGetItem('secret_notes_data');
    const fanficCharacters = safeGetItem('secret_notes_fanfic_characters');
    const fanficLores = safeGetItem('secret_notes_fanfic_lores');
    const gradingCriteria = safeGetItem('tutor_grading_criteria');
    const waterMl = safeGetItem('water_ml');

    return {
      students: sList,
      programs: pList,
      quickTodos: todos || quickTodosRef.current || [],
      reminders: rems || remindersRef.current || [],
      usefulLinks: usefulLinks ? (usefulLinks.startsWith('[') || usefulLinks.startsWith('{') ? JSON.parse(usefulLinks) : usefulLinks) : [],
      secretNotesData: secretNotesData || '',
      fanficCharacters: fanficCharacters ? (fanficCharacters.startsWith('[') || fanficCharacters.startsWith('{') ? JSON.parse(fanficCharacters) : fanficCharacters) : [],
      fanficLores: fanficLores ? (fanficLores.startsWith('[') || fanficLores.startsWith('{') ? JSON.parse(fanficLores) : fanficLores) : [],
      gradingCriteria: gradingCriteria ? (gradingCriteria.startsWith('[') || gradingCriteria.startsWith('{') ? JSON.parse(gradingCriteria) : gradingCriteria) : [],
      waterMl: waterMl ? Number(waterMl) : 0,
    };
  };

  const pushLocalToCloud = async (userId: string, customTimestamp?: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const timestamp = customTimestamp || new Date().toISOString();
      
      const payload = buildPayloadObj(
        studentsRef.current, 
        programsRef.current, 
        quickTodosRef.current, 
        remindersRef.current
      );

      const dataToSave = {
        ...payload,
        lastUpdated: timestamp
      };

      lastCloudPayloadRef.current = JSON.stringify(payload);
      
      await setDoc(userDocRef, dataToSave, { merge: true });
      
      const studentKey = `tutor_students_db_${userId}`;
      const programKey = `tutor_syllabus_programs_${userId}`;
      const lastUpdatedKey = `tutor_db_last_updated_${userId}`;
      
      safeStorage.setItem(studentKey, JSON.stringify(studentsRef.current));
      safeStorage.setItem(programKey, JSON.stringify(programsRef.current));
      safeStorage.setItem(lastUpdatedKey, timestamp);

      safeStorage.setItem('tutor_students_db', JSON.stringify(studentsRef.current));
      safeStorage.setItem('tutor_syllabus_programs', JSON.stringify(programsRef.current));
      safeStorage.setItem('tutor_db_last_updated', timestamp);
      
      setSyncStatus('saved');
    } catch (e) {
      console.error('Failed to sync to Firestore:', e);
      setSyncStatus('error');
    }
  };

  const formatAuthEmail = (rawInput: string): string => {
    const clean = rawInput.trim().toLowerCase();
    if (!clean) return '';
    if (!clean.includes('@')) {
      return `${clean}@tutor.app`;
    }
    return clean;
  };

  const handleSignIn = async (email: string, pass: string) => {
    setAuthError(null);
    setSyncStatus('syncing');
    const targetEmail = formatAuthEmail(email);
    try {
      await signInWithEmailAndPassword(auth, targetEmail, pass);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setAuthError('Неверный логин или пароль. Проверьте правильность ввода.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('Некорректный логин/email адрес.');
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Слишком много попыток входа. Попробуйте позже.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Регистрация/вход по Email/Password не включены в настройках вашего Firebase-проекта.');
      } else {
        setAuthError(err.message || 'Ошибка входа в систему.');
      }
      setSyncStatus('error');
      throw err;
    }
  };

  const handleSignUp = async (email: string, pass: string) => {
    setAuthError(null);
    setSyncStatus('syncing');
    const targetEmail = formatAuthEmail(email);
    try {
      const cred = await createUserWithEmailAndPassword(auth, targetEmail, pass);
      await pushLocalToCloud(cred.user.uid);
    } catch (err: any) {
      console.error('Sign-up error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('Этот логин/email уже зарегистрирован в системе.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Слишком слабый пароль. Пароль должен быть не менее 6 символов.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Регистрация/вход по Email/Password не включены в настройках вашего Firebase-проекта.');
      } else {
        setAuthError(err.message || 'Ошибка регистрации нового аккаунта.');
      }
      setSyncStatus('error');
      throw err;
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSyncStatus('syncing');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        setAuthError('Всплывающее окно заблокировано браузером. Разрешите всплывающие окна в настройках.');
      } else {
        setAuthError(err.message || 'Ошибка входа через Google.');
      }
      setSyncStatus('error');
      throw err;
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  return {
    user,
    loading,
    syncStatus,
    authError,
    setAuthError,
    handleSignIn,
    handleSignUp,
    handleGoogleSignIn,
    handleSignOut,
    isConnectionBlocked,
    reconnectSync,
  };
}

