import React, { useState } from 'react';
import { Student, Lesson, Payment, CalendarReminder } from '../types';
import { Users, Calendar, AlertCircle, TrendingUp, Clock, ShieldAlert, Check, ArrowRight, Trash2, Edit3, PlusCircle, X, ChevronLeft, ChevronRight, Move } from 'lucide-react';

interface DashboardStatsProps {
  students: Student[];
  onSelectStudent: (studentId: string) => void;
  onUpdateStudents: (updatedStudents: Student[]) => void;
  reminders: CalendarReminder[];
  onUpdateReminders: (reminders: CalendarReminder[]) => void;
  onOpenYearCalendar: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  students, 
  onSelectStudent, 
  onUpdateStudents,
  reminders,
  onUpdateReminders,
  onOpenYearCalendar
}) => {
  const activeStudents = students.filter(s => s.isActive);
  const totalStudentsCount = activeStudents.length;

  // Active success toast inside stats if updated
  const [successMsg, setSuccessMsg] = useState('');

  // Active quick editing states
  const [activeAction, setActiveAction] = useState<{
    studentId: string;
    name: string;
    emoji: string;
    subject: string;
    time: string;
    fullSlot: string;
    balance: number;
    isOneTime?: boolean;
    dateStr?: string;
  } | null>(null);

  const [modalHwStatus, setModalHwStatus] = useState<'completed' | 'missed' | 'pending' | 'partially'>('pending');
  const [modalKtpStatus, setModalKtpStatus] = useState<'according' | 'deviated' | 'caught_up'>('according');
  const [modalHwReason, setModalHwReason] = useState<string>('');
  const [modalLessonStatus, setModalLessonStatus] = useState<'attended' | 'cancelled' | 'planned'>('planned');
  const [modalIsPaid, setModalIsPaid] = useState<boolean>(false);
  const [modalGapsIdentified, setModalGapsIdentified] = useState<string>('');
  const [modalCancelReason, setModalCancelReason] = useState<string>('');
  const [modalHomework, setModalHomework] = useState<string>('');

  const lastInitializedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (activeAction) {
      const initKey = `${activeAction.studentId}-${activeAction.dateStr}-${activeAction.time}`;
      if (lastInitializedRef.current === initKey) {
        return; // Already initialized for this active session, don't reset modal fields!
      }
      lastInitializedRef.current = initKey;

      const student = students.find(s => s.id === activeAction.studentId);
      const matchingLesson = student?.lessons.find(l => l.date === activeAction.dateStr && l.time === activeAction.time);
      if (matchingLesson) {
        setModalHwStatus(matchingLesson.homeworkStatus || 'pending');
        setModalKtpStatus(matchingLesson.ktpStatus || 'according');
        setModalHwReason(matchingLesson.homeworkReason || '');
        setModalLessonStatus(
          matchingLesson.status === 'cancelled' 
            ? 'cancelled' 
            : (matchingLesson.status === 'planned' ? 'planned' : 'attended')
        );
        setModalIsPaid(matchingLesson.isPaid === true);
        setModalGapsIdentified(matchingLesson.gapsIdentified || '');
        setModalCancelReason(matchingLesson.reason || '');
        setModalHomework(matchingLesson.homework || '');
      } else {
        setModalHwStatus('pending');
        setModalKtpStatus('according');
        setModalHwReason('');
        setModalLessonStatus('planned');
        setModalIsPaid(false);
        setModalGapsIdentified('');
        setModalCancelReason('');
        setModalHomework('');
      }
    } else {
      lastInitializedRef.current = null;
    }
  }, [activeAction, students]);

  const [customTimeInput, setCustomTimeInput] = useState('');

  // Free Slots Modal state
  const [showFreeSlotsModal, setShowFreeSlotsModal] = useState(false);

  const [slotDuration, setSlotDuration] = useState<number>(60);
  const tutorTimezone = 5; // Always UTC+5 (МСК+2) for the teacher
  const [studentTimezone, setStudentTimezone] = useState<number>(3); // UTC+3 (МСК)
  const [selectedDaysForFreeSlots, setSelectedDaysForFreeSlots] = useState<string[]>(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
  const [workingHoursRange, setWorkingHoursRange] = useState<{ start: string, end: string }>({ start: '09:00', end: '21:00' });
  const [copiedFreeSlots, setCopiedFreeSlots] = useState(false);

  // Selected week offset (0 for current week, 1 for next week)
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);

  // Drag and drop states
  const [draggedSlotInfo, setDraggedSlotInfo] = useState<{
    studentId: string;
    slotStr: string;
    isOneTime: boolean;
  } | null>(null);

  const [dragOverInfo, setDragOverInfo] = useState<{
    day: string;
    time: string;
  } | null>(null);

  // Modal confirm state
  const [dropConfirmState, setDropConfirmState] = useState<{
    studentId: string;
    studentName: string;
    studentEmoji: string;
    originalSlot: string;
    newDay: string;
    newTime: string;
    newDateStr: string;
  } | null>(null);

  const [rescheduleType, setRescheduleType] = useState<'one-time' | 'permanent'>('one-time');
  const [durationChoice, setDurationChoice] = useState<number>(60);

  const [newLessonModalState, setNewLessonModalState] = useState<{
    day: string;
    time: string;
    dateStr: string;
    studentId: string;
    duration: number;
    isOneTime: boolean;
  } | null>(null);

  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Helper to get week dates dynamically based on current time and offset
  const getWeekDates = (offset: number) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday ...
    
    // Distance to Monday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + distanceToMonday + offset * 7);

    const dates: string[] = [];
    const labelDates: string[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      labelDates.push(`${dd}.${mm}`);
    }

    return { dates, labelDates };
  };

  const { dates: weekDates, labelDates: weekLabels } = getWeekDates(selectedWeekOffset);

  const parseSlot = (slotStr: string) => {
    const parts = slotStr.trim().split(/\s+/);
    const day = parts[0] || 'Пн';
    const timePart = parts[1] || '12:00';
    
    // Extract clean HH:MM from timePart, e.g. "16:30"
    const timeMatch = timePart.match(/(\d{2}:\d{2})/);
    const time = timeMatch ? timeMatch[1] : '12:00';
    
    let duration = 60;
    if (slotStr.includes('90') || slotStr.includes('1.5') || slotStr.includes('1,5')) {
      duration = 90;
    }
    return { day, time, duration };
  };

  const formatSlot = (day: string, time: string, duration: number) => {
    return `${day} ${time} (${duration} мин)`;
  };

  const getWeekdayDateInSameWeek = (lessonDateStr: string, targetRuWeekday: string): string => {
    const ruDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const targetDayIndex = ruDays.indexOf(targetRuWeekday);
    if (targetDayIndex === -1) return '';
    
    const lessonDate = new Date(lessonDateStr);
    const lessonDayIndex = lessonDate.getDay(); // 0-6
    
    // Calculate difference in days
    const diff = targetDayIndex - lessonDayIndex;
    const targetDate = new Date(lessonDate);
    targetDate.setDate(lessonDate.getDate() + diff);
    
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseTimeToFloat = (timeStr: string): number => {
    const parts = timeStr.trim().split(':');
    const h = parseInt(parts[0], 10) || 8;
    const m = parseInt(parts[1], 10) || 0;
    return h + m / 60;
  };

  const getWeekRangeLabel = (offset: number) => {
    const { dates } = getWeekDates(offset);
    const start = new Date(dates[0]);
    const end = new Date(dates[6]);
    
    const months = [
      'янв', 'фев', 'мар', 'апр', 'май', 'июн',
      'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ];
    
    const startDay = start.getDate();
    const startMonth = months[start.getMonth()];
    const endDay = end.getDate();
    const endMonth = months[end.getMonth()];
    
    return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  };

  // Total lessons held across all history
  const totalLessonsHeld = students.reduce(
    (sum, current) => sum + current.lessons.filter(l => l.status === 'attended').length, 
    0
  );

  // Helper to calculate expected and real earnings for current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  
  const monthNamesAccusative = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ];
  
  const currentMonthLabel = monthNamesAccusative[currentMonthIdx];

  // Timezone-safe month/year parser to prevent offset mismatches (e.g. UTC-3 shifts June 1st to May 31st)
  const getYearAndMonth = (dateStr: string) => {
    if (!dateStr) return { year: 0, month: -1 };
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1; // months are 0-indexed in JS Dates
      if (!isNaN(y) && !isNaN(m)) {
        return { year: y, month: m };
      }
    }
    const pDate = new Date(dateStr);
    return { year: pDate.getFullYear(), month: pDate.getMonth() };
  };

  // Real earnings this month: payments received in current month
  const realEarningsThisMonth = students.reduce((sum, s) => {
    const studentPaymentsThisMonth = s.payments.filter(p => {
      const { year, month } = getYearAndMonth(p.date);
      return year === currentYear && month === currentMonthIdx;
    });
    return sum + studentPaymentsThisMonth.reduce((acc, p) => acc + p.amount, 0);
  }, 0);

  // Expected earnings this month based on schedule
  const dayMap: { [key: string]: number } = {
    'Пн': 1, 'Вт': 2, 'Ср': 3, 'Чт': 4, 'Пт': 5, 'Сб': 6, 'Вс': 0
  };

  const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonthIdx + 1, 0);

  const expectedEarningsThisMonth = students.reduce((sum, student) => {
    if (!student.isActive) return sum;
    
    // Parse scheduled weekdays
    const scheduleDays = student.schedule.map(slot => {
      const dayText = slot.trim().substring(0, 2);
      return dayMap[dayText] !== undefined ? dayMap[dayText] : -1;
    }).filter(dayNum => dayNum !== -1);
    
    let startDay = 1;
    if (student.createdAt) {
      const { year: createdYear, month: createdMonth } = getYearAndMonth(student.createdAt);
      
      // If student is created in a future month, they contribute 0 to this month's expected earnings
      if (createdYear > currentYear || (createdYear === currentYear && createdMonth > currentMonthIdx)) {
        return sum;
      }
      
      // If student is created in the current month/year, start from the creation day
      if (createdYear === currentYear && createdMonth === currentMonthIdx) {
        const parts = student.createdAt.split('-');
        if (parts.length >= 3) {
          const dayPart = parseInt(parts[2], 10);
          if (!isNaN(dayPart)) {
            startDay = dayPart;
          }
        }
      }
    }
    
    // Count occurrences of scheduled days in current month from startDay
    let occurrences = 0;
    for (let day = startDay; day <= lastDayOfMonth.getDate(); day++) {
      const d = new Date(currentYear, currentMonthIdx, day);
      if (scheduleDays.includes(d.getDay())) {
        occurrences++;
      }
    }
    
    // Find any cancelled lessons for this student in the current month
    const cancelledCount = student.lessons.filter(l => {
      if (l.status !== 'cancelled') return false;
      const { year, month } = getYearAndMonth(l.date);
      return year === currentYear && month === currentMonthIdx;
    }).length;
    
    const netOccurrences = Math.max(0, occurrences - cancelledCount);
    
    return sum + (netOccurrences * student.hourlyRate);
  }, 0);

  // Unpaid balance alerts (students which have negative balanceLessons or unpaid completed lessons)
  const debtStudents = students.filter(s => s.isActive && (s.balanceLessons < 0 || s.lessons.some(l => (l.status === 'attended' || l.status === 'missed_unexcused') && !l.isPaid)));
  const debtCount = debtStudents.length;

  // Calculate total unpaid debt in rubles across all active students (based on negative lesson balances)
  const totalDebtRubles = students.reduce((sum, s) => {
    if (!s.isActive) return sum;
    const debtLessons = s.balanceLessons < 0 ? -s.balanceLessons : 0;
    return sum + (debtLessons * s.hourlyRate);
  }, 0);

  // Average trial score across all students
  let totalMockExamsCount = 0;
  let totalMockScoresPercentage = 0;
  students.forEach(s => {
    s.mockExams.forEach(m => {
      totalMockExamsCount++;
      totalMockScoresPercentage += (m.score / m.maxScore);
    });
  });

  const averageExamPerformancePercent = totalMockExamsCount > 0 
    ? Math.round((totalMockScoresPercentage / totalMockExamsCount) * 100) 
    : 0;

  // Create schedule planner weekly timetable indexer
  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  // Group students by scheduled days supporting BOTH permanent and one-time slots
  const scheduleTimetable = daysOfWeek.map((day, dayIdx) => {
    const todayDateStr = weekDates[dayIdx];
    const dayLessons: Array<{
      id: string;
      name: string;
      emoji: string;
      subject: string;
      time: string;
      duration: number;
      fullSlot: string;
      balance: number;
      isOneTime: boolean;
      originalSlot?: string;
      dateStr?: string;
    }> = [];

    students.forEach(s => {
      if (!s.isActive) return;

      // 1. Check one-time reschedules targeting today's date
      s.oneTimeReschedules?.forEach(r => {
        if (r.date === todayDateStr) {
          const parsed = parseSlot(r.newSlot);
          dayLessons.push({
            id: s.id,
            name: s.name,
            emoji: s.emoji,
            subject: s.subject,
            time: parsed.time,
            duration: parsed.duration,
            fullSlot: r.newSlot,
            balance: s.balanceLessons,
            isOneTime: true,
            originalSlot: r.originalSlot,
            dateStr: todayDateStr
          });
        }
      });

      // 2. Check permanent schedule slots
      s.schedule.forEach(slotStr => {
        const parsed = parseSlot(slotStr);
        if (parsed.day === day) {
          // Verify if rescheduled away for today's date
          const isRescheduledAway = s.oneTimeReschedules?.some(
            r => {
              if (!r.originalSlot) return false;
              const origParsed = parseSlot(r.originalSlot);
              const origDate = getWeekdayDateInSameWeek(r.date, origParsed.day);
              return origDate === todayDateStr && origParsed.time === parsed.time;
            }
          );

          if (!isRescheduledAway) {
            dayLessons.push({
              id: s.id,
              name: s.name,
              emoji: s.emoji,
              subject: s.subject,
              time: parsed.time,
              duration: parsed.duration,
              fullSlot: slotStr,
              balance: s.balanceLessons,
              isOneTime: false,
              dateStr: todayDateStr
            });
          }
        }
      });
    });

    // Sort by time
    dayLessons.sort((a, b) => a.time.localeCompare(b.time));

    return {
      day,
      dateLabel: weekLabels[dayIdx],
      dateStr: todayDateStr,
      lessons: dayLessons
    };
  });

  const getGeneratedFreeSlotsText = () => {
    const tzDiff = studentTimezone - tutorTimezone;
    let tzLabel = 'МСК';
    if (studentTimezone === 5) tzLabel = 'ЕКБ (МСК+2)';
    else if (studentTimezone === 3) tzLabel = 'МСК';
    else if (studentTimezone > 3) tzLabel = `МСК+${studentTimezone - 3}`;
    else if (studentTimezone < 3) tzLabel = `МСК-${3 - studentTimezone}`;
    
    const weekLabel = selectedWeekOffset === 0 ? 'эту неделю' : 'следующую неделю';
    const lines = [
      `Вот свободные окошки на ${weekLabel} (время по ${tzLabel}):`,
      ''
    ];

    const sortedDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    let anySlotsFound = false;

    sortedDays.forEach(dayName => {
      if (!selectedDaysForFreeSlots.includes(dayName)) return;

      const dayData = scheduleTimetable.find(d => d.day === dayName);
      if (!dayData) return;

      const [startH, startM] = workingHoursRange.start.split(':').map(Number);
      const [endH, endM] = workingHoursRange.end.split(':').map(Number);
      
      const workStartMin = startH * 60 + (startM || 0);
      const workEndMin = endH * 60 + (endM || 0);

      // Find busy intervals
      const busyIntervals: Array<{ start: number, end: number }> = [];
      dayData.lessons.forEach(l => {
        // Even if cancelled, we usually treat the slot as busy to avoid overlap or because it is a fixed day
        // but wait, if the lesson is cancelled, we might still treat it as busy under the same rules
        const [lh, lm] = l.time.split(':').map(Number);
        const lStart = lh * 60 + lm;
        const lEnd = lStart + l.duration;
        busyIntervals.push({ start: lStart, end: lEnd });
      });

      // Sort
      busyIntervals.sort((a, b) => a.start - b.start);

      // Find free blocks
      const freeSegments: Array<{ start: number, end: number }> = [];
      let currentMarker = workStartMin;

      while (currentMarker < workEndMin) {
        const activeBusy = busyIntervals.find(b => b.start < workEndMin && b.end > currentMarker);

        if (activeBusy) {
          if (activeBusy.start > currentMarker) {
            if (activeBusy.start - currentMarker >= slotDuration) {
              freeSegments.push({ start: currentMarker, end: activeBusy.start });
            }
          }
          currentMarker = Math.max(currentMarker + 30, activeBusy.end);
        } else {
          if (workEndMin - currentMarker >= slotDuration) {
            freeSegments.push({ start: currentMarker, end: workEndMin });
          }
          break;
        }
      }

      const dateLabel = dayData.dateLabel;

      if (freeSegments.length > 0) {
        const formatTzTime = (min: number): string => {
          let mins = min;
          let h = Math.floor(mins / 60);
          let m = mins % 60;
          h += tzDiff;
          
          let daySuffix = '';
          if (h < 0) {
            h = (h + 24) % 24;
            daySuffix = ' (пред. день)';
          } else if (h >= 24) {
            h = h % 24;
            daySuffix = ' (след. день)';
          }
          
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${daySuffix}`;
        };

        const discreteSlots: string[] = [];
        freeSegments.forEach(seg => {
          let start = seg.start;
          while (start + slotDuration <= seg.end) {
            const slotStart = start;
            const slotEnd = start + slotDuration;
            discreteSlots.push(`${formatTzTime(slotStart)}-${formatTzTime(slotEnd)}`);
            start += slotDuration; // Offer sequential non-overlapping chunks
          }
        });
        
        if (discreteSlots.length > 0) {
          lines.push(`• ${dayName} (${dateLabel}): ${discreteSlots.join(', ')}`);
          anySlotsFound = true;
        } else {
          lines.push(`• ${dayName} (${dateLabel}): нет свободного времени`);
        }
      } else {
        lines.push(`• ${dayName} (${dateLabel}): нет свободного времени`);
      }
    });

    if (!anySlotsFound) {
      lines.push('Ой! Кажется, нет ни одного свободного окошка в указанные часы.');
    }

    return lines.join('\n');
  };

  // Unified Action Save Method
  const handleSaveLessonModal = (
    studentId: string,
    time: string,
    dateStr: string,
    status: 'attended' | 'cancelled' | 'planned',
    isPaid: boolean,
    homeworkStatus: 'completed' | 'partially' | 'missed' | 'pending',
    homeworkReason: string,
    ktpStatus: 'according' | 'deviated' | 'caught_up',
    gapsIdentified: string,
    cancelReason: string,
    homework: string
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    const updated = students.map(s => {
      if (s.id === studentId) {
        const existingIdx = s.lessons.findIndex(l => l.date === targetDate && l.time === time);
        let newLessons = [...s.lessons];

        if (existingIdx > -1) {
          newLessons[existingIdx] = {
            ...newLessons[existingIdx],
            status,
            isPaid,
            homeworkStatus: (status === 'attended' || status === 'planned') ? homeworkStatus : 'pending',
            homeworkReason: (status === 'attended' || status === 'planned') && (homeworkStatus === 'missed' || homeworkStatus === 'partially') ? homeworkReason : '',
            ktpStatus: (status === 'attended' || status === 'planned') ? ktpStatus : 'according',
            gapsIdentified: (status === 'attended' || status === 'planned') ? gapsIdentified : '',
            reason: status === 'cancelled' ? cancelReason : '',
            homework: (status === 'attended' || status === 'planned') ? homework : ''
          };
        } else {
          const newLesson: Lesson = {
            id: 'les-fast-' + Date.now(),
            date: targetDate,
            time: time,
            status,
            isPaid,
            summary: status === 'attended' ? 'Урок проведен' : (status === 'planned' ? 'Урок запланирован' : 'Урок отменен'),
            homeworkStatus: (status === 'attended' || status === 'planned') ? homeworkStatus : 'pending',
            homeworkReason: (status === 'attended' || status === 'planned') && (homeworkStatus === 'missed' || homeworkStatus === 'partially') ? homeworkReason : '',
            ktpStatus: (status === 'attended' || status === 'planned') ? ktpStatus : 'according',
            gapsIdentified: (status === 'attended' || status === 'planned') ? gapsIdentified : '',
            reason: status === 'cancelled' ? cancelReason : '',
            homework: (status === 'attended' || status === 'planned') ? homework : ''
          };
          newLessons = [newLesson, ...newLessons];
        }

        // AUTO SYNC IDENTIFIED GAPS TO STUDENT'S topicGaps LIST
        let currentGaps = [...(s.topicGaps || [])];
        if ((status === 'attended' || status === 'planned') && gapsIdentified.trim()) {
          const parts = gapsIdentified
            .split(/[,\n;]+/)
            .map(p => p.trim())
            .filter(p => p.length > 0);
          
          parts.forEach((part, i) => {
            const exists = currentGaps.some(g => g.title.toLowerCase() === part.toLowerCase());
            if (!exists) {
              currentGaps.push({
                id: 'gap-auto-' + Date.now() + '-' + i,
                title: part,
                severity: 'medium',
                status: 'new',
                notes: `Выявлен на уроке от ${targetDate}`
              });
            }
          });
        }

        return {
          ...s,
          lessons: newLessons,
          topicGaps: currentGaps
        };
      }
      return s;
    });

    onUpdateStudents(updated);
    setSuccessMsg(`Данные урока у ${student.name} успешно сохранены!`);
    setTimeout(() => setSuccessMsg(''), 2550);
    setActiveAction(null);
  };

  const handleTogglePaymentDirect = (studentId: string, time: string, dateStr: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const updated = students.map(s => {
      if (s.id === studentId) {
        const existingIdx = s.lessons.findIndex(l => l.date === targetDate && l.time === time);
        let newLessons = [...s.lessons];

        if (existingIdx > -1) {
          newLessons[existingIdx] = {
            ...newLessons[existingIdx],
            isPaid: !newLessons[existingIdx].isPaid
          };
        } else {
          // If no lesson entry exists yet, create a planned lesson marked as paid
          const newLesson: Lesson = {
            id: 'les-fast-' + Date.now(),
            date: targetDate,
            time: time,
            status: 'planned',
            isPaid: true,
            summary: 'Урок запланирован',
            homeworkStatus: 'pending',
            ktpStatus: 'according',
            gapsIdentified: ''
          };
          newLessons = [newLesson, ...newLessons];
        }

        return {
          ...s,
          lessons: newLessons
        };
      }
      return s;
    });

    onUpdateStudents(updated);
    setSuccessMsg(`Статус оплаты для ${student.name} обновлен!`);
    setTimeout(() => setSuccessMsg(''), 1500);
  };

  const handleToggleStatusDirect = (studentId: string, time: string, dateStr: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const updated = students.map(s => {
      if (s.id === studentId) {
        const existingIdx = s.lessons.findIndex(l => l.date === targetDate && l.time === time);
        let newLessons = [...s.lessons];

        if (existingIdx > -1) {
          const nextStatus = newLessons[existingIdx].status === 'attended' ? 'cancelled' : 'attended';
          newLessons[existingIdx] = {
            ...newLessons[existingIdx],
            status: nextStatus as any,
            reason: nextStatus === 'cancelled' ? 'Отменено преподавателем' : '',
            summary: nextStatus === 'attended' ? 'Урок проведен' : 'Урок отменен'
          };
        } else {
          const newLesson: Lesson = {
            id: 'les-fast-' + Date.now(),
            date: targetDate,
            time: time,
            status: 'cancelled',
            isPaid: false,
            summary: 'Урок отменен',
            homeworkStatus: 'pending',
            ktpStatus: 'according',
            gapsIdentified: '',
            reason: 'Отменено преподавателем'
          };
          newLessons = [newLesson, ...newLessons];
        }

        return {
          ...s,
          lessons: newLessons
        };
      }
      return s;
    });

    onUpdateStudents(updated);
    setSuccessMsg(`Статус проведения урока для ${student.name} изменен!`);
    setTimeout(() => setSuccessMsg(''), 1500);
  };

  const handleCreateNewLessonInGrid = () => {
    if (!newLessonModalState) return;
    const { studentId, day, time, duration, isOneTime, dateStr } = newLessonModalState;
    
    if (!studentId) {
      alert('Пожалуйста, выберите ученика!');
      return;
    }
    
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    // Check if time is in format HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time.trim())) {
      alert('Введите корректное время в формате ЧЧ:ММ!');
      return;
    }
    
    const formattedSlot = formatSlot(day, time.trim(), duration);
    
    const updated = students.map(s => {
      if (s.id !== studentId) return s;
      
      if (isOneTime) {
        const oneTimeReschedules = s.oneTimeReschedules ? [...s.oneTimeReschedules] : [];
        const newResch = {
          id: 'resch-new-' + Date.now(),
          originalSlot: '',
          newSlot: formattedSlot,
          date: dateStr
        };
        oneTimeReschedules.push(newResch);
        return {
          ...s,
          oneTimeReschedules
        };
      } else {
        const schedule = [...s.schedule, formattedSlot];
        return {
          ...s,
          schedule
        };
      }
    });
    
    onUpdateStudents(updated);
    setSuccessMsg(isOneTime ? `Разовый урок добавлен на ${day} ${time}!` : `Регулярный урок (${day} ${time}) добавлен в сетку!`);
    setTimeout(() => setSuccessMsg(''), 2500);
    setNewLessonModalState(null);
  };

  const handleQuickPayment = (studentId: string, count: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const cost = student.hourlyRate * count;
    const payment: Payment = {
      id: 'pay-fast-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      amount: cost,
      lessonsPaid: count,
      notes: `Быстрое пополнение (+${count} зан.)`,
      method: 'СБП'
    };

    const updated = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          balanceLessons: s.balanceLessons + count,
          payments: [payment, ...s.payments]
        };
      }
      return s;
    });

    onUpdateStudents(updated);
    setSuccessMsg(`Баланс пополнен на +${count} занятий для ${student.emoji} ${student.name.split(' ')[0]}!`);
    setTimeout(() => setSuccessMsg(''), 2500);
    setActiveAction(null);
  };

  const handleMoveSlotDay = (studentId: string, oldSlot: string, newDay: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const parsed = parseSlot(oldSlot);
    const newSlot = formatSlot(newDay, parsed.time, parsed.duration);

    const updated = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          schedule: s.schedule.map(slot => {
            const parsedSlot = parseSlot(slot);
            if (parsedSlot.day === parsed.day && parsedSlot.time === parsed.time) {
              return newSlot;
            }
            return slot;
          })
        };
      }
      return s;
    });

    onUpdateStudents(updated);
    setSuccessMsg(`Урок перенесен на ${newSlot}!`);
    setTimeout(() => setSuccessMsg(''), 2500);
    setActiveAction(null);
  };

  const handleUpdateTime = (studentId: string, oldSlot: string, newTime: string) => {
    if (!newTime.trim()) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const parsed = parseSlot(oldSlot);
    const newSlot = formatSlot(parsed.day, newTime.trim(), parsed.duration);

    const updated = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          schedule: s.schedule.map(slot => {
            const parsedSlot = parseSlot(slot);
            if (parsedSlot.day === parsed.day && parsedSlot.time === parsed.time) {
              return newSlot;
            }
            return slot;
          })
        };
      }
      return s;
    });

    onUpdateStudents(updated);
    setSuccessMsg(`Время урока успешно изменено на ${newSlot}!`);
    setTimeout(() => setSuccessMsg(''), 2500);
    setCustomTimeInput('');
    setActiveAction(null);
  };

  const handleDeleteSlot = (studentId: string, slotStr: string, currentIsOneTime: boolean = false) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const confirmMsg = currentIsOneTime 
      ? `Вы уверены, что хотите отменить этот разовый перенос для ${student.name}? Восстановится обычный слот.`
      : `Вы уверены, что хотите удалить слот "${slotStr}" из расписания ${student.name}?`;

    setCustomConfirm({
      title: currentIsOneTime ? 'Отмена переноса' : 'Удаление слота',
      message: confirmMsg,
      onConfirm: () => {
        const updated = students.map(s => {
           if (s.id === studentId) {
             if (currentIsOneTime) {
               return {
                 ...s,
                 oneTimeReschedules: s.oneTimeReschedules?.filter(r => r.newSlot !== slotStr) || []
               };
             } else {
               return {
                 ...s,
                 schedule: s.schedule.filter(slot => {
                   const slotParsed = parseSlot(slot);
                   const targetParsed = parseSlot(slotStr);
                   return !(slotParsed.day === targetParsed.day && slotParsed.time === targetParsed.time);
                 })
               };
             }
           }
           return s;
        });

        onUpdateStudents(updated);
        setSuccessMsg(currentIsOneTime ? `Разовый перенос отменен.` : `Слот удален.`);
        setTimeout(() => setSuccessMsg(''), 2500);
        setActiveAction(null);
        setCustomConfirm(null);
      }
    });
  };

  const handleDeleteLessonCompletely = (studentId: string, time: string, dateStr: string, isOneTime: boolean, fullSlot: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    setCustomConfirm({
      title: 'Удаление урока',
      message: `Вы уверены, что хотите полностью удалить этот урок у ${student.name} (${dateStr} в ${time})? Он будет удален из сетки расписания и истории занятий.`,
      onConfirm: () => {
        const updated = students.map(s => {
          if (s.id === studentId) {
            const lessonToDelete = s.lessons.find(l => l.date === dateStr && l.time === time);
            let refundBalance = 0;
            if (lessonToDelete && (lessonToDelete.status === 'attended' || lessonToDelete.status === 'missed_unexcused')) {
              refundBalance = 1;
            }
            const filteredLessons = s.lessons.filter(l => !(l.date === dateStr && l.time === time));

            let updatedSchedule = s.schedule;
            let updatedOneTimeReschedules = s.oneTimeReschedules || [];

            if (isOneTime) {
              updatedOneTimeReschedules = updatedOneTimeReschedules.filter(r => !(r.date === dateStr && parseSlot(r.newSlot).time === time));
            } else {
              updatedSchedule = s.schedule.filter(slot => {
                const slotParsed = parseSlot(slot);
                const targetParsed = parseSlot(fullSlot);
                return !(slotParsed.day === targetParsed.day && slotParsed.time === targetParsed.time);
              });
            }

            return {
              ...s,
              lessons: filteredLessons,
              schedule: updatedSchedule,
              oneTimeReschedules: updatedOneTimeReschedules,
              balanceLessons: s.balanceLessons + refundBalance
            };
          }
          return s;
        });

        onUpdateStudents(updated);
        setSuccessMsg(`Урок полностью удален.`);
        setTimeout(() => setSuccessMsg(''), 2500);
        setActiveAction(null);
        setCustomConfirm(null);
      }
    });
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, studentId: string, slotStr: string, isOneTime: boolean) => {
    setDraggedSlotInfo({ studentId, slotStr, isOneTime });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverForDay = (e: React.DragEvent, day: string) => {
    e.preventDefault();
    if (!draggedSlotInfo) return;

    // Calculate mouse coordinates relative to the day grid column
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const offsetPercentage = relativeY / rect.height;

    // Map 0-1 percentage to 14 hour range (8:00 to 22:00)
    const hourFloat = 8 + offsetPercentage * 14;

    // Round to nearest 30 mins
    const totalMinutes = Math.round((hourFloat * 60) / 30) * 30;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    // Keep times in range 08:00 to 21:30 (ending by 22:00)
    const finalH = Math.min(Math.max(h, 8), 21);
    const finalM = finalH === 21 ? 0 : m;

    const newTimeStr = `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;

    if (!dragOverInfo || dragOverInfo.day !== day || dragOverInfo.time !== newTimeStr) {
      setDragOverInfo({ day, time: newTimeStr });
    }
  };

  const handleDragLeave = () => {
    setDragOverInfo(null);
  };

  const handleDragEnd = () => {
    setDraggedSlotInfo(null);
    setDragOverInfo(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: string, targetDateStr: string) => {
    e.preventDefault();
    if (!draggedSlotInfo) return;

    // Calculate mouse coordinates relative to the day grid column
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const offsetPercentage = relativeY / rect.height;

    // Map 0-1 percentage to 14 hour range (8:00 to 22:00)
    const hourFloat = 8 + offsetPercentage * 14;

    // Round to nearest 30 mins
    const totalMinutes = Math.round((hourFloat * 60) / 30) * 30;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    // Keep times in range 08:00 to 21:30 (ending by 22:00)
    const finalH = Math.min(Math.max(h, 8), 21);
    const finalM = finalH === 21 ? 0 : m;

    const newTimeStr = `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;

    const student = students.find(s => s.id === draggedSlotInfo.studentId);
    if (!student) return;

    const parsedOrig = parseSlot(draggedSlotInfo.slotStr);

    setDurationChoice(parsedOrig.duration);
    setRescheduleType(draggedSlotInfo.isOneTime ? 'one-time' : 'permanent');

    setDropConfirmState({
      studentId: student.id,
      studentName: student.name,
      studentEmoji: student.emoji,
      originalSlot: draggedSlotInfo.slotStr,
      newDay: targetDay,
      newTime: newTimeStr,
      newDateStr: targetDateStr
    });

    setDraggedSlotInfo(null);
    setDragOverInfo(null);
  };

  const handleSaveReschedule = (
    studentId: string,
    originalSlot: string,
    newDay: string,
    newTime: string,
    type: 'one-time' | 'permanent',
    duration: number,
    targetDateStr: string
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const formattedNewSlot = formatSlot(newDay, newTime, duration);

    const updated = students.map(s => {
      if (s.id !== studentId) return s;

      let schedule = [...s.schedule];
      let oneTimeReschedules = s.oneTimeReschedules ? [...s.oneTimeReschedules] : [];

      if (type === 'permanent') {
        const parsedOrig = parseSlot(originalSlot);
        // Look up and replace the old permanent slot in the schedule
        let found = false;
        schedule = schedule.map(slot => {
          const parsedSlot = parseSlot(slot);
          if (parsedSlot.day === parsedOrig.day && parsedSlot.time === parsedOrig.time) {
            found = true;
            return formattedNewSlot;
          }
          return slot;
        });

        // If it was not found (maybe they dragged a one-time slot originally), append it!
        if (!found) {
          schedule.push(formattedNewSlot);
        }

        // Clean up old override if dragging from a one-time slot
        oneTimeReschedules = oneTimeReschedules.filter(r => r.newSlot !== originalSlot);
      } else {
        // One-time override on this specific week date
        const newResch = {
          id: 'resch-' + Date.now(),
          originalSlot: originalSlot,
          newSlot: formattedNewSlot,
          date: targetDateStr
        };
        oneTimeReschedules.push(newResch);
      }

      return {
        ...s,
        schedule,
        oneTimeReschedules
      };
    });

    onUpdateStudents(updated);
    setSuccessMsg(type === 'permanent' ? 'Расписание изменено на постоянной основе!' : `Перенесено разово на ${newDay} ${newTime}!`);
    setTimeout(() => setSuccessMsg(''), 2500);
    setDropConfirmState(null);
    setActiveAction(null);
  };

  const handleChangeDuration = (studentId: string, slotStr: string, currentIsOneTime: boolean, newDuration: number) => {
    const parsed = parseSlot(slotStr);
    const formattedSlot = formatSlot(parsed.day, parsed.time, newDuration);

    const updated = students.map(s => {
      if (s.id !== studentId) return s;

      if (currentIsOneTime) {
        // One-time reschedule
        const oneTimeReschedules = s.oneTimeReschedules?.map(r => {
          if (r.newSlot === slotStr) {
            return {
              ...r,
              newSlot: formattedSlot
            };
          }
          return r;
        }) || [];
        return { ...s, oneTimeReschedules };
      } else {
        // Permanent schedule
        const schedule = s.schedule.map(slot => {
          const slotParsed = parseSlot(slot);
          if (slotParsed.day === parsed.day && slotParsed.time === parsed.time) {
            return formattedSlot;
          }
          return slot;
        });
        return { ...s, schedule };
      }
    });

    onUpdateStudents(updated);
    setSuccessMsg(`Длительность изменена на ${newDuration === 60 ? '1 час' : '1.5 часа'}`);
    setTimeout(() => setSuccessMsg(''), 2500);
    
    // Refresh modal info
    if (activeAction) {
      setActiveAction(prev => prev ? {
        ...prev,
        fullSlot: formattedSlot
      } : null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Success notification */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-[100] bg-[#12131a] border border-[#F4B5CD] text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideUp">
          <div className="w-6 h-6 rounded-lg bg-[#F4B5CD]/20 flex items-center justify-center border border-[#F4B5CD]/30 text-[#F4B5CD]">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-medium">{successMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#12131a] p-5 border border-white/5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#F4B5CD]/10 flex items-center justify-center shrink-0 border border-[#F4B5CD]/20">
            <Users className="w-5 h-5 text-[#F4B5CD]" />
          </div>
          <div>
            <span className="text-[10px] text-white/40 font-sans tracking-wide block">Ученики</span>
            <span className="text-xl font-mono font-bold text-white">{totalStudentsCount}</span>
            <span className="text-[9px] text-white/30 block">активных договоров</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#12131a] p-5 border border-white/5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#F4B5CD]/10 flex items-center justify-center shrink-0 border border-[#F4B5CD]/20">
            <TrendingUp className="w-5 h-5 text-[#F4B5CD]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-white/40 font-sans tracking-wide block capitalize">Заработок за {currentMonthLabel}</span>
            <div className="mt-1 space-y-0.5">
              <span className="text-xs font-mono font-bold text-white block truncate">Ожидаемый: <span className="text-[#F4B5CD]">{expectedEarningsThisMonth.toLocaleString()} ₽</span></span>
              <span className="text-xs font-mono text-lavender block truncate">Реальный: <span className="text-lavender">{realEarningsThisMonth.toLocaleString()} ₽</span></span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#12131a] p-5 border border-white/5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-950/20 flex items-center justify-center shrink-0 border border-rose-900/35">
            <ShieldAlert className={`w-5 h-5 ${debtCount > 0 ? 'text-rose-400 animate-pulse' : 'text-white/20'}`} />
          </div>
          <div>
            <span className="text-[10px] text-white/40 font-sans tracking-wide block">Долги по оплате</span>
            <span className={`text-xl font-mono font-bold ${totalDebtRubles > 0 ? 'text-rose-400' : 'text-white'}`}>
              {totalDebtRubles.toLocaleString()} ₽
            </span>
            <span className="text-[9px] text-white/30 block">
              {debtCount > 0 ? `${debtCount} учеников требуют пополнения` : 'нет задолженностей'}
            </span>
          </div>
        </div>
      </div>

      {/* Week Timetable Agenda Grid */}
      <div className="bg-[#12131a] p-6 border border-white/5 rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-at-t from-[#F4B5CD]/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Header Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <h3 className="font-sans text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#F4B5CD]" />
              Календарь
            </h3>
            <button
              onClick={onOpenYearCalendar}
              className="p-1.5 bg-white/[0.03] hover:bg-[#F4B5CD]/10 border border-white/5 hover:border-[#F4B5CD]/30 text-white/40 hover:text-[#F4B5CD] rounded-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              title="Интерактивный календарь на год"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setShowFreeSlotsModal(true);
                setCopiedFreeSlots(false);
              }}
              className="px-2.5 py-1 bg-white/5 hover:bg-[#F4B5CD]/10 border border-white/10 hover:border-[#F4B5CD]/30 text-white/60 hover:text-[#F4B5CD] rounded-lg transition-all active:scale-95 text-[10px] uppercase tracking-widest font-extrabold flex items-center gap-1 cursor-pointer"
              title="Показать свободное время для записи"
            >
              ✨ Свободные окошки
            </button>
          </div>
          
          {/* Week Toggle Tabs */}
          <div className="flex items-center gap-1.5 bg-black/45 p-1 rounded-xl border border-white/5 shadow-inner self-stretch md:self-auto">
            <button
              onClick={() => setSelectedWeekOffset(prev => prev - 1)}
              className="p-1 text-white/50 hover:text-[#F4B5CD] hover:bg-zinc-800 transition rounded-lg"
              title="Предыдущая неделя"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            
            <button
              onClick={() => setSelectedWeekOffset(0)}
              className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-lg border transition ${
                selectedWeekOffset === 0
                  ? 'bg-[#F4B5CD]/15 text-[#F4B5CD] border-[#F4B5CD]/35 backdrop-blur-md font-extrabold shadow-sm'
                  : 'bg-white/[0.02] text-white/50 border-transparent hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              Эта неделя ({getWeekRangeLabel(0)})
            </button>

            <button
              onClick={() => setSelectedWeekOffset(1)}
              className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-lg border transition ${
                selectedWeekOffset === 1
                  ? 'bg-[#F4B5CD]/15 text-[#F4B5CD] border-[#F4B5CD]/35 backdrop-blur-md font-extrabold shadow-sm'
                  : 'bg-white/[0.02] text-white/50 border-transparent hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              След. неделя ({getWeekRangeLabel(1)})
            </button>

            <button
              onClick={() => setSelectedWeekOffset(prev => prev + 1)}
              className="p-1 text-white/50 hover:text-[#F4B5CD] hover:bg-zinc-800 transition rounded-lg"
              title="Следующая неделя"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Timetable Scroll Container */}
        <div className="overflow-x-auto pb-4 scroll-smooth no-scrollbar">
          <div className="min-w-[950px] pr-2">
            <div className="flex">
              {/* Left Column: Hours axis */}
              <div className="w-14 shrink-0 flex flex-col pt-10 pb-1">
                {Array.from({ length: 15 }).map((_, i) => {
                  const hour = 8 + i;
                  return (
                    <div 
                      key={hour} 
                      className="text-right pr-3.5 font-mono text-[9px] text-white/30 h-[45px] flex items-start justify-end pt-1 select-none"
                    >
                      {String(hour).padStart(2, '0')}:00
                    </div>
                  );
                })}
              </div>

              {/* 7 Columns for Weekdays */}
              <div className="flex-1 grid grid-cols-7 gap-2 relative">
                {scheduleTimetable.map(({ day, dateLabel, dateStr, lessons }, dayIdx) => {
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;
                  const isActiveDragOver = draggedSlotInfo !== null;
                  
                  return (
                    <div key={day} className="flex flex-col">
                      {/* Day Header */}
                      <div className={`text-center py-2 px-2 border-b rounded-t-xl mb-1.5 transition flex flex-col justify-center shrink-0 ${
                        isToday 
                          ? 'bg-[#F4B5CD]/15 border-[#F4B5CD]/75 text-white' 
                          : 'bg-zinc-900/60 border-white/5 text-white/70'
                      }`}>
                        <span className="text-[11px] font-bold font-serif text-[#F4B5CD] leading-none">{day}</span>
                        <span className="text-[8px] font-mono opacity-55 mt-0.5 leading-none">{dateLabel}</span>
                      </div>

                      {/* Day Body Column Container - Drop Zone */}
                      <div
                        onDragOver={(e) => handleDragOverForDay(e, day)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day, dateStr)}
                        onClick={(e) => {
                          // Prevent clicks originating from lesson overlays inside this container
                          if (e.target !== e.currentTarget) return;

                          const rect = e.currentTarget.getBoundingClientRect();
                          const relativeY = e.clientY - rect.top;
                          const offsetPercentage = relativeY / rect.height;

                          // Map 0-1 percentage to 14 hour range (8:00 to 22:00)
                          const hourFloat = 8 + offsetPercentage * 14;

                          // Round to nearest 30 mins
                          const totalMinutes = Math.round((hourFloat * 60) / 30) * 30;
                          const h = Math.floor(totalMinutes / 60);
                          const m = totalMinutes % 60;

                          // Keep times in range 08:00 to 21:30 (ending by 22:00)
                          const finalH = Math.min(Math.max(h, 8), 21);
                          const finalM = finalH === 21 ? 0 : m;

                          const clickedTimeStr = `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
                          
                          setNewLessonModalState({
                            day,
                            time: clickedTimeStr,
                            dateStr,
                            studentId: '',
                            duration: 60,
                            isOneTime: false
                          });
                        }}
                        className={`relative rounded-b-xl border transition-all duration-300 cursor-pointer ${
                          isToday ? 'bg-[#F4B5CD]/[0.02] border-[#F4B5CD]/20' : 'bg-black/30 border-white/5'
                        } ${
                          isActiveDragOver ? 'border-dashed border-[#F4B5CD]/40 bg-[#F4B5CD]/[0.05]' : 'hover:border-white/10'
                        }`}
                        title="Кликните на свободное время для быстрой записи!"
                        style={{ height: `${14 * 45}px` }} // 14 intervals * 45px = 630px
                      >
                        {/* Drag over preview slot highlight */}
                        {dragOverInfo && dragOverInfo.day === day && (() => {
                          const dragDuration = draggedSlotInfo ? parseSlot(draggedSlotInfo.slotStr).duration : 60;
                          const startHourFloat = parseTimeToFloat(dragOverInfo.time);
                          const offsetHours = Math.max(0, startHourFloat - 8);
                          const topPercent = Math.min(95, (offsetHours / 14) * 100);
                          
                          const durationHours = dragDuration / 60;
                          const heightPercent = (durationHours / 14) * 100;
                          
                          return (
                            <div 
                              className="absolute left-1.5 right-1.5 border-2 border-dashed border-[#F4B5CD]/60 bg-[#F4B5CD]/10 text-[#F4B5CD] text-[10px] font-semibold p-1.5 rounded-xl flex flex-col items-center justify-center animate-pulse pointer-events-none z-10 shadow-lg"
                              style={{
                                top: `${topPercent}%`,
                                height: `${heightPercent}%`,
                              }}
                            >
                              <span className="font-serif leading-none">Слот: {dragOverInfo.time}</span>
                              <span className="text-[8px] opacity-75">({dragDuration} мин)</span>
                            </div>
                          );
                        })()}

                        {/* Background Hour Lines */}
                        {Array.from({ length: 14 }).map((_, i) => (
                          <div
                            key={i}
                            className="absolute left-0 right-0 border-t border-white/[0.03] pointer-events-none"
                            style={{ top: `${(i / 13.9) * 100}%` }}
                          />
                        ))}

                        {/* Lessons Overlays */}
                        {lessons.map((les, idx) => {
                          const startHourFloat = parseTimeToFloat(les.time);
                          const offsetHours = Math.max(0, startHourFloat - 8);
                          // Bound to maximum 14 intervals
                          const topPercent = Math.min(95, (offsetHours / 14) * 100);
                          
                          const durationHours = les.duration / 60;
                          const heightPercent = (durationHours / 14) * 100;
                          
                          const studentRef = students.find(s => s.id === les.id);
                          const matchingLesson = studentRef?.lessons.find(l => l.date === les.dateStr && l.time === les.time);
                          const isLessonPaid = matchingLesson?.isPaid === true;

                          return (
                            <div
                              key={les.id + '-' + idx}
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, les.id, les.fullSlot, les.isOneTime)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAction({
                                  studentId: les.id,
                                  name: les.name,
                                  emoji: les.emoji,
                                  subject: les.subject,
                                  time: les.time,
                                  fullSlot: les.fullSlot,
                                  balance: les.balance,
                                  isOneTime: les.isOneTime,
                                  dateStr: les.dateStr
                                });
                                setCustomTimeInput(les.time);
                              }}
                              className={`absolute left-1 right-1 p-2 rounded-xl border text-left cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all duration-200 shadow-xl select-none group flex flex-col justify-between overflow-hidden ${(() => {
                                const lessonStatus = matchingLesson?.status;
                                const isCancelled = lessonStatus === 'cancelled';
                                const isAttended = lessonStatus === 'attended';
                                
                                if (isCancelled) {
                                  // Cancelled: reddish (красноватые)
                                  return 'bg-rose-950/20 border-rose-500/35 text-rose-300/80 hover:bg-rose-950/30 hover:border-rose-450';
                                } else if (isAttended) {
                                  if (isLessonPaid) {
                                    // Conducted and paid: transparent (прозрачные)
                                    return 'bg-transparent border-white/10 text-white/40 hover:bg-white/[0.03] hover:border-white/20';
                                  } else {
                                    // Conducted but unpaid: pink (розовые)
                                    return 'bg-[#E598B8]/12 border-[#E598B8]/45 text-[#F4B5CD] hover:bg-[#E598B8]/20 hover:border-[#E598B8] shadow-[0_0_12px_rgba(229,152,184,0.06)]';
                                  }
                                } else {
                                  // Planned: lilac/purple (сиреневые)
                                  return les.isOneTime 
                                    ? 'bg-[#C3B4FC]/12 border-dashed border-[#C3B4FC]/60 text-[#C3B4FC] hover:bg-[#C3B4FC]/22 hover:border-[#C3B4FC]'
                                    : 'bg-[#C3B4FC]/12 border-[#C3B4FC]/45 text-[#C3B4FC] hover:bg-[#C3B4FC]/22 hover:border-[#C3B4FC] shadow-[0_0_12px_rgba(195,180,252,0.06)]';
                                }
                              })()}`}
                              style={{ 
                                top: `${topPercent}%`, 
                                height: `calc(${heightPercent}% - 4px)`,
                                minHeight: '38px',
                                zIndex: 10
                              }}
                              title="Потяните для переноса или нажмите для настройки"
                            >
                              {/* Simple Clean Card content (Only Name, Time, and Paid Status) */}
                              <div className="flex flex-col justify-between h-full min-w-0 w-full">
                                {/* Top Row: Emoji, Name, and Paid status badge */}
                                <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="text-xs select-none shrink-0">{les.emoji}</span>
                                    <span className="text-[10px] font-bold truncate text-inherit leading-tight">
                                      {les.name.split(' ')[0]}
                                    </span>
                                  </div>
                                  
                                  {/* Paid status indicator badge */}
                                  <div className="shrink-0 z-20">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTogglePaymentDirect(les.id, les.time, les.dateStr || '');
                                      }}
                                      className={`px-1 py-0.5 rounded text-[8px] font-bold font-mono cursor-pointer transition active:scale-95 ${
                                        isLessonPaid 
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30' 
                                          : 'bg-rose-500/15 text-rose-350 border border-rose-500/30 hover:bg-rose-500/25'
                                      }`}
                                      title={isLessonPaid ? "Оплачено. Кликните, чтобы отметить неоплаченным" : "Не оплачено. Кликните, чтобы отметить как оплачено"}
                                    >
                                      {isLessonPaid ? ' :) ' : ' :( '}
                                    </button>
                                  </div>
                                </div>

                                {/* Bottom Row: Time and a subtle Move indicator */}
                                <div className="flex items-center justify-between mt-auto pt-1 w-full select-none pointer-events-none">
                                  <span className={`text-[8px] font-bold font-mono px-1 py-0.2 rounded-sm ${
                                    les.isOneTime 
                                      ? 'bg-[#E598B8]/20 text-[#E598B8]' 
                                      : 'bg-[#F4B5CD]/10 text-[#F4B5CD]'
                                  }`}>
                                    {les.time}
                                  </span>
                                  <Move className="w-2.5 h-2.5 text-white/5 group-hover:text-[#F4B5CD]/30 shrink-0" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Drop helper legend */}
        <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[10px] text-white/40">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded bg-[#C3B4FC] opacity-50" />
            <span>Запланирован (сиреневый)</span>
            <span className="w-2 h-2 rounded bg-[#E598B8] opacity-50 ml-2" />
            <span>Проведен но не оплачен (розовый)</span>
            <span className="w-2 h-2 rounded bg-transparent border border-white/30 opacity-50 ml-2" />
            <span>Проведен и оплачен (прозрачный)</span>
            <span className="w-2 h-2 rounded bg-rose-500/60 opacity-50 ml-2" />
            <span>Отменен</span>
          </div>
        </div>
      </div>

      {/* QUICK INSTANT INTERACTION MODAL (Zero Noise, High Performance Control Panel) */}
      {activeAction && (() => {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn" onClick={() => setActiveAction(null)}>
            <div 
              className="bg-[#12131a] w-full max-w-sm max-h-[90vh] flex flex-col border border-white/10 shadow-2xl rounded-2xl overflow-hidden animate-slideUp text-left font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Soft Pastel Header */}
              <div className="p-4 bg-gradient-to-r from-purple-950/30 to-[#F4B5CD]/10 border-b border-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl select-none">{activeAction.emoji}</span>
                  <div>
                    <h3 className="text-sm font-serif text-white font-medium">{activeAction.name}</h3>
                    <p className="text-[9px] text-[#F4B5CD] uppercase tracking-widest font-mono font-medium">{activeAction.subject}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveAction(null)}
                  className="p-1 border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable middle container */}
              <div className="p-5 space-y-4 overflow-y-auto flex-grow">
                {/* Subscription balance info */}
                <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/5 text-xs">
                  <div>
                    <span className="text-white/40 block text-[9px] uppercase tracking-wider font-sans">Дата урока</span>
                    <span className="text-xs font-mono text-white">
                      {activeAction.dateStr || 'Сегодня'}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[9px] uppercase tracking-wider font-sans">Текущий слот</span>
                    <span className="text-xs font-mono text-white bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {activeAction.fullSlot}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                   {/* Lesson Status (Planned vs Attended vs Cancelled) */}
                  <div className="space-y-1.5">
                    <span className="text-white/40 block text-[9px] uppercase tracking-wider font-mono">Статус урока:</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setModalLessonStatus('planned')}
                        className={`py-2 px-1 text-[10px] uppercase tracking-wider rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                          modalLessonStatus === 'planned'
                            ? 'bg-[#E598B8]/15 text-[#F4B5CD] border-[#E598B8]/30 font-medium'
                            : 'bg-white/5 text-white/45 border-transparent hover:bg-white/10 hover:text-white/75'
                        }`}
                      >
                        Запланирован
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalLessonStatus('attended')}
                        className={`py-2 px-1 text-[10px] uppercase tracking-wider rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                          modalLessonStatus === 'attended'
                            ? 'bg-lavender/10 text-lavender border-lavender/30 font-medium'
                            : 'bg-white/5 text-white/45 border-transparent hover:bg-white/10 hover:text-white/75'
                        }`}
                      >
                        Проведен
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalLessonStatus('cancelled')}
                        className={`py-2 px-1 text-[10px] uppercase tracking-wider rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                          modalLessonStatus === 'cancelled'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-medium'
                            : 'bg-white/5 text-white/45 border-transparent hover:bg-white/10 hover:text-white/75'
                        }`}
                      >
                        Отменен
                      </button>
                    </div>
                  </div>

                  {/* Payment Status Checkbox */}
                  <div 
                    className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5 hover:bg-white/[0.04] transition cursor-pointer select-none" 
                    onClick={() => setModalIsPaid(!modalIsPaid)}
                  >
                    <span className="text-xs text-white/70">Оплата зафиксирована (Оплачен)</span>
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-150 ${modalIsPaid ? 'bg-lavender border-transparent text-black' : 'border-white/20 text-transparent'}`}>
                      <span className="text-[10px] leading-none">✓</span>
                    </div>
                  </div>

                  {/* Interactive homework panels if attended or planned */}
                  {(modalLessonStatus === 'attended' || modalLessonStatus === 'planned') && (
                    <>
                      {/* Homework status selection */}
                      <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-2">
                        <span className="text-white/45 block text-[9px] uppercase tracking-wider font-mono">Домашнее задание к уроку:</span>
                        <div className="grid grid-cols-2 gap-1.5 font-sans">
                          {[
                            { k: 'completed', l: 'Сделано' },
                            { k: 'partially', l: 'Частично' },
                            { k: 'missed', l: 'Не сдано' },
                            { k: 'pending', l: 'Не задано' }
                          ].map(hwOpt => (
                            <button
                              key={hwOpt.k}
                              type="button"
                              onClick={() => setModalHwStatus(hwOpt.k as any)}
                              className={`py-2 px-2 text-[10px] uppercase tracking-wider rounded-xl border transition duration-150 cursor-pointer text-center ${
                                modalHwStatus === hwOpt.k
                                  ? 'bg-blush-mist/15 text-blush-mist border-blush-mist/30 font-medium'
                                  : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/75'
                              }`}
                            >
                              {hwOpt.l}
                            </button>
                          ))}
                        </div>

                        {/* Homework failure reason input */}
                        {(modalHwStatus === 'missed' || modalHwStatus === 'partially') && (
                          <div className="space-y-1 mt-2.5 pt-2 border-t border-white/5 select-none animate-fadeIn">
                            <label className="block text-[8px] uppercase tracking-wider text-blush-mist font-medium">Причина невыполнения ДЗ:</label>
                            <input
                              type="text"
                              placeholder="Например: Не успел, забыл тетрадь, заболел..."
                              value={modalHwReason}
                              onChange={(e) => setModalHwReason(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 bg-black/45 border border-white/10 focus:border-blush-mist focus:outline-none rounded-xl text-white"
                            />
                          </div>
                        )}
                      </div>

                      {/* Past Homework Info & Assign New Homework Section */}
                      {(() => {
                        const tgtStudent = students.find(s => s.id === activeAction.studentId);
                        const pastLessons = tgtStudent
                          ? [...tgtStudent.lessons]
                              .filter(l => l.status !== 'cancelled' && l.date < (activeAction.dateStr || ''))
                              .sort((a, b) => b.date.localeCompare(a.date))
                          : [];
                        const lastL = pastLessons.find(l => l.homework && l.homework.trim());
                        return (
                          <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-2.5">
                            <div>
                              <span className="text-[#F4B5CD] block text-[9px] uppercase tracking-wider font-mono font-bold">📚 Прошлое домашнее задание:</span>
                              {lastL ? (
                                <div className="text-xs text-white/80 bg-white/[0.02] border border-white/5 p-2 rounded-lg mt-1 font-sans italic">
                                  "{lastL.homework}" <span className="text-[10px] text-white/35 font-mono not-italic block mt-1">от {lastL.date}</span>
                                </div>
                              ) : (
                                <p className="text-[11px] text-white/40 italic mt-0.5">В истории нет записанных прошлых ДЗ</p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-white/5">
                              <span className="text-white/45 block text-[9px] uppercase tracking-wider font-mono font-medium">Задать новое домашнее задание:</span>
                              <textarea
                                rows={2}
                                placeholder="Разделы 1-3, подготовка к тесту..."
                                value={modalHomework}
                                onChange={(e) => setModalHomework(e.target.value)}
                                className="w-full text-xs px-2.5 py-2 bg-black/40 border border-[#F4B5CD]/20 focus:border-[#F4B5CD] focus:outline-none rounded-xl text-white resize-none font-sans mt-1"
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* KTP Alignment Selection Panel */}
                      <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-2">
                        <span className="text-white/45 block text-[9px] uppercase tracking-wider font-mono font-medium">Программа КТП на уроке:</span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {[
                            { k: 'according', l: 'Идем по КТП' },
                            { k: 'deviated', l: 'Отошли от программы' },
                            { k: 'caught_up', l: 'Догнали программу' }
                          ].map(ktpOpt => (
                            <button
                              key={ktpOpt.k}
                              type="button"
                              onClick={() => setModalKtpStatus(ktpOpt.k as any)}
                              className={`w-full py-1.5 px-3 text-[10px] uppercase tracking-wider rounded-xl border transition-all duration-150 cursor-pointer text-left ${
                                modalKtpStatus === ktpOpt.k
                                  ? 'bg-lavender/15 text-lavender border-lavender/30 font-medium'
                                  : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/70'
                              }`}
                            >
                              {modalKtpStatus === ktpOpt.k ? '✓ ' : ''}{ktpOpt.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Gaps and Mistakes Input Section */}
                      <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-1.5">
                        <span className="text-white/45 block text-[9px] uppercase tracking-wider font-mono font-medium">Пробелы и частые ошибки на уроке:</span>
                        <textarea
                          rows={2.5}
                          placeholder="Например: Ошибается в формуле тригонометрии, путает знаки при раскрытии скобок..."
                          value={modalGapsIdentified}
                          onChange={(e) => setModalGapsIdentified(e.target.value)}
                          className="w-full text-xs px-2.5 py-2 bg-black/40 border border-white/10 focus:border-blush-mist focus:outline-none rounded-xl text-white resize-none font-sans"
                        />
                      </div>
                    </>
                  )}

                  {/* Cancellation reason is only shown if status is cancelled */}
                  {modalLessonStatus === 'cancelled' && (
                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-1.5 animate-fadeIn">
                      <span className="text-white/45 block text-[9px] uppercase tracking-wider font-mono font-medium">Причина отмены занятия:</span>
                      <input
                        type="text"
                        placeholder="Например: Заболел ученик, отмена по инициативе родителя..."
                        value={modalCancelReason}
                        onChange={(e) => setModalCancelReason(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-black/40 border border-white/10 focus:border-rose-450 focus:outline-none rounded-xl text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed bottom footer actions */}
              <div className="p-4 bg-zinc-950/75 border-t border-white/5 flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSaveLessonModal(
                    activeAction.studentId,
                    activeAction.time,
                    activeAction.dateStr || '',
                    modalLessonStatus,
                    modalIsPaid,
                    modalHwStatus,
                    modalHwReason,
                    modalKtpStatus,
                    modalGapsIdentified,
                    modalCancelReason,
                    modalHomework
                  )}
                  className="flex-1 py-2.5 bg-gradient-to-r from-lavender to-blush-mist hover:opacity-95 text-zinc-950 font-bold rounded-xl text-[10px] uppercase tracking-widest transition shadow-lg select-none cursor-pointer text-center"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLessonCompletely(
                    activeAction.studentId,
                    activeAction.time,
                    activeAction.dateStr || '',
                    activeAction.isOneTime,
                    activeAction.fullSlot
                  )}
                  className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-[10px] uppercase tracking-widest transition cursor-pointer text-center font-medium flex items-center justify-center gap-1.5"
                  title="Полностью удалить этот урок"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/55 hover:text-white rounded-xl text-[10px] uppercase tracking-widest transition cursor-pointer text-center font-medium"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CUSTOM CONFIRM MODAL DIALOG */}
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

      {/* CONFIRM DRAG DROP RESCHEDULE MODAL (supports both one-time vs permanent choices) */}
      {dropConfirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
          <div className="bg-[#12131a] w-full max-w-sm border border-[#F4B5CD]/30 shadow-2xl rounded-2xl overflow-hidden text-left p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="text-2xl">{dropConfirmState.studentEmoji}</span>
              <div>
                <h3 className="text-xs text-[#F4B5CD] font-mono uppercase tracking-widest font-bold">Подтвердите перенос урока</h3>
                <h4 className="text-sm font-serif text-white font-medium">{dropConfirmState.studentName}</h4>
              </div>
            </div>

            <div className="bg-white/[0.02] p-3 border border-white/5 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center opacity-65">
                <span>Откуда:</span>
                <span className="font-mono text-rose-300 line-through">{dropConfirmState.originalSlot}</span>
              </div>
              <div className="flex justify-between items-center text-[#F4B5CD] font-bold">
                <span>Куда:</span>
                <span className="font-mono">{dropConfirmState.newDay} {dropConfirmState.newTime} ({durationChoice} мин)</span>
              </div>
            </div>

            {/* Selection Options */}
            <div className="space-y-2">
              <span className="block text-[9px] uppercase tracking-widest font-bold text-white/40">Какой тип переноса применить?</span>
              
              {/* Option A: One-time */}
              <button
                onClick={() => handleSaveReschedule(
                  dropConfirmState.studentId,
                  dropConfirmState.originalSlot,
                  dropConfirmState.newDay,
                  dropConfirmState.newTime,
                  'one-time',
                  durationChoice,
                  dropConfirmState.newDateStr
                )}
                className="w-full text-left p-2.5 rounded-lg border border-[#E598B8]/30 bg-[#E598B8]/5 hover:bg-[#E598B8]/10 transition flex items-center gap-3 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-[#E598B8]/20 flex items-center justify-center text-[#E598B8] shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block">Разовый перенос</span>
                  <span className="text-[8px] text-white/50 block">Только на предстоящий урок ({dropConfirmState.newDateStr}).</span>
                </div>
              </button>

              {/* Option B: Permanent */}
              <button
                onClick={() => handleSaveReschedule(
                  dropConfirmState.studentId,
                  dropConfirmState.originalSlot,
                  dropConfirmState.newDay,
                  dropConfirmState.newTime,
                  'permanent',
                  durationChoice,
                  dropConfirmState.newDateStr
                )}
                className="w-full text-left p-2.5 rounded-lg border border-lavender/20 bg-lavender/[0.02] hover:bg-lavender/[0.05] transition flex items-center gap-3 cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-lavender/20 flex items-center justify-center text-lavender shrink-0">
                  <Calendar className="w-3 h-3" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-white block">Постоянный перенос</span>
                  <span className="text-[8px] text-white/50 block font-light">Обновится регулярная сетка занятий на все недели.</span>
                </div>
              </button>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setDropConfirmState(null)}
                className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white/50 hover:text-white border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider transition text-center cursor-pointer"
              >
                Отменить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW LESSON POPUP MODAL (Add custom student scheduled lesson into empty grid slot) */}
      {newLessonModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn" onClick={() => setNewLessonModalState(null)}>
          <div 
            className="bg-[#12131a] w-full max-w-sm border border-white/10 shadow-2xl rounded-2xl overflow-hidden animate-slideUp text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-950/30 to-[#F4B5CD]/10 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl select-none">➕</span>
                <div>
                  <h3 className="text-sm font-serif text-white font-medium font-bold">Добавить новый урок</h3>
                  <p className="text-[9px] text-[#F4B5CD] uppercase tracking-widest font-mono">
                    {newLessonModalState.day}, {newLessonModalState.time} ({newLessonModalState.dateStr})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setNewLessonModalState(null)}
                className="p-1 border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Step 1: Select Student */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-white/45">Выберите ученика</label>
                <select
                  value={newLessonModalState.studentId}
                  onChange={(e) => setNewLessonModalState({ ...newLessonModalState, studentId: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 border border-white/10 bg-zinc-950 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                >
                  <option value="">-- Выбрать из списка --</option>
                  {students.filter(s => s.isActive).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.emoji} {s.name} ({s.subject})
                    </option>
                  ))}
                </select>
              </div>

              {/* Day & Time review inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-white/45">День недели</label>
                  <select
                    value={newLessonModalState.day}
                    onChange={(e) => setNewLessonModalState({ ...newLessonModalState, day: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 border border-white/10 bg-zinc-950 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl font-mono text-center"
                  >
                    {daysOfWeek.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-white/45">Время</label>
                  <input
                    type="text"
                    value={newLessonModalState.time}
                    onChange={(e) => setNewLessonModalState({ ...newLessonModalState, time: e.target.value })}
                    className="w-full text-xs px-3 py-2.5 border border-white/10 bg-zinc-950 text-white focus:border-[#F4B5CD] focus:outline-none text-center rounded-xl font-mono"
                    placeholder="15:00"
                  />
                </div>
              </div>

              {/* Step 2: Duration Selector */}
              <div className="space-y-1.5">
                <span className="block text-[10px] uppercase tracking-widest font-bold text-white/45 font-mono">Длительность занятия</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewLessonModalState({ ...newLessonModalState, duration: 60 })}
                    className={`py-1.5 px-3 text-[10px] uppercase tracking-wider font-extrabold rounded-lg border transition duration-150 cursor-pointer ${
                      newLessonModalState.duration === 60
                        ? 'bg-[#F4B5CD]/10 text-[#F4B5CD] border-[#F4B5CD]/35 shadow-sm'
                        : 'bg-white/5 border border-transparent text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    1 час (60 мин)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewLessonModalState({ ...newLessonModalState, duration: 90 })}
                    className={`py-1.5 px-3 text-[10px] uppercase tracking-wider font-extrabold rounded-lg border transition duration-150 cursor-pointer ${
                      newLessonModalState.duration === 90
                        ? 'bg-[#F4B5CD]/10 text-[#F4B5CD] border-[#F4B5CD]/35 shadow-sm'
                        : 'bg-white/5 border border-transparent text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    1.5 часа (90 мин)
                  </button>
                </div>
              </div>

              {/* Step 3: Regularity / One-time or Weekly Selector */}
              <div className="space-y-1.5">
                <span className="block text-[10px] uppercase tracking-widest font-bold text-white/45 font-mono">Тип повторения</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewLessonModalState({ ...newLessonModalState, isOneTime: true })}
                    className={`p-2.5 text-left rounded-lg border transition-all duration-150 cursor-pointer flex flex-col gap-0.5 ${
                      newLessonModalState.isOneTime
                        ? 'border-[#E598B8]/35 bg-[#E598B8]/10 text-white'
                        : 'border-white/5 bg-zinc-900 text-white/40 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-white">
                      Разовый
                    </span>
                    <span className="text-[8px] opacity-50">Только на эту дату ({newLessonModalState.dateStr})</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNewLessonModalState({ ...newLessonModalState, isOneTime: false })}
                    className={`p-2.5 text-left rounded-lg border transition-all duration-150 cursor-pointer flex flex-col gap-0.5 ${
                      !newLessonModalState.isOneTime
                        ? 'border-lavender/35 bg-lavender/15 text-white'
                        : 'border-white/5 bg-zinc-900 text-white/40 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-white">
                      Регулярный
                    </span>
                    <span className="text-[8px] opacity-50 font-light font-mono">Каждую неделю по графику</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setNewLessonModalState(null)}
                  className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white/50 hover:text-white border border-white/10 rounded-lg text-[9px] font-extrabold uppercase tracking-widest transition text-center font-mono cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewLessonInGrid}
                  className="flex-1 py-1.5 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/18 border border-[#F4B5CD]/30 text-[#F4B5CD] font-extrabold rounded-lg text-[9px] uppercase tracking-widest transition text-center cursor-pointer shadow-sm"
                >
                  Создать урок
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FREE SLOTS FINDER MODAL */}
      {showFreeSlotsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn" onClick={() => setShowFreeSlotsModal(false)}>
          <div 
            className="bg-[#12131a] w-full max-w-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden animate-slideUp text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[#F4B5CD]/5 to-purple-950/20 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl select-none">✨</span>
                <div>
                  <h3 className="text-sm font-serif text-white font-medium font-bold">Свободные окошки</h3>
                  <p className="text-[9px] text-[#F4B5CD] uppercase tracking-widest font-mono">
                    Автоматический парсер свободного времени на {selectedWeekOffset === 0 ? 'эту неделю' : 'следующую неделю'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowFreeSlotsModal(false)}
                className="p-1 border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable container */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
              
              {/* Settings Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                
                {/* Timezones */}
                <div className="space-y-3 md:col-span-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[8px] uppercase tracking-widest font-extrabold text-[#F4B5CD]">Мой часовой пояс</label>
                      <div className="w-full text-[11px] font-sans px-3 py-1.5 border border-white/5 bg-white/[0.02] text-white/60 rounded-lg">
                        Екатеринбург (МСК+2, UTC+5)
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8px] uppercase tracking-widest font-extrabold text-[#F4B5CD]">ЧП ученика для экспорта</label>
                      <select 
                        value={studentTimezone} 
                        onChange={(e) => setStudentTimezone(Number(e.target.value))}
                        className="w-full text-[11px] font-sans px-2.5 py-1.5 border border-white/10 bg-zinc-950 text-white focus:border-[#F4B5CD] rounded-lg cursor-pointer"
                      >
                        {[
                          { value: 0, label: 'GMT (UTC+0)' },
                          { value: 3, label: 'Москва (МСК, UTC+3)' },
                          { value: 4, label: 'Самара (МСК+1, UTC+4)' },
                          { value: 5, label: 'Екатеринбург (МСК+2, UTC+5)' },
                          { value: 6, label: 'Омск (МСК+3, UTC+6)' },
                          { value: 7, label: 'Красноярск (МСК+4, UTC+7)' },
                          { value: 8, label: 'Иркутск (МСК+5, UTC+8)' },
                          { value: 9, label: 'Якутск (МСК+6, UTC+9)' },
                          { value: 10, label: 'Владивосток (GMT+10)' },
                        ].map(tz => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Working bounds and duration */}
                <div className="space-y-1">
                  <label className="block text-[8px] uppercase tracking-widest font-extrabold text-[#F4B5CD]">Рабочие часы (по МСК+2)</label>
                  <div className="flex items-center gap-1">
                    <select 
                      value={workingHoursRange.start} 
                      onChange={(e) => setWorkingHoursRange({ ...workingHoursRange, start: e.target.value })}
                      className="flex-1 text-[11px] font-sans px-2 py-1 border border-white/10 bg-zinc-950 text-white rounded-lg cursor-pointer animate-none"
                    >
                      {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="text-white/30 text-[10px]">до</span>
                    <select 
                      value={workingHoursRange.end} 
                      onChange={(e) => setWorkingHoursRange({ ...workingHoursRange, end: e.target.value })}
                      className="flex-1 text-[11px] font-sans px-2 py-1 border border-white/10 bg-zinc-950 text-white rounded-lg cursor-pointer animate-none"
                    >
                      {['17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[8px] uppercase tracking-widest font-extrabold text-[#F4B5CD]">Длительность урока</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button 
                      onClick={() => setSlotDuration(60)}
                      className={`py-1 text-[9px] uppercase tracking-wider font-extrabold rounded-lg border transition cursor-pointer ${
                        slotDuration === 60 
                          ? 'bg-[#F4B5CD]/15 border-[#F4B5CD]/35 text-white' 
                          : 'bg-zinc-950 border-white/5 text-white/40'
                      }`}
                    >
                      60 минут
                    </button>
                    <button 
                      onClick={() => setSlotDuration(90)}
                      className={`py-1 text-[9px] uppercase tracking-wider font-extrabold rounded-lg border transition cursor-pointer ${
                        slotDuration === 90 
                          ? 'bg-[#F4B5CD]/15 border-[#F4B5CD]/35 text-white' 
                          : 'bg-zinc-950 border-white/5 text-white/40'
                      }`}
                    >
                      90 минут
                    </button>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[8px] uppercase tracking-widest font-extrabold text-[#F4B5CD] mb-1">Выбрать дни для экспорта</label>
                  <div className="flex flex-wrap gap-1">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => {
                      const isSelected = selectedDaysForFreeSlots.includes(d);
                      return (
                        <button
                          key={d}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDaysForFreeSlots(selectedDaysForFreeSlots.filter(x => x !== d));
                            } else {
                              setSelectedDaysForFreeSlots([...selectedDaysForFreeSlots, d]);
                            }
                          }}
                          className={`px-3 py-1 text-[10px] uppercase font-bold rounded-lg border transition cursor-pointer ${
                            isSelected 
                              ? 'bg-lavender/25 text-white border-lavender/40 shadow-sm'
                              : 'bg-zinc-950 text-white/30 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Text area and copy actions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[8px] uppercase tracking-widest font-extrabold text-[#F4B5CD]">Итоговый текст для ученика</label>
                  <span className="text-[9px] text-[#C3B4FC]/60 font-mono">
                    {selectedWeekOffset === 0 ? 'Текущая неделя' : 'Следующая неделя'}
                  </span>
                </div>
                <textarea
                  readOnly
                  value={getGeneratedFreeSlotsText()}
                  className="w-full text-xs font-mono p-4 border border-white/10 bg-black/60 text-white focus:outline-none h-48 leading-relaxed resize-none rounded-xl font-light"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowFreeSlotsModal(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white/50 hover:text-white border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider transition text-center cursor-pointer"
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(getGeneratedFreeSlotsText());
                    setCopiedFreeSlots(true);
                    setTimeout(() => setCopiedFreeSlots(false), 2000);
                  }}
                  className="flex-[2] py-2.5 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/18 border border-[#F4B5CD]/35 text-[#F4B5CD] font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer text-center"
                >
                  {copiedFreeSlots ? '✓ Скопировано в буфер!' : '📋 Скопировать текст'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
