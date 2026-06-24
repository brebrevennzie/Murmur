import { useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Student, SyllabusProgram } from '../types';
import { syncAllStudents } from '../utils/paymentSync';
import { safeStorage } from '../utils/safeStorage';

export function useFirebaseSync(
  students: Student[],
  setStudents: (s: Student[]) => void,
  syllabusPrograms: SyllabusProgram[],
  setSyllabusPrograms: (p: SyllabusProgram[]) => void
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

  // Track the last synced data from/to the cloud to avoid redundant or loop writes/overwrites
  const lastCloudStudentsRef = useRef<string>('');
  const lastCloudProgramsRef = useRef<string>('');

  // Tracks if the first load from Firestore has finished to avoid local default data race condition
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
      // Revert back to the main guest data when logging out
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
    
    // Clear cloud refs baseline when shifting accounts
    lastCloudStudentsRef.current = '';
    lastCloudProgramsRef.current = '';
  }, [user]);

  // Sync state changes directly to the appropriate local storage keys (guest or user-specific)
  useEffect(() => {
    const studentKey = user ? `tutor_students_db_${user.uid}` : 'tutor_students_db';
    const programKey = user ? `tutor_syllabus_programs_${user.uid}` : 'tutor_syllabus_programs';
    
    safeStorage.setItem(studentKey, JSON.stringify(students));
    safeStorage.setItem(programKey, JSON.stringify(syllabusPrograms));
  }, [students, syllabusPrograms, user]);

  // Set up real-time listener when user changes or refreshKey changes (VPN switch)
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

    // Timeout of 5 seconds to detect proxy or network blocks (e.g. Google services in Russia)
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

        // Fetch timestamps (in milliseconds) using user-specific local keys
        const cloudLastUpdated = data.lastUpdated ? new Date(data.lastUpdated).getTime() : 0;
        const localLastUpdatedKey = `tutor_db_last_updated_${user.uid}`;
        const localLastUpdatedStr = safeStorage.getItem(localLastUpdatedKey);
        const localLastUpdated = localLastUpdatedStr ? new Date(localLastUpdatedStr).getTime() : 0;
        
        if (!hasInitialLoadCompleted.current) {
          // ================= INITIAL LOAD SYNC DECISION =================
          // Safety check 1: if local data contains real user edits but cloud contains only unedited demo students,
          // we should push local to cloud rather than downloading demo data.
          if (!isLocalPristine && isDbPristine) {
            hasInitialLoadCompleted.current = true;
            pushLocalToCloud(user.uid, localStudents, programsRef.current);
            
            if (data.programs) {
              const dbProgramsStr = JSON.stringify(data.programs);
              const localProgramsStr = JSON.stringify(programsRef.current);
              lastCloudProgramsRef.current = dbProgramsStr;
              if (dbProgramsStr !== localProgramsStr) {
                setSyllabusPrograms(data.programs);
                const programKey = `tutor_syllabus_programs_${user.uid}`;
                safeStorage.setItem(programKey, dbProgramsStr);
              }
            }
          } 
          // Safety check 2: if local data contains real user edits and has been updated more recently than the cloud,
          // push the local data to cloud.
          else if (!isLocalPristine && localLastUpdated > cloudLastUpdated) {
            hasInitialLoadCompleted.current = true;
            pushLocalToCloud(user.uid, localStudents, programsRef.current);
          } 
          // Default sync behavior: Cloud is newer/same, or local is pristine/default: download cloud data
          else {
            if (data.students) {
              const dbStudentsStr = JSON.stringify(dbStudents);
              const localStudentsStr = JSON.stringify(localStudents);
              
              lastCloudStudentsRef.current = dbStudentsStr;
              
              if (dbStudentsStr !== localStudentsStr) {
                setStudents(dbStudents);
                const studentKey = `tutor_students_db_${user.uid}`;
                safeStorage.setItem(studentKey, dbStudentsStr);
              }
            }
            
            if (data.programs) {
              const dbProgramsStr = JSON.stringify(data.programs);
              const localProgramsStr = JSON.stringify(programsRef.current);
              
              lastCloudProgramsRef.current = dbProgramsStr;
              
              if (dbProgramsStr !== localProgramsStr) {
                setSyllabusPrograms(data.programs);
                const programKey = `tutor_syllabus_programs_${user.uid}`;
                safeStorage.setItem(programKey, dbProgramsStr);
              }
            }

            // Align the local timestamp with the cloud timestamp
            if (data.lastUpdated) {
              const lastUpdatedKey = `tutor_db_last_updated_${user.uid}`;
              safeStorage.setItem(lastUpdatedKey, data.lastUpdated);
            }
            
            hasInitialLoadCompleted.current = true;
            setSyncStatus('saved');
          }
        } else {
          // ================= REAL-TIME UPDATES (AFTER INITIAL LOAD) =================
          // Skip updating from cloud if we have active pending local writes (latency compensation)
          if (docSnap.metadata.hasPendingWrites) {
            return;
          }

          // Pull down cloud changes only if local state matches the last known cloud state.
          // If they differ, it means we have unsaved local changes which are still being debounced/pushed,
          // so we should not overwrite them with the old/incoming cloud state.
          const localStudentsStr = JSON.stringify(localStudents);
          const localProgramsStr = JSON.stringify(programsRef.current);
          const hasUnsavedStudents = lastCloudStudentsRef.current !== '' && localStudentsStr !== lastCloudStudentsRef.current;
          const hasUnsavedPrograms = lastCloudProgramsRef.current !== '' && localProgramsStr !== lastCloudProgramsRef.current;

          // If cloud timestamp is strictly greater, it means the cloud has a newer save from another device.
          // In that case, we MUST pull down the cloud data and align our local state.
          const isCloudNewer = cloudLastUpdated > localLastUpdated;
          const shouldUpdateStudents = isCloudNewer || !hasUnsavedStudents;
          const shouldUpdatePrograms = isCloudNewer || !hasUnsavedPrograms;

          if (shouldUpdateStudents && data.students) {
            const dbStudentsStr = JSON.stringify(dbStudents);
            if (dbStudentsStr !== localStudentsStr) {
              lastCloudStudentsRef.current = dbStudentsStr;
              setStudents(dbStudents);
              const studentKey = `tutor_students_db_${user.uid}`;
              safeStorage.setItem(studentKey, dbStudentsStr);
            }
          }

          if (shouldUpdatePrograms && data.programs) {
            const dbProgramsStr = JSON.stringify(data.programs);
            if (dbProgramsStr !== localProgramsStr) {
              lastCloudProgramsRef.current = dbProgramsStr;
              setSyllabusPrograms(data.programs);
              const programKey = `tutor_syllabus_programs_${user.uid}`;
              safeStorage.setItem(programKey, dbProgramsStr);
            }
          }

          if (data.lastUpdated) {
            const lastUpdatedKey = `tutor_db_last_updated_${user.uid}`;
            safeStorage.setItem(lastUpdatedKey, data.lastUpdated);
          }
          
          setSyncStatus('saved');
        }
      } else {
        // Document doesn't exist yet on firestore, let's push local data as the starting state
        hasInitialLoadCompleted.current = true;
        pushLocalToCloud(user.uid, studentsRef.current, programsRef.current);
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

  // Push changes to cloud whenever students or programs change (de-bounced)
  useEffect(() => {
    if (!user || !hasInitialLoadCompleted.current) return;

    // Check if the current state is identical to our last cloud transaction
    const currentStudentsStr = JSON.stringify(students);
    const currentProgramsStr = JSON.stringify(syllabusPrograms);

    if (currentStudentsStr === lastCloudStudentsRef.current && 
        currentProgramsStr === lastCloudProgramsRef.current) {
      setSyncStatus('saved');
      return;
    }

    setSyncStatus('syncing');

    // Instantly update the local timestamp so any incoming snapshot during the debounce
    // is correctly seen as OLDER than our active local edits.
    const timestamp = new Date().toISOString();
    const lastUpdatedKey = `tutor_db_last_updated_${user.uid}`;
    safeStorage.setItem(lastUpdatedKey, timestamp);
    safeStorage.setItem('tutor_db_last_updated', timestamp);

    const delayDebounce = setTimeout(() => {
      pushLocalToCloud(user.uid, students, syllabusPrograms, timestamp);
    }, 1000); // 1s debounce to avoid rapid Firestore writes

    return () => clearTimeout(delayDebounce);
  }, [students, syllabusPrograms, user]);

  const pushLocalToCloud = async (userId: string, sList: Student[], pList: SyllabusProgram[], customTimestamp?: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const timestamp = customTimestamp || new Date().toISOString();
      const dataToSave = {
        students: sList,
        programs: pList,
        lastUpdated: timestamp
      };
      
      await setDoc(userDocRef, dataToSave, { merge: true });
      
      // Update our baseline refs ONLY after successful write confirmation!
      lastCloudStudentsRef.current = JSON.stringify(sList);
      lastCloudProgramsRef.current = JSON.stringify(pList);
      
      // Save matching local timestamp & user-specific local values
      const studentKey = `tutor_students_db_${userId}`;
      const programKey = `tutor_syllabus_programs_${userId}`;
      const lastUpdatedKey = `tutor_db_last_updated_${userId}`;
      
      safeStorage.setItem(studentKey, JSON.stringify(sList));
      safeStorage.setItem(programKey, JSON.stringify(pList));
      safeStorage.setItem(lastUpdatedKey, timestamp);

      // Keep guest fallback keys in sync as a backup
      safeStorage.setItem('tutor_students_db', JSON.stringify(sList));
      safeStorage.setItem('tutor_syllabus_programs', JSON.stringify(pList));
      safeStorage.setItem('tutor_db_last_updated', timestamp);
      
      setSyncStatus('saved');
    } catch (e) {
      console.error('Failed to sync to Firestore:', e);
      setSyncStatus('error');
    }
  };

  const handleSignIn = async (email: string, pass: string) => {
    setAuthError(null);
    setSyncStatus('syncing');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setAuthError('Неверный логин или пароль. Проверьте правильность ввода.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('Некорректный адрес электронной почты.');
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Слишком много попыток входа. Попробуйте позже.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Регистрация/вход по Email/Password не включены в настройках вашего Firebase-проекта. Перейдите в Firebase Console -> Authentication -> Sign-in method, выберите Email/Password, нажмите Включить (Enable) и сохраните.');
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
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      // Wait a moment and then push current local data to start the account
      await pushLocalToCloud(cred.user.uid, studentsRef.current, programsRef.current);
    } catch (err: any) {
      console.error('Sign-up error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('Этот email уже зарегистрирован в системе.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Слишком слабый пароль. Пароль должен быть не менее 6 символов.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Регистрация/вход по Email/Password не включены в настройках вашего Firebase-проекта. Перейдите в Firebase Console -> Authentication -> Sign-in method, выберите Email/Password, нажмите Включить (Enable) и сохраните.');
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
      // We don't call pushLocalToCloud here. Instead, our onSnapshot listener in useEffect
      // will trigger. If the firebase document exists, it loads the existing user's data.
      // If it doesn't exist, it safely initializes the state. This protects "изменения в гугле" from overwrites.
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        setAuthError('Всплывающее окно заблокировано вашим браузером. Пожалуйста, разрешите всплывающие окна в настройках.');
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
