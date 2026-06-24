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

  // Monitor auth status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Set up real-time listener when user changes
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
        console.warn('Firebase connection timed out. Might be blocked by firewall (e.g. in RF without VPN).');
      }
    }, 5000);

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      setIsConnectionBlocked(false);
      clearTimeout(timeoutId);

      const isDefaultStudentList = (list: Student[]) => {
        if (!list || list.length === 0) return true;
        const defaultIds = ['stud-1', 'stud-2', 'stud-3'];
        return list.every(s => defaultIds.includes(s.id));
      };

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        const dbStudents = data.students ? syncAllStudents(data.students) : [];
        const localStudents = studentsRef.current;
        
        const isDbDefault = isDefaultStudentList(dbStudents);
        const isLocalDefault = isDefaultStudentList(localStudents);

        // Fetch timestamps (in milliseconds)
        const cloudLastUpdated = data.lastUpdated ? new Date(data.lastUpdated).getTime() : 0;
        const localLastUpdatedStr = safeStorage.getItem('tutor_db_last_updated');
        const localLastUpdated = localLastUpdatedStr ? new Date(localLastUpdatedStr).getTime() : 0;
        
        if (!hasInitialLoadCompleted.current) {
          // ================= INITIAL LOAD SYNC DECISION =================
          // Safety check 1: if local data contains real students but cloud contains only demo students,
          // we should push local to cloud rather than downloading demo data.
          if (!isLocalDefault && isDbDefault) {
            hasInitialLoadCompleted.current = true;
            pushLocalToCloud(user.uid, localStudents, programsRef.current);
            
            if (data.programs) {
              const dbProgramsStr = JSON.stringify(data.programs);
              const localProgramsStr = JSON.stringify(programsRef.current);
              lastCloudProgramsRef.current = dbProgramsStr;
              if (dbProgramsStr !== localProgramsStr) {
                setSyllabusPrograms(data.programs);
                safeStorage.setItem('tutor_syllabus_programs', dbProgramsStr);
              }
            }
          } 
          // Safety check 2: if local data is not default and has been updated more recently than the cloud,
          // push the local data to cloud.
          else if (!isLocalDefault && localLastUpdated > cloudLastUpdated) {
            hasInitialLoadCompleted.current = true;
            pushLocalToCloud(user.uid, localStudents, programsRef.current);
          } 
          // Default sync behavior: Cloud is newer or same, or local is default: download cloud data
          else {
            if (data.students) {
              const dbStudentsStr = JSON.stringify(dbStudents);
              const localStudentsStr = JSON.stringify(localStudents);
              
              lastCloudStudentsRef.current = dbStudentsStr;
              
              if (dbStudentsStr !== localStudentsStr) {
                setStudents(dbStudents);
                // Also store locally for offline backup
                safeStorage.setItem('tutor_students_db', dbStudentsStr);
              }
            }
            
            if (data.programs) {
              const dbProgramsStr = JSON.stringify(data.programs);
              const localProgramsStr = JSON.stringify(programsRef.current);
              
              lastCloudProgramsRef.current = dbProgramsStr;
              
              if (dbProgramsStr !== localProgramsStr) {
                setSyllabusPrograms(data.programs);
                safeStorage.setItem('tutor_syllabus_programs', dbProgramsStr);
              }
            }

            // Align the local timestamp with the cloud timestamp
            if (data.lastUpdated) {
              safeStorage.setItem('tutor_db_last_updated', data.lastUpdated);
            }
            
            hasInitialLoadCompleted.current = true;
            setSyncStatus('saved');
          }
        } else {
          // ================= REAL-TIME UPDATES (AFTER INITIAL LOAD) =================
          // Once the initial sync decision is made, we ALWAYS pull down cloud changes.
          // We never push back from here, which entirely prevents clock skew overwrite loops!
          if (data.students) {
            const dbStudentsStr = JSON.stringify(dbStudents);
            const localStudentsStr = JSON.stringify(localStudents);
            
            lastCloudStudentsRef.current = dbStudentsStr;
            
            if (dbStudentsStr !== localStudentsStr) {
              setStudents(dbStudents);
              safeStorage.setItem('tutor_students_db', dbStudentsStr);
            }
          }
          
          if (data.programs) {
            const dbProgramsStr = JSON.stringify(data.programs);
            const localProgramsStr = JSON.stringify(programsRef.current);
            
            lastCloudProgramsRef.current = dbProgramsStr;
            
            if (dbProgramsStr !== localProgramsStr) {
              setSyllabusPrograms(data.programs);
              safeStorage.setItem('tutor_syllabus_programs', dbProgramsStr);
            }
          }

          if (data.lastUpdated) {
            safeStorage.setItem('tutor_db_last_updated', data.lastUpdated);
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
  }, [user]);

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
    const delayDebounce = setTimeout(() => {
      pushLocalToCloud(user.uid, students, syllabusPrograms);
    }, 1000); // 1s debounce to avoid rapid Firestore writes

    return () => clearTimeout(delayDebounce);
  }, [students, syllabusPrograms, user]);

  const pushLocalToCloud = async (userId: string, sList: Student[], pList: SyllabusProgram[]) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const timestamp = new Date().toISOString();
      const dataToSave = {
        students: sList,
        programs: pList,
        lastUpdated: timestamp
      };
      
      // Cache locally what we are sending so the push effect is pacified
      lastCloudStudentsRef.current = JSON.stringify(sList);
      lastCloudProgramsRef.current = JSON.stringify(pList);
      
      await setDoc(userDocRef, dataToSave, { merge: true });
      
      // Save matching local timestamp
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
  };
}
