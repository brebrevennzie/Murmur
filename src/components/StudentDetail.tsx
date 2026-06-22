import React, { useState } from 'react';
import { Student, MockExam, Lesson, Payment, TopicGap } from '../types';
import { SvgChart } from './SvgChart';
import { ParentReportModal } from './ParentReportModal';
import { parseRawKtpText } from '../utils/scheduleParser';
import { 
  ArrowLeft, Calendar, Award, CheckCircle2, AlertTriangle, 
  Plus, Trash2, DollarSign, BookOpen, Clock, FileText, CheckCircle, 
  HelpCircle, PenTool, ClipboardList, TrendingUp, AlertCircle,
  Video, ExternalLink, Link
} from 'lucide-react';

interface StudentDetailProps {
  student: Student;
  onBack: () => void;
  onUpdateStudent: (updatedStudent: Student) => void;
}

type ActiveTab = 'analytics' | 'topicGaps' | 'attendance' | 'payments';

export const StudentDetail: React.FC<StudentDetailProps> = ({ student, onBack, onUpdateStudent }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analytics');
  const [historySubTab, setHistorySubTab] = useState<'lessons' | 'mocks'>('lessons');
  const [showParentReport, setShowParentReport] = useState(false);

  // Syllabus program states
  const [isSelectingProgram, setIsSelectingProgram] = useState(false);
  const [customProgramName, setCustomProgramName] = useState('');
  const [customProgramText, setCustomProgramText] = useState('');

  // Syllabus templates loaded from localStorage
  const presetPrograms = React.useMemo(() => {
    try {
      const data = localStorage.getItem('tutor_syllabus_programs');
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  }, [isSelectingProgram]);

  const [selectedPresetId, setSelectedPresetId] = useState('');

  const handleKtpFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCustomProgramText(text);
    };
    reader.readAsText(file);
  };

  // Set default selection if empty
  React.useEffect(() => {
    if (!selectedPresetId && presetPrograms.length > 0) {
      setSelectedPresetId(presetPrograms[0].id);
    } else if (presetPrograms.length === 0) {
      setSelectedPresetId('custom');
    }
  }, [presetPrograms, selectedPresetId]);

  // Form states
  const [showAddMock, setShowAddMock] = useState(false);
  const [newMock, setNewMock] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    score: '',
    maxScore: '100',
    gapsString: '',
    notes: ''
  });

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '17:00',
    status: 'attended' as Lesson['status'],
    reason: '',
    summary: '',
    homework: '',
    homeworkStatus: 'pending' as Lesson['homeworkStatus'],
    homeworkReason: '',
    notes: '',
    ktpStatus: 'according' as Lesson['ktpStatus'],
    isPaid: false,
    studentQuestions: ''
  });

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    lessonsPaid: '4',
    method: 'СБП',
    notes: ''
  });

  const [showAddGap, setShowAddGap] = useState(false);
  const [newGap, setNewGap] = useState({
    title: '',
    severity: 'medium' as TopicGap['severity'],
    status: 'new' as TopicGap['status'],
    notes: ''
  });

  // Calculate stats
  const totalMocks = student.mockExams.length;
  const averagePercentage = totalMocks > 0
    ? Math.round(student.mockExams.reduce((acc, cr) => acc + (cr.score / cr.maxScore), 0) / totalMocks * 100)
    : 0;

  const missedExcused = student.lessons.filter(l => l.status === 'missed_excused').length;
  const missedUnexcused = student.lessons.filter(l => l.status === 'missed_unexcused').length;
  const totalLessonsCount = student.lessons.filter(l => l.status === 'attended').length;

  // General notes edit mode
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(student.notes);

  // General profile details edit mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: student.name,
    subject: student.subject,
    gradeClass: student.gradeClass,
    goal: student.goal,
    schedule: student.schedule.join(', '),
    hourlyRate: student.hourlyRate,
  });

  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const [tempZoomLink, setTempZoomLink] = useState(student.zoomLink || '');

  React.useEffect(() => {
    setTempZoomLink(student.zoomLink || '');
  }, [student.zoomLink]);

  const handleSaveZoomLink = () => {
    let formattedLink = tempZoomLink.trim();
    if (formattedLink && !/^https?:\/\//i.test(formattedLink)) {
      formattedLink = 'https://' + formattedLink;
    }
    onUpdateStudent({
      ...student,
      zoomLink: formattedLink
    });
    setIsEditingZoom(false);
  };

  // Update logic triggers
  const handleSaveNotes = () => {
    onUpdateStudent({
      ...student,
      notes: notesText
    });
    setIsEditingNotes(false);
  };

  const handleSaveProfile = () => {
    onUpdateStudent({
      ...student,
      name: profileForm.name,
      subject: profileForm.subject,
      gradeClass: profileForm.gradeClass,
      goal: profileForm.goal,
      schedule: profileForm.schedule.split(',').map(s => s.trim()).filter(Boolean),
      hourlyRate: Number(profileForm.hourlyRate)
    });
    setIsEditingProfile(false);
  };

  const handleLessonBalanceChange = (amount: number) => {
    onUpdateStudent({
      ...student,
      balanceLessons: student.balanceLessons + amount
    });
  };

  // ADD MOCK TEST result
  const handleAddMock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMock.name || !newMock.score || !newMock.maxScore) return;

    const mock: MockExam = {
      id: 'mock-' + Date.now(),
      name: newMock.name,
      date: newMock.date,
      score: Number(newMock.score),
      maxScore: Number(newMock.maxScore),
      gaps: newMock.gapsString.split(',').map(g => g.trim()).filter(Boolean),
      notes: newMock.notes || undefined
    };

    onUpdateStudent({
      ...student,
      mockExams: [...student.mockExams, mock]
    });

    // Reset form
    setNewMock({
      name: '',
      date: new Date().toISOString().split('T')[0],
      score: '',
      maxScore: '100',
      gapsString: '',
      notes: ''
    });
    setShowAddMock(false);
  };

  // REMOVE MOCK TEST
  const handleDeleteMock = (mockId: string) => {
    if (window.confirm('Удалить этот результат пробника?')) {
      onUpdateStudent({
        ...student,
        mockExams: student.mockExams.filter(m => m.id !== mockId)
      });
    }
  };

  // ADD LESSON entry
  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLesson.date) return;

    const lesson: Lesson = {
      id: 'les-' + Date.now(),
      date: newLesson.date,
      time: newLesson.time || undefined,
      status: newLesson.status,
      reason: newLesson.status !== 'attended' ? newLesson.reason : undefined,
      summary: newLesson.status === 'attended' ? newLesson.summary : undefined,
      homework: newLesson.homework || undefined,
      homeworkStatus: newLesson.status === 'attended' ? newLesson.homeworkStatus : undefined,
      homeworkReason: (newLesson.status === 'attended' && (newLesson.homeworkStatus === 'missed' || newLesson.homeworkStatus === 'partially')) ? newLesson.homeworkReason : undefined,
      notes: newLesson.notes || undefined,
      ktpStatus: newLesson.status === 'attended' ? newLesson.ktpStatus : undefined,
      isPaid: newLesson.isPaid,
      studentQuestions: newLesson.status === 'attended' ? newLesson.studentQuestions : undefined
    };

    // Deduct from remaining balance if student attended or missed unexcused according to contract
    let balanceModify = 0;
    if (newLesson.status === 'attended' || newLesson.status === 'missed_unexcused') {
      balanceModify = -1;
    }

    onUpdateStudent({
      ...student,
      lessons: [lesson, ...student.lessons],
      balanceLessons: student.balanceLessons + balanceModify
    });

    // Reset form
    setNewLesson({
      date: new Date().toISOString().split('T')[0],
      time: '17:00',
      status: 'attended',
      reason: '',
      summary: '',
      homework: '',
      homeworkStatus: 'pending',
      homeworkReason: '',
      notes: '',
      ktpStatus: 'according',
      isPaid: false,
      studentQuestions: ''
    });
    setShowAddLesson(false);
  };

  // DELETE LESSON
  const handleDeleteLesson = (lessonId: string, lessonStatus: Lesson['status']) => {
    if (window.confirm('Вы действительно хотите удалить эту запись о занятии?')) {
      // Re-add balance if it was deducted
      let refundBalance = 0;
      if (lessonStatus === 'attended' || lessonStatus === 'missed_unexcused') {
        refundBalance = 1;
      }
      onUpdateStudent({
        ...student,
        lessons: student.lessons.filter(l => l.id !== lessonId),
        balanceLessons: student.balanceLessons + refundBalance
      });
    }
  };

  // ADD PAYMENT
  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.amount || !newPayment.lessonsPaid) return;

    const amount = Number(newPayment.amount);
    const lessonsPaid = Number(newPayment.lessonsPaid);

    const payment: Payment = {
      id: 'pay-' + Date.now(),
      date: newPayment.date,
      amount,
      lessonsPaid,
      method: newPayment.method,
      notes: newPayment.notes || undefined
    };

    onUpdateStudent({
      ...student,
      payments: [payment, ...student.payments],
      balanceLessons: student.balanceLessons + lessonsPaid
    });

    // Reset form
    setNewPayment({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      lessonsPaid: '4',
      method: 'СБП',
      notes: ''
    });
    setShowAddPayment(false);
  };

  // DELETE PAYMENT
  const handleDeletePayment = (paymentId: string, lessonsRefund: number) => {
    if (window.confirm('Откатить этот платёж? Баланс уроков также уменьшится.')) {
      onUpdateStudent({
        ...student,
        payments: student.payments.filter(p => p.id !== paymentId),
        balanceLessons: student.balanceLessons - lessonsRefund
      });
    }
  };

  // ADD TOPIC GAP
  const handleAddGap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGap.title) return;

    const gap: TopicGap = {
      id: 'gap-' + Date.now(),
      title: newGap.title,
      severity: newGap.severity,
      status: newGap.status,
      notes: newGap.notes || undefined
    };

    onUpdateStudent({
      ...student,
      topicGaps: [...student.topicGaps, gap]
    });

    setNewGap({
      title: '',
      severity: 'medium',
      status: 'new',
      notes: ''
    });
    setShowAddGap(false);
  };

  // QUICK ADD TOPIC GAP FROM SYLLABUS/KTP
  const handleAddPresetGap = (title: string) => {
    if (student.topicGaps.some(g => g.title.toLowerCase() === title.toLowerCase())) {
      alert('Эта тема уже добавлена в список пробелов!');
      return;
    }

    const gap: TopicGap = {
      id: 'gap-' + Date.now(),
      title,
      severity: 'medium',
      status: 'new',
      notes: 'Добавлено из учебного плана'
    };

    onUpdateStudent({
      ...student,
      topicGaps: [...student.topicGaps, gap]
    });
  };

  // UPDATE GAP STATE
  const handleToggleGapStatus = (gapId: string, currentStatus: TopicGap['status']) => {
    const nextStatusMap: Record<TopicGap['status'], TopicGap['status']> = {
      'new': 'learning',
      'learning': 'mastered',
      'mastered': 'new'
    };
    const updatedGaps = student.topicGaps.map(g => {
      if (g.id === gapId) {
        const next = nextStatusMap[currentStatus];
        return {
          ...g,
          status: next,
          fixedDate: next === 'mastered' ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return g;
    });

    onUpdateStudent({
      ...student,
      topicGaps: updatedGaps
    });
  };

  // DELETE GAP
  const handleDeleteGap = (gapId: string) => {
    onUpdateStudent({
      ...student,
      topicGaps: student.topicGaps.filter(g => g.id !== gapId)
    });
  };

  return (
    <div className="bg-transparent min-h-screen text-[#E2E8F0] font-sans pb-16">
      {/* Detail Cover Area */}
      <div 
        className="h-36 w-full transition-all duration-300 relative"
        style={{ background: student.coverColor, backgroundSize: 'cover' }}
      >
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#12131a]/95 border border-white/10 text-[10px] uppercase tracking-wider font-bold text-white hover:bg-[#1E212D] transition rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Назад к списку
        </button>

        <button 
          onClick={() => setShowParentReport(true)}
          className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.12] active:bg-white/[0.18] backdrop-blur-xl border border-white/10 text-[10px] uppercase tracking-widest font-extrabold text-[#F4B5CD] transition-all duration-300 rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:shadow-[#F4B5CD]/10 cursor-pointer"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#F4B5CD]" />
          Общая статистика для родителей 📊
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* Floating Header */}
        <div className="relative -mt-10 mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="text-6xl p-3 bg-[#12131a] rounded-2xl border border-white/10 select-none shadow-2xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
              {student.emoji}
            </span>
            <div className="pt-8">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight">
                  {student.name}
                </h1>
                <button 
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-white/45 hover:text-[#F4B5CD] transition p-1 text-xs"
                  title="Редактировать личные данные"
                >
                  <PenTool className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs uppercase tracking-widest font-bold text-[#F4B5CD] mt-1.5">
                {student.gradeClass} • {student.subject}
              </p>
            </div>
          </div>

          {/* Zoom Meeting Link Card */}
          <div className="bg-gradient-to-br from-[#1E293B]/60 via-white/[0.02] to-white/[0.01] backdrop-blur-xl p-4 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl shadow-xl min-w-[280px]">
            {isEditingZoom ? (
              <div className="w-full space-y-2">
                <span className="text-[10px] text-[#F4B5CD] uppercase font-semibold tracking-wider block font-sans">Ссылка на конференцию Zoom:</span>
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={tempZoomLink}
                    onChange={(e) => setTempZoomLink(e.target.value)}
                    placeholder="Вставьте ссылку на Zoom..."
                    className="flex-grow text-xs px-3 py-1.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-lg font-sans"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveZoomLink();
                    }}
                  />
                  <button
                    onClick={handleSaveZoomLink}
                    className="py-1 px-3 bg-lavender/10 hover:bg-lavender/20 text-lavender border border-lavender/30 text-[10px] font-bold uppercase tracking-wider rounded-lg transition shrink-0 cursor-pointer"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => {
                      setTempZoomLink(student.zoomLink || '');
                      setIsEditingZoom(false);
                    }}
                    className="py-1 px-3 bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 text-[10px] font-bold uppercase tracking-wider rounded-lg transition shrink-0 cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <span className="text-[9px] text-[#F4B5CD] uppercase font-bold tracking-widest block font-sans">Конференция Zoom</span>
                  <div className="mt-1 flex items-center gap-2">
                    {student.zoomLink ? (
                      <a
                        href={student.zoomLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-white hover:text-[#F4B5CD] underline font-medium truncate max-w-[220px] inline-flex items-center gap-1 transition"
                      >
                        <Video className="w-3.5 h-3.5 shrink-0 text-[#F4B5CD]" />
                        <span className="truncate">{student.zoomLink}</span>
                        <ExternalLink className="w-3 h-3 text-white/40 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-xs text-white/40 font-sans">Ссылка не настроена</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {student.zoomLink && (
                    <a
                      href={student.zoomLink}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/30 text-[#F4B5CD] text-[10px] uppercase font-extrabold tracking-wider transition rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Войти
                    </a>
                  )}
                  <button
                    onClick={() => setIsEditingZoom(true)}
                    className="py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-[10px] uppercase font-bold tracking-wider transition rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    {student.zoomLink ? 'Изменить' : 'Вставить ссылку'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Profile Details Edit Drawer Form */}
        {isEditingProfile && (
          <div className="mb-6 bg-gradient-to-br from-[#F4B5CD]/[0.08] via-white/[0.03] to-white/[0.01] backdrop-blur-xl border border-white/10 p-5 shadow-2xl transition-all duration-300 rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-[#F4B5CD] text-sm flex items-center gap-1.5">
                <PenTool className="w-4 h-4" />
                Редактирование профиля ученика
              </h3>
              <span className="text-[8px] font-mono text-white/20 select-none uppercase tracking-wider">
                ● Автосохранение
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Имя / Фамилия</label>
                <input 
                  type="text" 
                  value={profileForm.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileForm(p => ({ ...p, name: val }));
                    onUpdateStudent({ ...student, name: val });
                  }}
                  className="w-full px-3 py-2 border border-white/5 bg-white/5 text-xs text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Цель обучения</label>
                <input 
                  type="text" 
                  value={profileForm.goal}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileForm(p => ({ ...p, goal: val }));
                    onUpdateStudent({ ...student, goal: val });
                  }}
                  className="w-full px-3 py-2 border border-white/5 bg-white/5 text-xs text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Предмет</label>
                <input 
                  type="text" 
                  value={profileForm.subject}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileForm(p => ({ ...p, subject: val }));
                    onUpdateStudent({ ...student, subject: val });
                  }}
                  className="w-full px-3 py-2 border border-white/5 bg-white/5 text-xs text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Возраст / Класс</label>
                <input 
                  type="text" 
                  value={profileForm.gradeClass}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileForm(p => ({ ...p, gradeClass: val }));
                    onUpdateStudent({ ...student, gradeClass: val });
                  }}
                  className="w-full px-3 py-2 border border-white/5 bg-white/5 text-xs text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">График занятий</label>
                <input 
                  type="text" 
                  value={profileForm.schedule}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileForm(p => ({ ...p, schedule: val }));
                    onUpdateStudent({ 
                      ...student, 
                      schedule: val.split(',').map((s: string) => s.trim()).filter(Boolean) 
                    });
                  }}
                  className="w-full px-3 py-2 border border-white/5 bg-white/5 text-xs text-white focus:border-[#F4B5CD] focus:outline-none font-mono rounded-xl"
                  placeholder="Пн 18:00, Чт 16:30 (90 мин)"
                />
                <span className="text-[9px] text-white/35 block mt-1">
                  Примеры: <code className="text-white/55">Пн 17:00</code> (1ч) или <code className="text-white/55">Чт 18:30 (90 мин)</code> (1.5ч).
                </span>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1 font-mono">Ставка за урок (₽)</label>
                <input 
                  type="number" 
                  value={profileForm.hourlyRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileForm(p => ({ ...p, hourlyRate: val }));
                    onUpdateStudent({ ...student, hourlyRate: Number(val) });
                  }}
                  className="w-full px-3 py-2 border border-white/5 bg-white/5 text-xs text-white focus:border-[#F4B5CD] focus:outline-none font-mono rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-white/5">
              <button 
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-5 py-2 bg-zinc-900 border border-white/10 text-[10px] tracking-widest uppercase font-bold text-white hover:bg-zinc-800 transition rounded-xl"
              >
                Закрыть редактор
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Grid Row Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Goal card */}
          <div className="bg-gradient-to-br from-[#F4B5CD]/[0.06] via-white/[0.02] to-white/[0.01] backdrop-blur-xl p-5 border border-white/10 md:col-span-2 rounded-2xl shadow-xl">
            <h4 className="text-[9px] text-white/45 font-bold uppercase tracking-widest mb-1">Основная цель обучения</h4>
            <p className="text-white text-sm leading-relaxed font-light">
              {student.goal}
            </p>
            <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-[10px] uppercase text-white/50 tracking-wider">
              <span><strong className="text-[#F4B5CD] font-sans">График:</strong> {student.schedule.join(', ') || 'Гибкий'}</span>
              <span><strong className="text-[#F4B5CD] font-sans">Ставка:</strong> {student.hourlyRate} ₽/урок</span>
            </div>
          </div>

          {/* Quick Attendance overview */}
          <div className="bg-gradient-to-br from-[#F4B5CD]/[0.06] via-white/[0.02] to-white/[0.01] backdrop-blur-xl p-5 border border-white/10 rounded-2xl shadow-xl">
            <h4 className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1">Посещаемость и Пропуски</h4>
            <div className="grid grid-cols-3 gap-1.5 text-center mt-2.5">
              <div className="bg-lavender/10 rounded p-2 border border-lavender/25">
                <span className="text-base font-mono font-bold text-lavender block">{totalLessonsCount}</span>
                <span className="text-[8px] uppercase tracking-wider text-white/40 font-medium">Уроков</span>
              </div>
              <div className="bg-white/5 rounded p-2 border border-white/10">
                <span className="text-base font-mono font-bold text-white/80 block">{missedExcused}</span>
                <span className="text-[8px] uppercase tracking-wider text-white/40 font-medium">Уваж.</span>
              </div>
              <div className="bg-rose-950/20 rounded p-2 border border-rose-900/40">
                <span className="text-base font-mono font-bold text-rose-400 block">{missedUnexcused}</span>
                <span className="text-[8px] uppercase tracking-wider text-white/40 font-medium">Прогулы</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Block */}
        <div className="bg-gradient-to-br from-[#F4B5CD]/[0.06] via-white/[0.02] to-[#8EA4C9]/[0.01] backdrop-blur-xl p-5 border border-white/10 mb-8 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[9px] uppercase font-extrabold tracking-widest text-[#F4B5CD] flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4" />
              Планы преподавателя и особенности ученика
            </h4>
            <span className="text-[8px] font-mono text-white/20 select-none uppercase tracking-wider">
              ● Автосохранение
            </span>
          </div>

          <textarea 
            value={notesText}
            onChange={(e) => {
              const val = e.target.value;
              setNotesText(val);
              onUpdateStudent({
                ...student,
                notes: val
              });
            }}
            className="w-full text-xs font-sans p-3 border border-white/5 bg-transparent text-white focus:outline-none focus:border-[#F4B5CD]/50 h-28 leading-relaxed resize-none font-light placeholder-white/20"
            placeholder="Напишите здесь важные особенности ученика, сложные темы, психологию общения — все изменения сохраняются моментально..."
          />
        </div>

        {/* KTP Syllabus Program Widget Section */}
        <div className="bg-gradient-to-br from-[#F4B5CD]/[0.05] via-white/[0.01] to-white/[0.01] backdrop-blur-xl p-5 border border-white/10 mb-8 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] uppercase font-extrabold tracking-widest text-[#F4B5CD] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Календарно-тематическое планирование (КТП)
            </h4>
            {student.program && (
              <button
                onClick={() => {
                  if (confirm("Вы уверены, что хотите сбросить КТП программу для этого ученика?")) {
                    onUpdateStudent({
                      ...student,
                      program: undefined
                    });
                  }
                }}
                className="text-[9px] uppercase font-mono tracking-wider text-rose-450 hover:text-rose-400 border border-rose-500/10 hover:border-rose-500/20 px-2 py-0.5 rounded-lg transition shrink-0 cursor-pointer"
              >
                Сбросить КТП
              </button>
            )}
          </div>

          {!student.program && !isSelectingProgram ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-xs text-white/40 font-light">Программа КТП под этого ученика еще не выбрана. Загрузите или выберите программу, чтобы следить за отставанием.</p>
              <button
                onClick={() => setIsSelectingProgram(true)}
                className="py-2.5 px-5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-white text-[11px] uppercase font-bold tracking-[0.12em] rounded-xl transition duration-200 inline-flex items-center gap-2 cursor-pointer"
              >
                + Настроить КТП программу
              </button>
            </div>
          ) : isSelectingProgram ? (
            <div className="space-y-4 border-t border-white/5 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">Выбрать из каталога программ:</label>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => {
                      setSelectedPresetId(e.target.value);
                      if (e.target.value !== 'custom') {
                        setCustomProgramName('');
                        setCustomProgramText('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-white/10 bg-black/40 text-xs text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                  >
                    {presetPrograms.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#12131a]">{p.name}</option>
                    ))}
                    <option value="custom" className="bg-[#12131a]">&lt; Загрузить свою программу текстом &gt;</option>
                  </select>
                </div>

                {selectedPresetId === 'custom' && (
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">Название вашей программы:</label>
                    <input
                      type="text"
                      value={customProgramName}
                      onChange={(e) => setCustomProgramName(e.target.value)}
                      placeholder="e.g. Курс олимпиадной физики"
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-black/40 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    />
                  </div>
                )}
              </div>

              {selectedPresetId === 'custom' && (
                <div className="space-y-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-extrabold text-[#F4B5CD]">
                        Текст КТП программы
                      </label>
                      <p className="text-[10px] text-white/40">Каждая строчка автоматически станет отдельной темой для урока.</p>
                    </div>

                    {/* File Upload Option */}
                    <label className="cursor-pointer px-3 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-[9px] uppercase tracking-widest font-extrabold text-white transition flex items-center gap-1.5 self-start">
                      📁 Загрузить .txt / .csv
                      <input 
                        type="file" 
                        accept=".txt,.csv" 
                        onChange={handleKtpFileImport} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <textarea
                    value={customProgramText}
                    onChange={(e) => setCustomProgramText(e.target.value)}
                    placeholder="Пример:&#10;1. Вводный урок и дроби&#10;2. Раздел 2: Тригонометрический круг (2 часа)&#10;3. Решение уравнений и неравенств"
                    className="w-full text-xs font-mono p-3.5 border border-white/10 bg-black/60 text-white focus:border-[#F4B5CD] focus:outline-none h-32 leading-relaxed resize-none rounded-xl font-light"
                  />

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!customProgramText.trim()) {
                          alert('Пожалуйста, введите текст КТП или загрузите файл перед очисткой.');
                          return;
                        }
                        const cleaned = parseRawKtpText(customProgramText);
                        if (cleaned.length === 0) {
                          alert('Пожалуйста, внесите непустой текст.');
                          return;
                        }
                        setCustomProgramText(cleaned.join('\n'));
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-lavender/10 hover:bg-lavender/20 active:scale-95 text-[#C3B4FC] border border-lavender/25 text-[9px] font-extrabold uppercase tracking-widest rounded-xl transition cursor-pointer"
                      title="Удаляет номера тем, даты, дубликаты, а также очищает колонки при копировании из Excel"
                    >
                      ✨ Смарт-очистка (удалить №, даты, лишние столбцы Excel)
                    </button>

                    <div className="text-[9px] text-white/35 max-w-xs leading-relaxed">
                      💡 <strong>Как работает синхронизация:</strong> Темы последовательно привязываются к проведённым урокам по порядку дат.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setIsSelectingProgram(false)}
                  className="px-4 py-2 border border-white/5 text-white/50 hover:text-white hover:bg-white/5 text-[10px] tracking-widest uppercase font-bold transition rounded-xl cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    let name = '';
                    let topicsList: string[] = [];
                    if (selectedPresetId === 'custom') {
                      name = customProgramName.trim() || 'Индивидуальная программа';
                      topicsList = customProgramText
                        .split('\n')
                        .map(t => t.trim())
                        .filter(Boolean);
                      if (topicsList.length === 0) {
                        alert('Пожалуйста, введите хотя бы одну тему программы.');
                        return;
                      }
                    } else {
                      const preset = presetPrograms.find(p => p.id === selectedPresetId);
                      if (preset) {
                        name = preset.name;
                        topicsList = preset.topics;
                      }
                    }

                    const formedTopics = topicsList.map((t, idx) => ({
                      id: 't-' + Date.now() + '-' + idx,
                      title: t,
                      status: 'pending' as const
                    }));

                    onUpdateStudent({
                      ...student,
                      program: {
                        id: 'prog-' + Date.now(),
                        name,
                        topics: formedTopics
                      }
                    });
                    setIsSelectingProgram(false);
                    // Clear fields
                    setCustomProgramName('');
                    setCustomProgramText('');
                  }}
                  className="px-5 py-2 bg-[#F4B5CD] text-[#12131a] hover:bg-[#E598B8] text-[10px] tracking-widest uppercase font-extrabold transition rounded-xl cursor-pointer"
                >
                  Установить программу
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] text-white/40 block">Текущий курс:</span>
                  <span className="text-sm font-serif text-white font-medium">{student.program?.name}</span>
                </div>
                
                {/* Visual lag status */}
                {(() => {
                  const ktpDeviations = student.lessons.filter(l => l.ktpStatus === 'deviated').length;
                  const completedCount = student.program?.topics.filter(t => t.status === 'completed').length || 0;
                  const totalTopics = student.program?.topics.length || 0;
                  const percent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
                  return (
                    <div className="text-right flex flex-col items-end gap-1 select-none">
                      {ktpDeviations > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-455 border border-rose-500/20 text-[9px] uppercase tracking-wider font-bold rounded-lg flex items-center gap-1">
                          ⚠️ Отставание от КТП: {ktpDeviations} {ktpDeviations === 1 ? 'занятие' : (ktpDeviations > 1 && ktpDeviations < 5) ? 'занятия' : 'занятий'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-lavender/10 text-lavender border border-lavender/25 text-[9px] uppercase tracking-wider font-bold rounded-lg flex items-center gap-1">
                          ✨ Идёт по КТП без отставаний
                        </span>
                      )}
                      <span className="text-[10px] text-white/45 font-mono">Пройдено: {completedCount} из {totalTopics} тем ({percent}%)</span>
                    </div>
                  );
                })()}
              </div>

              {/* Progress bar */}
              {(() => {
                const completedCount = student.program?.topics.filter(t => t.status === 'completed').length || 0;
                const totalTopics = student.program?.topics.length || 0;
                const percent = totalTopics > 0 ? (completedCount / totalTopics) * 100 : 0;
                return (
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-[#F4B5CD] to-indigo-400 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                  </div>
                );
              })()}

              {/* Mini-grid with the list of topics */}
              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase tracking-widest text-[#F4B5CD] block font-bold mb-2">📋 Список тем (КТП планировщик)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-48 overflow-y-auto no-scrollbar">
                  {student.program?.topics.map((t, idx) => (
                    <div 
                      key={t.id} 
                      className={`p-2 rounded-lg border flex justify-between items-center transition ${
                        t.status === 'completed'
                          ? 'bg-lavender/10 border-lavender/25 text-lavender'
                          : t.status === 'missed'
                            ? 'bg-rose-950/15 border-rose-500/15 text-rose-300'
                            : 'bg-white/[0.01] border-white/5 text-white/70'
                      }`}
                    >
                      <span className="truncate max-w-[200px] leading-tight flex items-center gap-1">
                        <span className="font-mono text-[9px] opacity-40">#{idx+1}</span>
                        {t.title}
                      </span>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = student.program!.topics.map(x => {
                              if (x.id === t.id) {
                                return { ...x, status: x.status === 'completed' ? 'pending' : 'completed' as const };
                              }
                              return x;
                            });
                            onUpdateStudent({
                              ...student,
                              program: {
                                ...student.program!,
                                topics: updated
                              }
                            });
                          }}
                          className={`px-1.5 py-0.5 text-[9px] uppercase font-bold rounded cursor-pointer transition ${
                            t.status === 'completed' 
                              ? 'bg-lavender/30 text-lavender border border-lavender/40 font-extrabold' 
                              : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'
                          }`}
                          title="Пройдено"
                        >
                          Да
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = student.program!.topics.map(x => {
                              if (x.id === t.id) {
                                return { ...x, status: x.status === 'missed' ? 'pending' : 'missed' as const };
                              }
                              return x;
                            });
                            onUpdateStudent({
                              ...student,
                              program: {
                                ...student.program!,
                                topics: updated
                              }
                            });
                          }}
                          className={`px-1.5 py-0.5 text-[9px] uppercase font-bold rounded cursor-pointer transition ${
                            t.status === 'missed' 
                              ? 'bg-rose-500 text-black font-extrabold' 
                              : 'bg-white/5 text-white/50 hover:bg-white/10'
                          }`}
                          title="Не уложились по времени / Не успели"
                        >
                          Нет
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-white/30 pt-1">
                <span>* Темы автоматически распределяются с закрытыми уроками по порядку. Также вы можете вручную менять статус тем выше.</span>
                <button
                  onClick={() => setIsSelectingProgram(true)}
                  className="text-[#F4B5CD] hover:underline uppercase font-bold tracking-wider cursor-pointer"
                >
                  Сменить программу &gt;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Selection Row (Notion-style) */}
        <div className="flex border-b border-white/5 mb-6 font-serif overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'analytics'
                ? 'border-blush-mist text-blush-mist font-bold'
                : 'border-transparent text-white/40 hover:text-white hover:border-white/10'
            }`}
          >
            <Award className="w-4 h-4" />
            Прогресс и Экзамены ({student.mockExams.length})
          </button>
          <button
            onClick={() => setActiveTab('topicGaps')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'topicGaps'
                ? 'border-dusty-rose text-dusty-rose font-bold'
                : 'border-transparent text-white/40 hover:text-white hover:border-white/10'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Пробелы в темах ({student.topicGaps.filter(g => g.status !== 'mastered').length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'attendance'
                ? 'border-lavender text-lavender font-bold'
                : 'border-transparent text-white/40 hover:text-white hover:border-white/10'
            }`}
          >
            <Calendar className="w-4 h-4" />
            История уроков ({student.lessons.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'payments' 
                ? 'border-mauve-tint text-mauve-tint font-bold' 
                : 'border-transparent text-white/40 hover:text-white hover:border-white/10'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Финансы и абонементы ({student.payments.length})
          </button>
        </div>
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Visual Chart */}
            <div className="bg-gradient-to-br from-blush-mist/[0.04] via-white/[0.02] to-white/[0.01] backdrop-blur-xl p-5 border border-white/10 rounded-2xl shadow-xl">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="font-serif text-white text-base">Кривая результатов</h3>
                  <p className="text-[10px] uppercase text-white/45 tracking-wider mt-0.5">Входной тест пройден на результат {student.mockExams[0]?.score || 0}%</p>
                </div>
                <button
                  type="button"
                  disabled
                  className="bg-white/5 border border-white/10 text-white/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 rounded-xl cursor-not-allowed opacity-50 select-none pointer-events-none"
                  title="Кнопка временно отключена"
                >
                  <Plus className="w-3.5 h-3.5 text-white/20" />
                  Внести пробник
                </button>
              </div>

              <SvgChart 
                points={student.mockExams.map(m => ({
                  id: m.id,
                  label: m.name,
                  value: m.score,
                  maxScore: m.maxScore,
                  notes: m.notes
                }))}
              />
            </div>

            {/* Add Mock Test Result Form Box */}
            {showAddMock && (
              <form onSubmit={handleAddMock} className="bg-gradient-to-br from-purple-950/20 via-white/[0.02] to-white/[0.01] backdrop-blur-xl p-5 border border-white/10 space-y-4 animate-fadeIn rounded-2xl shadow-2xl">
                <h4 className="font-serif text-blush-mist font-semibold text-sm">Добавить результаты пробного экзамена</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Название варианта / Пробного</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Вариант ФИПИ Май ОГЭ"
                      value={newMock.name}
                      onChange={(e) => setNewMock({ ...newMock, name: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Дата проведения</label>
                    <input 
                      type="date"
                      required
                      value={newMock.date}
                      onChange={(e) => setNewMock({ ...newMock, date: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1 font-mono">Набранный балл</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 78"
                      value={newMock.score}
                      onChange={(e) => setNewMock({ ...newMock, score: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none font-mono rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1 font-mono">Максимальный балл</label>
                    <input 
                      type="number"
                      required
                      min="1"
                      placeholder="100"
                      value={newMock.maxScore}
                      onChange={(e) => setNewMock({ ...newMock, maxScore: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none font-mono rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Пробелы / Ошибки</label>
                    <input 
                      type="text"
                      placeholder="e.g. Теория вероятностей, Задача 14"
                      value={newMock.gapsString}
                      onChange={(e) => setNewMock({ ...newMock, gapsString: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Комментарий / Итоги</label>
                  <input 
                    type="text"
                    placeholder="Например: Не успел проверить черновик, ошибки по спешке в вычислениях."
                    value={newMock.notes}
                    onChange={(e) => setNewMock({ ...newMock, notes: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddMock(false)}
                    className="px-4 py-2 border border-white/10 text-[10px] tracking-widest uppercase font-bold text-white/60 hover:bg-white/5 transition rounded-xl"
                  >
                    Отменить
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/30 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[10px] tracking-widest uppercase font-bold transition rounded-xl"
                  >
                    Внести результаты
                  </button>
                </div>
              </form>
            )}

            {/* Unified History Container with Tabs */}
            <div className="bg-gradient-to-br from-[#F4B5CD]/[0.03] via-white/[0.01] to-white/[0.01] backdrop-blur-xl border border-white/10 overflow-hidden rounded-2xl shadow-xl flex flex-col">
              {/* Tab headers */}
              <div className="p-1 border-b border-white/5 flex bg-white/[0.02] gap-1">
                <button
                  type="button"
                  onClick={() => setHistorySubTab('lessons')}
                  className={`flex-1 py-3 text-center text-xs font-semibold uppercase tracking-wider transition rounded-xl cursor-pointer ${
                    historySubTab === 'lessons'
                      ? 'bg-white/5 border border-white/10 text-[#F4B5CD] font-bold shadow-inner'
                      : 'text-white/45 border border-transparent hover:text-white/80'
                  }`}
                >
                  История занятий ({student.lessons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistorySubTab('mocks')}
                  className={`flex-1 py-3 text-center text-xs font-semibold uppercase tracking-wider transition rounded-xl cursor-pointer ${
                    historySubTab === 'mocks'
                      ? 'bg-white/5 border border-white/10 text-[#F4B5CD] font-bold shadow-inner'
                      : 'text-white/45 border border-transparent hover:text-white/80'
                  }`}
                >
                  История пробных работ ({student.mockExams.length})
                </button>
              </div>

              {/* Tab contents */}
              <div className="divide-y divide-white/5 overflow-y-auto max-h-[500px]">
                {historySubTab === 'lessons' ? (
                  student.lessons.length === 0 ? (
                    <div className="p-12 text-center text-white/40 text-xs">
                      Записи занятий отсутствуют. Перейдите во вкладку «Посещаемость и темы», чтобы внести уроки.
                    </div>
                  ) : (
                    [...student.lessons].map((lesson) => (
                      <div key={lesson.id} className="p-5 hover:bg-white/5 space-y-2.5 transition text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-white/70 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-[10px]">
                              {lesson.date} {lesson.time ? `в ${lesson.time}` : ''}
                            </span>
                            <span className={`px-2 py-0.5 text-[8px] uppercase tracking-wider font-bold rounded-lg border ${
                              lesson.status === 'attended' 
                                ? 'bg-lavender/10 text-lavender border border-lavender/15' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {lesson.status === 'attended' ? 'Был' : 'Пропуск/Отмена'}
                            </span>

                            {/* Paid/Unpaid Badge */}
                            <span className={`px-2 py-0.5 text-[8px] uppercase tracking-wider font-bold rounded-lg border ${
                              lesson.isPaid 
                                ? 'bg-lavender/15 text-lavender border border-lavender/25' 
                                : 'bg-rose-500/10 text-rose-350 border border-rose-500/20'
                            }`}>
                              {lesson.isPaid ? 'Оплачено ✓' : 'Ожидает оплаты ⏳'}
                            </span>
                          </div>

                          {/* KTP deviation info as tiny icon or badge */}
                          {lesson.ktpStatus && (
                            <span className={`px-2 py-0.5 text-[8px] uppercase tracking-wider font-bold rounded-lg border ${
                              lesson.ktpStatus === 'caught_up'
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                                : lesson.ktpStatus === 'deviated'
                                  ? 'bg-lavender/15 text-lavender border-lavender/20 font-bold'
                                  : 'bg-white/5 text-white/40 border-white/5'
                            }`}>
                              {lesson.ktpStatus === 'caught_up' 
                                ? 'Догнали программу' 
                                : lesson.ktpStatus === 'deviated' 
                                  ? 'Отстали/Отошли' 
                                  : 'По программе КТП'}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        {lesson.status === 'attended' ? (
                          <div className="space-y-1.5 font-light leading-relaxed">
                            {lesson.summary && (
                              <p className="text-white/80">
                                <strong className="text-white/40 font-medium">Тема урока:</strong> {lesson.summary}
                              </p>
                            )}

                            {lesson.homework && (
                              <p className="text-white/70 pl-2 border-l border-[#F4B5CD]/30">
                                <strong className="text-white/40 font-medium">Домашнее задание:</strong> {lesson.homework}
                                {lesson.homeworkStatus && (
                                  <span className="ml-2 text-[9px] uppercase tracking-wider bg-white/5 text-[#F4B5CD] px-1 py-0.5 rounded font-bold font-mono">
                                    ({lesson.homeworkStatus === 'completed' ? 'Сдано 👍' : lesson.homeworkStatus === 'partially' ? 'Частично' : lesson.homeworkStatus === 'missed' ? 'Не сдано' : 'Ожидает'})
                                  </span>
                                )}
                              </p>
                            )}

                            {/* Student difficulty questions of the day */}
                            {lesson.studentQuestions && (
                              <p className="text-rose-300/90 pl-2 border-l border-rose-400/30">
                                <strong className="text-rose-400/60 font-medium">Вопросы ребенка:</strong> {lesson.studentQuestions}
                              </p>
                            )}

                            {lesson.notes && (
                              <p className="text-white/50 text-xs">
                                <strong className="text-white/40 font-medium font-sans">Заметки:</strong> "{lesson.notes}"
                              </p>
                            )}
                          </div>
                        ) : (
                          lesson.reason && (
                            <p className="text-white/40">
                              Причина пропуска: "{lesson.reason}"
                            </p>
                          )
                        )}
                      </div>
                    ))
                  )
                ) : (
                  student.mockExams.length === 0 ? (
                    <div className="p-12 text-center text-white/40 text-xs">
                      Записи результатов экзаменов отсутствуют.
                    </div>
                  ) : (
                    [...student.mockExams].reverse().map((exam) => {
                      const progressRatio = exam.score / exam.maxScore;
                      return (
                        <div key={exam.id} className="p-5 hover:bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/30 font-mono">{exam.date}</span>
                              <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${
                                progressRatio >= 0.8 
                                  ? 'bg-[#F4B5CD]/10 text-[#F4B5CD] border border-[#F4B5CD]/30' 
                                  : progressRatio >= 0.5 
                                    ? 'bg-lavender/10 text-lavender border border-lavender/20' 
                                    : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                              }`}>
                                {progressRatio >= 0.8 ? 'Высокий' : progressRatio >= 0.5 ? 'Умеренный' : 'Критический'}
                              </span>
                            </div>
                            <h4 className="font-semibold text-white text-sm">{exam.name}</h4>
                            {exam.gaps.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {exam.gaps.map((gap, i) => (
                                  <span key={i} className="text-[9px] bg-rose-500/10 text-rose-300 border border-rose-500/10 px-1.5 py-0.5 rounded font-mono">
                                    {gap}
                                  </span>
                                ))}
                              </div>
                            )}
                            {exam.notes && (
                              <p className="text-xs text-white/50 mt-1">"{exam.notes}"</p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-lg font-mono font-bold text-[#F4B5CD] block">
                              {exam.score}
                              <span className="text-xs text-white/40 font-normal"> / {exam.maxScore}</span>
                            </span>
                            <span className="text-[10px] text-white/45 font-mono">
                              ({Math.round(progressRatio * 100)}%)
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: TOPIC GAPS (Knowledge Matrix) */}
        {activeTab === 'topicGaps' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-white text-sm">Карта знаний и текущие пробелы</h3>
              </div>
              <button
                onClick={() => setShowAddGap(true)}
                className="bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/20 text-[#F4B5CD] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                Новая тема
              </button>
            </div>

            {/* Add Gap Form Box */}
            {showAddGap && (
              <form onSubmit={handleAddGap} className="bg-gradient-to-br from-[#F4B5CD]/[0.08] via-white/[0.02] to-white/[0.01] backdrop-blur-xl p-5 border border-white/10 space-y-4 animate-fadeIn rounded-2xl shadow-xl">
                <h4 className="font-serif text-blush-mist font-semibold text-sm">Зарегистрировать пробел в знаниях</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Название темы / Раздела</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Тригонометрический круг и синусы"
                      value={newGap.title}
                      onChange={(e) => setNewGap({ ...newGap, title: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Приоритет темы</label>
                    <select 
                      value={newGap.severity}
                      onChange={(e) => setNewGap({ ...newGap, severity: e.target.value as TopicGap['severity'] })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-[#1A1A1A] text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    >
                      <option value="high">Высокий (Критичный провал)</option>
                      <option value="medium">Средний (Ошибки под нагрузкой)</option>
                      <option value="low">Низкий (Требуется полировка)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Методические замечания</label>
                  <input 
                    type="text"
                    placeholder="Например: Путает знаки косинуса во второй четверти; нужно прорешать 30 кругов."
                    value={newGap.notes}
                    onChange={(e) => setNewGap({ ...newGap, notes: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddGap(false)}
                    className="px-4 py-2 border border-white/10 text-[10px] tracking-widest uppercase font-bold text-white/60 hover:bg-white/5 transition rounded-xl"
                  >
                    Отменить
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[10px] tracking-widest uppercase font-bold transition rounded-xl"
                  >
                    Создать тему
                  </button>
                </div>
              </form>
            )}

            {/* Quick Gaps Selector from KTP Program */}
            {student.program && student.program.topics && student.program.topics.length > 0 && (
              <div className="bg-[#12131a] border border-white/5 p-4 rounded-xl space-y-2">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#F4B5CD] flex items-center gap-1">
                  ⚡ Быстрое добавление тем из КТП ученика
                </h4>
                <div className="flex flex-wrap gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
                  {student.program.topics.map((t) => {
                    const alreadyGap = student.topicGaps.some(g => g.title.toLowerCase() === t.title.toLowerCase());
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={alreadyGap}
                        onClick={() => handleAddPresetGap(t.title)}
                        className={`text-[11px] font-sans px-2.5 py-1 rounded-lg border transition duration-200 cursor-pointer ${
                          alreadyGap
                            ? 'bg-lavender/10 border-lavender/15 text-lavender/40 line-through cursor-not-allowed'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        {t.title} {alreadyGap && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List of Topic Gaps categorized */}
            <div className="bg-gradient-to-br from-[#F4B5CD]/[0.03] via-white/[0.01] to-white/[0.01] backdrop-blur-xl border border-white/10 overflow-hidden divide-y divide-white/10 rounded-2xl shadow-xl">
              {student.topicGaps.length === 0 ? (
                <div className="p-6 text-center text-white/40 text-xs">
                  На данный момент пробелов не зарегистрировано! Идеальное состояние знаний.
                </div>
              ) : (
                student.topicGaps.map((gap) => (
                  <div key={gap.id} className="p-4 hover:bg-white/5 flex items-center justify-between gap-4 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Priority circle badge */}
                        <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                          gap.severity === 'high' 
                            ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                            : gap.severity === 'medium' 
                              ? 'bg-lavender' 
                              : 'bg-[#F4B5CD]/70'
                        }`} title={`Приоритет: ${gap.severity}`} />

                        <h4 className={`font-semibold text-sm ${
                          gap.status === 'mastered' ? 'text-white/30 line-through' : 'text-white'
                        }`}>
                          {gap.title}
                        </h4>

                        {/* Severity tag */}
                        <span className={`text-[8px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded ${
                          gap.severity === 'high' 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : gap.severity === 'medium' 
                              ? 'bg-lavender/10 text-lavender border border-lavender/20' 
                              : 'bg-[#F4B5CD]/10 text-[#F4B5CD] border border-[#F4B5CD]/20'
                        }`}>
                          {gap.severity === 'high' ? 'критично' : gap.severity === 'medium' ? 'важно' : 'желательно'}
                        </span>
                      </div>

                      {gap.notes && (
                        <p className={`text-xs ${gap.status === 'mastered' ? 'text-white/20' : 'text-white/50'} font-sans`}>
                          {gap.notes}
                        </p>
                      )}

                      {gap.fixedDate && (
                        <p className="text-[10px] text-lavender font-sans flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 inline" /> Усвоено {gap.fixedDate}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Interactive click translation status selector */}
                      <button
                        onClick={() => handleToggleGapStatus(gap.id, gap.status)}
                        className={`text-[9px] uppercase tracking-wider font-bold px-2.5 py-1 transition cursor-pointer select-none border shrink-0 rounded-xl ${
                          gap.status === 'mastered'
                            ? 'bg-lavender/15 text-lavender border-lavender/30'
                            : gap.status === 'learning'
                              ? 'bg-[#F4B5CD]/10 text-[#F4B5CD] border-[#F4B5CD]/30'
                              : 'bg-white/5 text-white/50 border-white/10'
                        }`}
                      >
                        {gap.status === 'mastered' ? '✓ Усвоено' : gap.status === 'learning' ? '⚡ В процессе' : '✍ Новая'}
                      </button>

                      <button 
                        onClick={() => handleDeleteGap(gap.id)}
                        className="text-white/20 hover:text-rose-400 p-2 hover:bg-white/5 transition"
                        title="Удалить тему"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: ATTENDANCE & LESSON SUMMARY */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-white text-sm">Внесение и отчётность занятий</h3>
              </div>
              <button
                onClick={() => setShowAddLesson(true)}
                className="bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/20 text-[#F4B5CD] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                Новый урок
              </button>
            </div>

            {/* Add Lesson Entry form */}
            {showAddLesson && (
              <form onSubmit={handleAddLesson} className="bg-gradient-to-br from-[#F4B5CD]/[0.08] via-white/[0.02] to-white/[0.01] backdrop-blur-xl p-5 border border-white/10 space-y-4 animate-fadeIn rounded-2xl shadow-xl">
                <h4 className="font-serif text-[#F4B5CD] text-sm">Внести новое занятие в журнал</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Дата</label>
                    <input 
                      type="date"
                      required
                      value={newLesson.date}
                      onChange={(e) => setNewLesson({ ...newLesson, date: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1 font-mono">Время</label>
                    <input 
                      type="text"
                      placeholder="e.g. 17:00"
                      value={newLesson.time}
                      onChange={(e) => setNewLesson({ ...newLesson, time: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none font-mono rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Статус проведения</label>
                    <select 
                      value={newLesson.status}
                      onChange={(e) => setNewLesson({ ...newLesson, status: e.target.value as Lesson['status'] })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-[#1A1A1A] text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    >
                      <option value="attended">Был на уроке (Урок состоялся)</option>
                      <option value="missed_excused">Пропуск по ув. причине (Баланс не списывается)</option>
                      <option value="missed_unexcused">Прогул / Без пред. (Списание баланса)</option>
                      <option value="cancelled">Занятие отменено взаимно</option>
                    </select>
                  </div>
                </div>

                {newLesson.status !== 'attended' ? (
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Причина отсутствия</label>
                    <input 
                      type="text"
                      placeholder="Предупредил за 3 часа / Заболел со справкой..."
                      value={newLesson.reason}
                      onChange={(e) => setNewLesson({ ...newLesson, reason: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Что успели пройти (содержание)</label>
                        <textarea 
                          placeholder="Изучили правила, прослушали аудио, записали новые глаголы..."
                          value={newLesson.summary}
                          onChange={(e) => setNewLesson({ ...newLesson, summary: e.target.value })}
                          className="w-full text-xs p-3 border border-white/10 bg-white/5 text-white focus:outline-none focus:border-[#F4B5CD] h-16 resize-none font-sans rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Домашнее задание</label>
                        <textarea 
                          placeholder="Сделать упражнения 1-4 на стр. 11 в сборнике."
                          value={newLesson.homework}
                          onChange={(e) => setNewLesson({ ...newLesson, homework: e.target.value })}
                          className="w-full text-xs p-3 border border-white/10 bg-white/5 text-white focus:outline-none focus:border-[#F4B5CD] h-16 resize-none font-sans rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Статус домашнего задания</label>
                        <select 
                          value={newLesson.homeworkStatus}
                          onChange={(e) => setNewLesson({ ...newLesson, homeworkStatus: e.target.value as Lesson['homeworkStatus'] })}
                          className="w-full text-xs px-3 py-2 border border-white/10 bg-[#1A1A1A] text-white focus:outline-none focus:border-[#F4B5CD] rounded-xl"
                        >
                          <option value="pending">Ожидает проверки</option>
                          <option value="completed">Выполнено идеально</option>
                          <option value="partially">Сделано частично / С ошибками</option>
                          <option value="missed">Не сделано совсем</option>
                        </select>

                        {(newLesson.homeworkStatus === 'partially' || newLesson.homeworkStatus === 'missed') && (
                          <div className="mt-3 animate-fadeIn">
                            <label className="block text-[9px] uppercase tracking-widest font-bold text-[#F4B5CD] mb-1">Причина невыполнения ДЗ</label>
                            <input 
                              type="text"
                              placeholder="Забыл тетрадь, не понял тему, не успел..."
                              value={newLesson.homeworkReason}
                              onChange={(e) => setNewLesson({ ...newLesson, homeworkReason: e.target.value })}
                              className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Памятка / О чём просил ученик к следующему уроку</label>
                        <input 
                          type="text"
                          placeholder="Задать ДЗ полегче, уделить больше внимания стереометрии..."
                          value={newLesson.notes}
                          onChange={(e) => setNewLesson({ ...newLesson, notes: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Программа КТП на уроке</label>
                        <select 
                          value={newLesson.ktpStatus}
                          onChange={(e) => setNewLesson({ ...newLesson, ktpStatus: e.target.value as Lesson['ktpStatus'] })}
                          className="w-full text-xs px-3 py-2 border border-white/10 bg-[#1A1A1A] text-white focus:outline-none focus:border-[#F4B5CD] rounded-xl"
                        >
                          <option value="according">Шли точно по КТП</option>
                          <option value="deviated">Отошли от программы (отставание)</option>
                          <option value="caught_up">Догнали программу (нагнали)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Статус оплаты занятия</label>
                        <select 
                          value={newLesson.isPaid ? "true" : "false"}
                          onChange={(e) => setNewLesson({ ...newLesson, isPaid: e.target.value === "true" })}
                          className="w-full text-xs px-3 py-2 border border-white/10 bg-[#1A1A1A] text-white focus:outline-none focus:border-[#F4B5CD] rounded-xl"
                        >
                          <option value="false">Не оплачено</option>
                          <option value="true">Оплачено</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1 font-sans text-white/70">Какими вопросами/трудностями делился ребенок</label>
                        <input 
                          type="text"
                          placeholder="Сложности с формулой Пика, путает знаки при раскрытии..."
                          value={newLesson.studentQuestions}
                          onChange={(e) => setNewLesson({ ...newLesson, studentQuestions: e.target.value })}
                          className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddLesson(false)}
                    className="px-4 py-2 bg-zinc-900 border border-white/10 text-[10px] tracking-widest uppercase font-bold text-white/60 hover:bg-zinc-800 transition rounded-xl"
                  >
                    Отменить
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[10px] tracking-widest uppercase font-bold transition rounded-xl"
                  >
                    Внести в журнал
                  </button>
                </div>
              </form>
            )}

            {/* List of completed lessons */}
            <div className="bg-gradient-to-br from-[#F4B5CD]/[0.03] via-white/[0.01] to-white/[0.01] backdrop-blur-xl border border-white/10 overflow-hidden rounded-2xl shadow-xl">
              <div className="p-4 border-b border-white/5">
                <h3 className="font-serif text-white text-sm">История проведения занятий</h3>
              </div>
              <div className="divide-y divide-white/5">
                {student.lessons.length === 0 ? (
                  <div className="p-6 text-center text-white/40 text-xs">
                    Занятий еще не зафиксировано.
                  </div>
                ) : (
                  student.lessons.map((lesson) => {
                    return (
                      <div key={lesson.id} className="p-4 hover:bg-white/5 flex flex-col md:flex-row justify-between gap-4 transition text-sm">
                        <div className="space-y-2 md:max-w-2xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-white/70 flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 text-xs select-none rounded-xl">
                              <Calendar className="w-3.5 h-3.5 text-[#F4B5CD] inline" />
                              {lesson.date} {lesson.time && `в ${lesson.time}`}
                            </span>
                            <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold rounded-xl ${
                              lesson.status === 'attended' 
                                ? 'bg-lavender/10 text-lavender border border-lavender/15' 
                                : lesson.status === 'missed_excused'
                                  ? 'bg-white/5 text-white/50 border border-white/10'
                                  : lesson.status === 'missed_unexcused'
                                    ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20'
                                    : 'bg-white/5 text-white/30 border border-white/10'
                            }`}>
                              {lesson.status === 'attended' ? 'Был' : lesson.status === 'missed_excused' ? 'Пропуск ув.' : lesson.status === 'missed_unexcused' ? 'Прогул (списание)' : 'Отмена'}
                            </span>

                            {/* HW State Badge info */}
                            {lesson.status === 'attended' && (lesson.homework || lesson.homeworkStatus) && (
                              <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold rounded-xl ${
                                lesson.homeworkStatus === 'completed'
                                  ? 'bg-lavender/10 text-lavender border border-lavender/15'
                                  : lesson.homeworkStatus === 'partially'
                                    ? 'bg-lavender/10 text-lavender border border-lavender/25'
                                    : lesson.homeworkStatus === 'missed'
                                      ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                                      : 'bg-indigo-500/10 text-indigo-300 border border-indigo-400/20'
                              }`}>
                                ДЗ: {lesson.homeworkStatus === 'completed' ? 'Выполнено' : lesson.homeworkStatus === 'partially' ? 'Частично' : lesson.homeworkStatus === 'missed' ? 'Не сдано' : 'Ожидает'}
                              </span>
                            )}
                          </div>

                          {/* Details breakdown */}
                          {lesson.status === 'attended' ? (
                            <div className="space-y-1.5 pt-1">
                              {lesson.summary && (
                                <p className="text-white/80 leading-relaxed text-xs font-light">
                                  <strong className="text-white/40 font-medium font-sans">Пройдено:</strong> {lesson.summary}
                                </p>
                              )}
                              {lesson.homework && (
                                <p className="text-white/80 leading-relaxed text-xs border-l border-[#F4B5CD]/50 pl-2 font-light">
                                  <strong className="text-[#F4B5CD] font-medium font-sans">ДЗ:</strong> {lesson.homework}
                                </p>
                              )}
                            </div>
                          ) : (
                            lesson.reason && (
                              <p className="text-white/40 text-xs">
                                Причина пропуска: "{lesson.reason}"
                              </p>
                            )
                          )}

                          {/* Quick HW toggle buttons */}
                          {lesson.status === 'attended' && (
                            <div className="flex items-center gap-2 pt-2 font-sans select-none">
                              <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Домашняя работа:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedLessons = student.lessons.map(l => {
                                    if (l.id === lesson.id) {
                                      return { ...l, homeworkStatus: l.homeworkStatus === 'completed' ? 'pending' : 'completed' as const };
                                    }
                                    return l;
                                  });
                                  onUpdateStudent({
                                    ...student,
                                    lessons: updatedLessons
                                  });
                                }}
                                className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-extrabold rounded-lg border transition-all duration-200 cursor-pointer ${
                                  lesson.homeworkStatus === 'completed'
                                    ? 'bg-lavender/10 text-lavender border-lavender/25'
                                    : 'bg-white/[0.02] text-white/30 border-white/5 hover:bg-lavender/10 hover:text-lavender hover:border-lavender/20'
                                }`}
                              >
                                Сделано
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedLessons = student.lessons.map(l => {
                                    if (l.id === lesson.id) {
                                      return { ...l, homeworkStatus: l.homeworkStatus === 'missed' ? 'pending' : 'missed' as const };
                                    }
                                    return l;
                                  });
                                  onUpdateStudent({
                                    ...student,
                                    lessons: updatedLessons
                                  });
                                }}
                                className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-extrabold rounded-lg border transition-all duration-200 cursor-pointer ${
                                  lesson.homeworkStatus === 'missed'
                                    ? 'bg-rose-500/10 text-rose-455 border-rose-500/30'
                                    : 'bg-white/[0.02] text-white/30 border-white/5 hover:bg-rose-500/10 hover:text-rose-350 hover:border-rose-500/20'
                                }`}
                              >
                                Не сделано
                              </button>
                            </div>
                          )}

                          {/* KTP Alignment status */}
                          {lesson.status === 'attended' && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-2.5 font-sans select-none">
                              <span className="text-[9px] text-white/55 uppercase tracking-widest font-bold">Программа КТП:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedLessons = student.lessons.map(l => {
                                    if (l.id === lesson.id) {
                                      return { ...l, ktpStatus: l.ktpStatus === 'according' ? undefined : 'according' as const };
                                    }
                                    return l;
                                  });
                                  onUpdateStudent({
                                    ...student,
                                    lessons: updatedLessons
                                  });
                                }}
                                className={`px-2 py-1 text-[9px] uppercase tracking-wider font-extrabold rounded-lg border transition-all duration-200 cursor-pointer ${
                                  lesson.ktpStatus === 'according'
                                    ? 'bg-lavender/10 text-lavender border-lavender/25'
                                    : 'bg-white/[0.02] text-white/30 border-white/5 hover:bg-lavender/10 hover:text-lavender hover:border-lavender/20'
                                }`}
                              >
                                Идем по КТП
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedLessons = student.lessons.map(l => {
                                    if (l.id === lesson.id) {
                                      return { ...l, ktpStatus: l.ktpStatus === 'deviated' ? undefined : 'deviated' as const };
                                    }
                                    return l;
                                  });
                                  onUpdateStudent({
                                    ...student,
                                    lessons: updatedLessons
                                  });
                                }}
                                className={`px-2 py-1 text-[9px] uppercase tracking-wider font-extrabold rounded-lg border transition-all duration-200 cursor-pointer ${
                                  lesson.ktpStatus === 'deviated'
                                    ? 'bg-[#F4B5CD]/10 text-[#F4B5CD] border-[#F4B5CD]/30'
                                    : 'bg-white/[0.02] text-white/30 border-white/5 hover:bg-[#F4B5CD]/10 hover:text-[#F4B5CD] hover:border-[#F4B5CD]/20'
                                }`}
                              >
                                Отошли от программы
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedLessons = student.lessons.map(l => {
                                    if (l.id === lesson.id) {
                                      return { ...l, ktpStatus: l.ktpStatus === 'caught_up' ? undefined : 'caught_up' as const };
                                    }
                                    return l;
                                  });
                                  onUpdateStudent({
                                    ...student,
                                    lessons: updatedLessons
                                  });
                                }}
                                className={`px-2 py-1 text-[9px] uppercase tracking-wider font-extrabold rounded-lg border transition-all duration-200 cursor-pointer ${
                                  lesson.ktpStatus === 'caught_up'
                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                    : 'bg-white/[0.02] text-white/30 border-white/5 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/20'
                                }`}
                              >
                                Догнали программу
                              </button>
                            </div>
                          )}

                          {/* KTP Mapped Topic Info and toggles on the lesson card */}
                          {(() => {
                            const isAttended = lesson.status === 'attended';
                            const sortedAttended = [...student.lessons]
                              .filter(l => l.status === 'attended')
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            const lessonIndex = sortedAttended.findIndex(l => l.id === lesson.id);
                            const activeTopic = (isAttended && student.program && lessonIndex !== -1 && lessonIndex < student.program.topics.length)
                              ? student.program.topics[lessonIndex]
                              : null;

                            if (!activeTopic) return null;

                            return (
                              <div className="mt-2.5 border-t border-white/5 pt-2 bg-white/[0.01] p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-white/5 max-w-xl">
                                <div>
                                  <span className="text-[10px] text-white/40 block font-sans">Тема по плану КТП (#{lessonIndex + 1}):</span>
                                  <span className={`text-xs font-semibold ${activeTopic.status === 'completed' ? 'text-lavender' : activeTopic.status === 'missed' ? 'text-rose-400' : 'text-white'}`}>
                                    {activeTopic.title}
                                  </span>
                                </div>
                                <div className="flex gap-1.5 shrink-0 select-none">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedTopics = student.program!.topics.map(t => {
                                        if (t.id === activeTopic.id) {
                                          return { ...t, status: t.status === 'completed' ? 'pending' : 'completed' as const };
                                        }
                                        return t;
                                      });
                                      onUpdateStudent({
                                        ...student,
                                        program: {
                                          ...student.program!,
                                          topics: updatedTopics
                                        }
                                      });
                                    }}
                                    className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded border transition cursor-pointer ${
                                      activeTopic.status === 'completed'
                                        ? 'bg-lavender/20 text-lavender border-lavender/30'
                                        : 'bg-white/5 text-white/40 border-white/5 hover:bg-lavender/10 hover:text-lavender hover:border-lavender/20'
                                    }`}
                                  >
                                    Прошли тему
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedTopics = student.program!.topics.map(t => {
                                        if (t.id === activeTopic.id) {
                                          return { ...t, status: t.status === 'missed' ? 'pending' : 'missed' as const };
                                        }
                                        return t;
                                      });
                                      onUpdateStudent({
                                        ...student,
                                        program: {
                                          ...student.program!,
                                          topics: updatedTopics
                                        }
                                      });
                                    }}
                                    className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded border transition cursor-pointer ${
                                      activeTopic.status === 'missed'
                                        ? 'bg-rose-500/20 text-rose-455 border-rose-500/40'
                                        : 'bg-white/5 text-white/40 border-white/5 hover:bg-rose-500/10 hover:text-rose-300'
                                    }`}
                                  >
                                    Не успели
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Notes/Requests Field with inline instant auto-save (No ИИ) */}
                          <div className="mt-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl max-w-xl">
                            <label className="text-[9px] uppercase tracking-wider text-[#F4B5CD] font-bold flex items-center gap-1">
                              <span>💡 Памятка / Пожелания к следующему уроку</span>
                              <span className="text-[8px] text-white/30 font-normal normal-case">(сохраняется сразу)</span>
                            </label>
                            <textarea
                              value={lesson.notes || ''}
                              placeholder="Записать пожелание или просьбу ученика для следующего урока..."
                              onChange={(e) => {
                                const val = e.target.value;
                                const updatedLessons = student.lessons.map(l => {
                                  if (l.id === lesson.id) {
                                    return { ...l, notes: val };
                                  }
                                  return l;
                                });
                                onUpdateStudent({
                                  ...student,
                                  lessons: updatedLessons
                                });
                              }}
                              className="w-full text-xs font-sans px-2.5 py-2 border border-white/5 bg-black/30 text-white placeholder-white/20 focus:outline-none focus:border-[#F4B5CD]/40 h-14 leading-relaxed resize-none rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="self-start md:self-center">
                          <button 
                            onClick={() => handleDeleteLesson(lesson.id, lesson.status)}
                            className="text-white/20 hover:text-rose-400 p-2 hover:bg-white/5 transition"
                            title="Удалить запись о занятии"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: PAYMENTS & ABONEMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-white text-sm">Финансовый учёт и абонементы</h3>
              </div>
              <button
                onClick={() => setShowAddPayment(true)}
                className="bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/20 text-[#F4B5CD] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                Внести платёж
              </button>
            </div>

            {/* Add Payment form */}
            {showAddPayment && (
              <form onSubmit={handleAddPayment} className="bg-gradient-to-br from-[#F4B5CD]/[0.08] via-white/[0.02] to-white/[0.01] backdrop-blur-xl p-5 border border-white/10 space-y-4 animate-fadeIn rounded-2xl shadow-xl">
                <h4 className="font-serif text-[#F4B5CD] text-sm">Зарегистрировать факт оплаты</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1 font-mono">Сумма (₽)</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      placeholder="e.g. 7200"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none font-mono rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1 font-mono">Количество уроков</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      placeholder="4"
                      value={newPayment.lessonsPaid}
                      onChange={(e) => setNewPayment({ ...newPayment, lessonsPaid: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none font-mono rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Способ / Метод</label>
                    <input 
                      type="text" 
                      placeholder="e.g. СБП (Тинькофф)"
                      value={newPayment.method}
                      onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Дата платежа</label>
                    <input 
                      type="date"
                      required
                      value={newPayment.date}
                      onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1">Заметки / Комментарий к оплате</label>
                  <input 
                    type="text"
                    placeholder="Например: Абонемент на вторую половину месяца."
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddPayment(false)}
                    className="px-4 py-2 border border-white/10 text-[10px] tracking-widest uppercase font-bold text-white/60 hover:bg-white/5 transition rounded-xl"
                  >
                    Отменить
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[10px] tracking-widest uppercase font-bold transition rounded-xl"
                  >
                    Подтвердить оплату
                  </button>
                </div>
              </form>
            )}

            {/* List of Payments */}
            <div className="bg-gradient-to-br from-[#F4B5CD]/[0.03] via-white/[0.01] to-white/[0.01] backdrop-blur-xl border border-white/10 overflow-hidden rounded-2xl shadow-xl">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <span className="font-serif text-white text-sm">История приёма платежей</span>
                <span className="text-xs text-white/60">
                  Всего внесено: <strong className="text-[#F4B5CD] font-mono">{student.payments.reduce((sum, current) => sum + current.amount, 0).toLocaleString()} ₽</strong>
                </span>
              </div>
              <div className="divide-y divide-white/5">
                {student.payments.length === 0 ? (
                  <div className="p-6 text-center text-white/40 text-xs">
                    Записи об оплатах отсутствуют.
                  </div>
                ) : (
                  student.payments.map((payment) => {
                    return (
                      <div key={payment.id} className="p-4 hover:bg-white/5 flex items-center justify-between gap-4 transition text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-lavender text-sm">+{payment.amount.toLocaleString()} ₽</span>
                            <span className="text-white/20">•</span>
                            <span className="bg-white/5 text-white/60 font-semibold px-2 py-0.5 rounded-xl border border-white/5 text-[9px] uppercase tracking-wider">
                              {payment.method || 'СБП'}
                            </span>
                            <span className="text-white/20">•</span>
                            <span className="text-[10px] text-white/40 font-mono">{payment.date}</span>
                          </div>
                          <p className="text-white/65 leading-relaxed font-light">
                            Оплачено занятий: <strong className="text-white font-medium">{payment.lessonsPaid} ур.</strong> 
                            {payment.notes && ` (Прим.: ${payment.notes})`}
                          </p>
                        </div>

                        <div>
                          <button 
                            onClick={() => handleDeletePayment(payment.id, payment.lessonsPaid)}
                            className="text-white/25 hover:text-rose-400 p-2 hover:bg-white/5 transition"
                            title="Откатить платёж"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showParentReport && (
        <ParentReportModal 
          student={student} 
          onClose={() => setShowParentReport(false)} 
        />
      )}
    </div>
  );
};
