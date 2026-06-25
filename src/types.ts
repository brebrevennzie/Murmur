export interface MockExam {
  id: string;
  name: string;
  date: string;
  score: number;       // e.g. 78
  maxScore: number;    // e.g. 100
  gaps: string[];      // Gaps identified in this mock
  notes?: string;      // Comment
}

export interface Lesson {
  id: string;
  date: string;        // YYYY-MM-DD
  time?: string;       // HH:MM
  status: 'attended' | 'missed_excused' | 'missed_unexcused' | 'cancelled' | 'planned';
  reason?: string;     // Reason for missed / cancelled
  summary?: string;    // What was covered
  homework?: string;   // Homework assigned
  homeworkStatus?: 'pending' | 'completed' | 'partially' | 'missed' | 'ai_assisted';
  homeworkReason?: string; // Reason for not completed homework
  notes?: string;      // Tutor comments / dynamic request notes from the lesson
  ktpStatus?: 'according' | 'deviated' | 'caught_up'; // 'according' (Шли по КТП) | 'deviated' (Отошли от программы) | 'caught_up' (Догнали программу)
  isPaid?: boolean;
  studentQuestions?: string; // какие вопросы возникали у ребенка
  gapsIdentified?: string; // пробелы и частые ошибки ученика
}

export interface Payment {
  id: string;
  date: string;        // YYYY-MM-DD
  amount: number;      // amount in RUB / currency
  lessonsPaid: number; // how many lessons this covers
  notes?: string;
  method?: string;     // e.g., "СБП", "Тинькофф", "Наличные"
}

export interface TopicGap {
  id: string;
  title: string;       // e.g., "Показательные уравнения", "Present Perfect"
  severity: 'high' | 'medium' | 'low'; // Criticality of state
  status: 'new' | 'learning' | 'mastered';
  notes?: string;      // Description
  fixedDate?: string;  // When mastered
}

export interface OneTimeReschedule {
  id: string;
  originalSlot: string; // e.g. "Пн 16:30 (60 мин)"
  newSlot: string;      // e.g. "Вт 18:00 (90 мин)"
  date: string;         // YYYY-MM-DD
}

export interface Student {
  id: string;
  name: string;
  emoji: string;       // emoji character, e.g. "👩‍💻"
  coverColor: string;  // Cover gradient class, e.g. "from-indigo-500 to-purple-500"
  subject: string;     // e.g. "Математика (Профиль)"
  gradeClass: string;  // e.g. "11 класс"
  goal: string;        // e.g. "Сдать ЕГЭ на 85+"
  schedule: string[];  // e.g. ["Пн 16:30", "Чт 18:00"]
  hourlyRate: number;  // Price per lesson in RUB
  balanceLessons: number; // Remaining lesson balance. Positive = paid in advance, negative = owes money
  notes: string;       // General description
  isActive: boolean;
  createdAt: string;   // Date added
  
  mockExams: MockExam[];
  lessons: Lesson[];
  payments: Payment[];
  topicGaps: TopicGap[];
  oneTimeReschedules?: OneTimeReschedule[];
  zoomLink?: string;
  vocab?: string[]; // Spanish dictionary words
  program?: {
    id: string;
    name: string;
    topics: {
      id: string;
      title: string;
      status: 'pending' | 'completed' | 'missed' | 'skipped';
      pdfs?: { name: string; url?: string; base64?: string }[];
      links?: { name: string; url: string }[];
    }[];
  };
}

export interface TutorStats {
  totalActiveStudents: number;
  totalLessonsThisMonth: number;
  averageProgressScore: number;
  unpaidBalanceAlerts: number;
}

export interface SyllabusProgramTopic {
  id: string;
  title: string;
  pdfs?: { name: string; url?: string; base64?: string }[];
  links?: { name: string; url: string }[];
}

export interface SyllabusProgram {
  id: string;
  name: string;
  topics: (string | SyllabusProgramTopic)[];
}

export interface CalendarReminder {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
}

