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
      return;
    }

    setSyncStatus('syncing');
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.students) {
          // Synchronize calculations immediately on retrieval from firestore
          const dbStudents = syncAllStudents(data.students);
          const dbStudentsStr = JSON.stringify(dbStudents);
          const localStudentsStr = JSON.stringify(studentsRef.current);
          
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
        
        setSyncStatus('saved');
      } else {
        // Document doesn't exist yet on firestore, let's push local data as the starting state
        pushLocalToCloud(user.uid, studentsRef.current, programsRef.current);
      }
    }, (error) => {
      console.error('Firestore listener error:', error);
      setSyncStatus('error');
    });

    return unsubscribe;
  }, [user]);

  // Push changes to cloud whenever students or programs change (de-bounced)
  useEffect(() => {
    if (!user) return;

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
      const dataToSave = {
        students: sList,
        programs: pList,
        lastUpdated: new Date().toISOString()
      };
      
      // Cache locally what we are sending so the push effect is pacified
      lastCloudStudentsRef.current = JSON.stringify(sList);
      lastCloudProgramsRef.current = JSON.stringify(pList);
      
      await setDoc(userDocRef, dataToSave, { merge: true });
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
      const cred = await signInWithPopup(auth, provider);
      // Wait a moment and then push current local data to starting state if needed
      await pushLocalToCloud(cred.user.uid, studentsRef.current, programsRef.current);
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
  };
}
