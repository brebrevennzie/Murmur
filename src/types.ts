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
  homeworkStatus?: 'pending' | 'completed' | 'partially' | 'missed';
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
  program?: {
    id: string;
    name: string;
    topics: {
      id: string;
      title: string;
      status: 'pending' | 'completed' | 'missed' | 'skipped';
    }[];
  };
}

export interface TutorStats {
  totalActiveStudents: number;
  totalLessonsThisMonth: number;
  averageProgressScore: number;
  unpaidBalanceAlerts: number;
}

export interface SyllabusProgram {
  id: string;
  name: string;
  topics: string[];
}