export const COVER_PRESETS = [
  // 10 Light/Pastel semi-transparent presets (no yellow or blue, unique shades, with subtle patterns)
  { 
    name: 'Нежная сакура', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'44\' height=\'44\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 14a3 3 0 110-6 3 3 0 010 6zm-6 6a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 116 0 3 3 0 01-6 0zm-6 6a3 3 0 110 6 3 3 0 010-6zm0-9a3 3 0 100 6 3 3 0 000-6z\' fill=\'rgba%28244,181,205,0.18%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(244, 181, 205, 0.2) 0%, rgba(254, 219, 231, 0.1) 100%)' 
  },
  { 
    name: 'Лиловый закат', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 28.35l-1.45-1.32C13.4 22.36 10 19.28 10 15.5 10 12.42 12.42 10 15.5 10c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09 3.08 0 5.5 2.42 5.5 5.5 0 3.78-3.4 6.86-8.55 11.54L20 28.35z\' fill=\'rgba%28216,180,254,0.15%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(216, 180, 254, 0.18) 0%, rgba(244, 181, 205, 0.12) 100%)' 
  },
  { 
    name: 'Пыльный зефир', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'36\' height=\'36\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 10c0 5.52 4.48 10 10 10-5.52 0-10 4.48-10 10 0-5.52-4.48-10-10-10 5.52 0 10-4.48 10-10z\' fill=\'rgba%28255,255,255,0.22%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(232, 197, 200, 0.22) 0%, rgba(222, 165, 169, 0.12) 100%)' 
  },
  { 
    name: 'Мятная роса', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M12 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3 3a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm-3 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3z\' fill=\'rgba%28167,243,208,0.22%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(167, 243, 208, 0.2) 0%, rgba(209, 250, 229, 0.1) 100%)' 
  },
  { 
    name: 'Коралловая пудра', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'30\' height=\'30\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M0 40L40 0M-10 10L10 -10M30 50L50 30\' stroke=\'rgba%28251,146,146,0.15%29\' stroke-width=\'2\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(251, 146, 146, 0.2) 0%, rgba(244, 181, 205, 0.12) 100%)' 
  },
  { 
    name: 'Лавандовый сон', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'44\' height=\'44\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 14a3 3 0 110-6 3 3 0 010 6zm-6 6a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 116 0 3 3 0 01-6 0zm-6 6a3 3 0 110 6 3 3 0 010-6zm0-9a3 3 0 100 6 3 3 0 000-6z\' fill=\'rgba%28216,180,254,0.15%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(216, 180, 254, 0.22) 0%, rgba(195, 180, 252, 0.1) 100%)' 
  },
  { 
    name: 'Пепел розы', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 28.35l-1.45-1.32C13.4 22.36 10 19.28 10 15.5 10 12.42 12.42 10 15.5 10c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09 3.08 0 5.5 2.42 5.5 5.5 0 3.78-3.4 6.86-8.55 11.54L20 28.35z\' fill=\'rgba%28212,178,182,0.22%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(212, 178, 182, 0.25) 0%, rgba(195, 180, 252, 0.12) 100%)' 
  },
  { 
    name: 'Розовый туман', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'36\' height=\'36\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 10c0 5.52 4.48 10 10 10-5.52 0-10 4.48-10 10 0-5.52-4.48-10-10-10 5.52 0 10-4.48 10-10z\' fill=\'rgba%28244,194,208,0.25%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(244, 194, 208, 0.26) 0%, rgba(212, 178, 182, 0.12) 100%)' 
  },
  { 
    name: 'Муссовый рассвет', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M12 18.26l-1.02-.93C7.36 14.07 5 11.9 5 9.24 5 7.07 6.7 5.37 8.87 5.37c1.23 0 2.4.57 3.17 1.47.77-.9 1.94-1.47 3.17-1.47 2.17 0 3.87 1.7 3.87 3.87 0 2.66-2.36 4.83-5.98 8.1l-1.1 1.02z\' fill=\'rgba%28222,165,169,0.2%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(222, 165, 169, 0.22) 0%, rgba(216, 180, 254, 0.12) 100%)' 
  },
  { 
    name: 'Зеленый чай', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'30\' height=\'30\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M0 40L40 0M-10 10L10 -10M30 50L50 30\' stroke=\'rgba%28167,243,208,0.18%29\' stroke-width=\'2\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(167, 243, 208, 0.22) 0%, rgba(244, 181, 205, 0.1) 100%)' 
  },

  // 10 Dark/Mysterious semi-transparent presets (no yellow or blue, unique shades, with subtle patterns)
  { 
    name: 'Фиолетовые сумерки', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 28.35l-1.45-1.32C13.4 22.36 10 19.28 10 15.5 10 12.42 12.42 10 15.5 10c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09 3.08 0 5.5 2.42 5.5 5.5 0 3.78-3.4 6.86-8.55 11.54L20 28.35z\' fill=\'rgba%28124,58,237,0.12%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(124, 58, 237, 0.22) 0%, rgba(18, 19, 26, 0.85) 100%)' 
  },
  { 
    name: 'Пыльная сирень', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'44\' height=\'44\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 14a3 3 0 110-6 3 3 0 010 6zm-6 6a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 116 0 3 3 0 01-6 0zm-6 6a3 3 0 110 6 3 3 0 010-6zm0-9a3 3 0 100 6 3 3 0 000-6z\' fill=\'rgba%28139,92,246,0.1%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(15, 23, 42, 0.8) 100%)' 
  },
  { 
    name: 'Изумрудная ночь', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'36\' height=\'36\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 10c0 5.52 4.48 10 10 10-5.52 0-10 4.48-10 10 0-5.52-4.48-10-10-10 5.52 0 10-4.48 10-10z\' fill=\'rgba%2816,185,129,0.08%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(18, 19, 26, 0.88) 100%)' 
  },
  { 
    name: 'Темный гранат', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Cpath d=\'M16 8c0 4.42 3.58 8 8 8-4.42 0-8 3.58-8 8 0-4.42-3.58-8-8-8 4.42 0 8-3.58 8-8z\' fill=\'rgba%28190,24,74,0.15%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(190, 24, 74, 0.18) 0%, rgba(18, 19, 26, 0.85) 100%)' 
  },
  { 
    name: 'Бархатная роза', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'30\' height=\'30\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M0 40L40 0M-10 10L10 -10M30 50L50 30\' stroke=\'rgba%28244,181,205,0.08%29\' stroke-width=\'2\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(244, 181, 205, 0.25) 0%, rgba(15, 23, 42, 0.85) 100%)' 
  },
  { 
    name: 'Лавандовый графит', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 28.35l-1.45-1.32C13.4 22.36 10 19.28 10 15.5 10 12.42 12.42 10 15.5 10c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09 3.08 0 5.5 2.42 5.5 5.5 0 3.78-3.4 6.86-8.55 11.54L20 28.35z\' fill=\'rgba%28167,139,250,0.1%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(167, 139, 250, 0.18) 0%, rgba(30, 41, 59, 0.75) 100%)' 
  },
  { 
    name: 'Мятный уголь', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'44\' height=\'44\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 14a3 3 0 110-6 3 3 0 010 6zm-6 6a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 116 0 3 3 0 01-6 0zm-6 6a3 3 0 110 6 3 3 0 010-6zm0-9a3 3 0 100 6 3 3 0 000-6z\' fill=\'rgba%28110,231,183,0.08%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(110, 231, 183, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)' 
  },
  { 
    name: 'Малиновый бархат', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'36\' height=\'36\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 10c0 5.52 4.48 10 10 10-5.52 0-10 4.48-10 10 0-5.52-4.48-10-10-10 5.52 0 10-4.48 10-10z\' fill=\'rgba%28225,29,72,0.08%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(225, 29, 72, 0.15) 0%, rgba(18, 19, 26, 0.88) 100%)' 
  },
  { 
    name: 'Темный аметист', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M12 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-3 3a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm-3 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3z\' fill=\'rgba%28147,51,234,0.15%29\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(88, 28, 135, 0.28) 0%, rgba(18, 19, 26, 0.88) 100%)' 
  },
  { 
    name: 'Пыльный обсидиан', 
    value: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'30\' height=\'30\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M0 40L40 0M-10 10L10 -10M30 50L50 30\' stroke=\'rgba%28212,178,182,0.08%29\' stroke-width=\'2\'/%3E%3C/svg%3E") repeat, linear-gradient(135deg, rgba(212, 178, 182, 0.18) 0%, rgba(30, 41, 59, 0.85) 100%)' 
  },

  // 6 Additional super soft/delicate presets WITHOUT patterns (completely plain, unique colors)
  { 
    name: 'Дымчатая роза (без узора)', 
    value: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(244, 63, 94, 0.05) 100%)' 
  },
  { 
    name: 'Пыльный шалфей (без узора)', 
    value: 'linear-gradient(135deg, rgba(52, 211, 153, 0.12) 0%, rgba(16, 185, 129, 0.05) 100%)' 
  },
  { 
    name: 'Бархатная сирень (без узора)', 
    value: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(139, 92, 246, 0.05) 100%)' 
  },
  { 
    name: 'Мягкая фуксия (без узора)', 
    value: 'linear-gradient(135deg, rgba(219, 39, 119, 0.09) 0%, rgba(244, 114, 182, 0.04) 100%)' 
  },
  { 
    name: 'Кашемировый серый (без узора)', 
    value: 'linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(100, 116, 139, 0.08) 100%)' 
  },
  { 
    name: 'Нежный абрикос (без узора)', 
    value: 'linear-gradient(135deg, rgba(251, 113, 133, 0.12) 0%, rgba(253, 164, 175, 0.06) 100%)' 
  },
];

