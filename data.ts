import { Student, SyllabusProgram } from './types';
import { safeStorage } from './utils/safeStorage';

export const DEFAULT_PROGRAMS: SyllabusProgram[] = [
  {
    id: 'math-egepro',
    name: 'ЕГЭ Математика (Профиль)',
    topics: [
      'Уравнения и неравенства',
      'Текстовые задачи',
      'Производная и первообразная',
      'Геометрия: планиметрия',
      'Геометрия: стереометрия',
      'Экономические задачи',
      'Параметры и нестандартные задачи',
      'Теория чисел'
    ]
  },
  {
    id: 'math-oge',
    name: 'ОГЭ Математика',
    topics: [
      'Числа и вычисления',
      'Алгебраические выражения',
      'Уравнения и системы уравнений',
      'Неравенства и системы неравенств',
      'Последовательности и прогрессии',
      'Функции и графики',
      'Планиметрия (базовые фигуры)',
      'Планиметрия (площади и углы)',
      'Практические задачи (план местности, листы бумаги и др.)'
    ]
  },
  {
    id: 'phys-ege',
    name: 'ЕГЭ Физика',
    topics: [
      'Кинематика и Динамика',
      'Законы сохранения',
      'Статика и Гидростатика',
      'Молекулярная физика и Термодинамика',
      'Электростатика и Постоянный ток',
      'Магнетизм и Электромагнитная индукция',
      'Оптика: геометрическая и волновая',
      'Квантовая и Ядерная физика'
    ]
  },
  {
    id: 'eng-b2',
    name: 'Английский разговорный B2',
    topics: [
      'Tenses: Present & Past Simple',
      'Future plans and arrangements',
      'Expressing opinion and debating',
      'Modal verbs: secrets of polite English',
      'Travel and airports vocabulary',
      'Idioms and phrasal verbs for daily speech',
      'Conditional sentences in conversation',
      'Collocations, linkers and structures'
    ]
  }
];

export function getInitialPrograms(): SyllabusProgram[] {
  const data = safeStorage.getItem('tutor_syllabus_programs');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse tutor_syllabus_programs, using default template', e);
      return DEFAULT_PROGRAMS;
    }
  }
  safeStorage.setItem('tutor_syllabus_programs', JSON.stringify(DEFAULT_PROGRAMS));
  return DEFAULT_PROGRAMS;
}

export function savePrograms(programs: SyllabusProgram[]) {
  safeStorage.setItem('tutor_syllabus_programs', JSON.stringify(programs));
}

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'stud-1',
    name: 'Александр Смирнов',
    emoji: '💖',
    coverColor: 'linear-gradient(135deg, rgba(244, 181, 205, 0.15) 0%, rgba(216, 180, 254, 0.1) 100%)',
    subject: 'Математика (Профиль)',
    gradeClass: '11 класс',
    goal: 'Сдать ЕГЭ на 80+ для поступления в МГТУ им. Баумана',
    schedule: ['Пн 16:30', 'Чт 18:00'],
    hourlyRate: 1800,
    balanceLessons: 3, // Paid 3 lessons in advance
    notes: 'Саша очень способный, но иногда торопится в простых арифметических вычислениях. Требуется жесткий контроль оформления второй части (задачи 12, 14, 15). Склонность к лени отсутствует, домашнее задание делает старательно.',
    isActive: true,
    createdAt: '2026-01-10',
    
    mockExams: [
      {
        id: 'mock-1-1',
        name: 'Пробный №1 (Входное тестирование)',
        date: '2026-01-15',
        score: 42,
        maxScore: 100,
        gaps: ['Тригонометрия (№12)', 'Текстовые задачи (№8)', 'Стереометрия (№2)'],
        notes: 'Слабые остаточные знания после 10 класса. Забыл основы тригонометрического круга и формулы приведения.'
      },
      {
        id: 'mock-1-2',
        name: 'Пробный №2 (Февраль)',
        date: '2026-02-25',
        score: 58,
        maxScore: 100,
        gaps: ['Финансовая математика (№15)', 'Параметры (№17)'],
        notes: 'Прогресс в первой части очевиден. Тригонометрия усвоена, делает ошибки по невнимательности в геометрии.'
      },
      {
        id: 'mock-1-3',
        name: 'Пробный №3 (Апрель)',
        date: '2026-04-18',
        score: 68,
        maxScore: 100,
        gaps: ['Параметры (№17)', 'Оформление неравенств'],
        notes: 'Уверенно берется за вторую часть. Отличная динамика. Нужно закрепить логарифмы.'
      },
      {
        id: 'mock-1-4',
        name: 'Пробный №4 (Майский Интенсив)',
        date: '2026-05-20',
        score: 79,
        maxScore: 100,
        gaps: ['Геометрия повышенной сложности'],
        notes: 'Прекрасный результат! Почти достиг поставленной планки в 80 баллов. Ошибки только в сложной планиметрии.'
      }
    ],
    
    lessons: [
      {
        id: 'les-1-1',
        date: '2026-06-15',
        time: '16:30',
        status: 'attended',
        summary: 'Изучение методов решения уравнений с параметрами. Графический метод (координаты x-a).',
        homework: 'Решить 10 задач с параметрами из вариантов ФИПИ.',
        homeworkStatus: 'completed'
      },
      {
        id: 'les-1-2',
        date: '2026-06-18',
        time: '18:00',
        status: 'attended',
        summary: 'Тригонометрические неравенства (разбор ошибок пробника №4). Метод интервалов.',
        homework: 'Подборка неравенств на листах.',
        homeworkStatus: 'partially'
      },
      {
        id: 'les-1-3',
        date: '2026-05-25',
        time: '18:00',
        status: 'missed_excused',
        reason: 'Заболел, предупредил за день.',
        summary: 'Перенос темы стереометрии на следующее занятие.'
      }
    ],
    
    payments: [
      {
        id: 'pay-1-1',
        date: '2026-06-01',
        amount: 7200,
        lessonsPaid: 4,
        method: 'СберБанк',
        notes: 'Абонемент на 4 занятия'
      },
      {
        id: 'pay-1-2',
        date: '2026-06-14',
        amount: 7200,
        lessonsPaid: 4,
        method: 'Тинькофф',
        notes: 'Абонемент на июнь (часть 2)'
      }
    ],
    
    topicGaps: [
      {
        id: 'gap-1-1',
        title: 'Уравнения с параметрами (графический метод)',
        severity: 'high',
        status: 'learning',
        notes: 'Метод областей усваивается тяжело, графики строит хорошо, но путается с граничными условиями.'
      },
      {
        id: 'gap-1-2',
        title: 'Тригонометрические формулы',
        severity: 'low',
        status: 'mastered',
        notes: 'Теперь идеально знает формулы двойных углов и формулы сложения.',
        fixedDate: '2026-03-10'
      },
      {
        id: 'gap-1-3',
        title: 'Финансовые задачи (оптимизация)',
        severity: 'medium',
        status: 'new',
        notes: 'Тему вкладов и резервов разобрали частично. Производные в оптимизации вызывают вопросы.'
      }
    ]
  },
  {
    id: 'stud-2',
    name: 'Маргарита Кузнецова',
    emoji: '💝',
    coverColor: 'linear-gradient(135deg, rgba(244, 181, 205, 0.12) 0%, rgba(254, 219, 231, 0.08) 100%)',
    subject: 'Английский Язык (ЕГЭ)',
    gradeClass: '11 класс',
    goal: 'C1 уровень, ЕГЭ на 95+ для поступления в НИУ ВШЭ',
    schedule: ['Вт 15:00', 'Пт 17:30'],
    hourlyRate: 2000,
    balanceLessons: -2, // Has client debt of 2 lessons! Displays in red
    notes: 'Рита имеет потрясающую языковую базу. Проблема в специфических критериях оценивания эссе (Task 38) и устной речи (Task 4). Постоянно уходит в слишком сложные конструкции, теряя баллы на грамматических микроошибках.',
    isActive: true,
    createdAt: '2026-02-01',
    
    mockExams: [
      {
        id: 'mock-2-1',
        name: 'Пробный №1',
        date: '2026-02-15',
        score: 74,
        maxScore: 100,
        gaps: ['Анализ графиков (Task 38)', 'Аудирование (Часть 3)'],
        notes: 'Проблемы с логикой сравнения в письменной работе. Спешка во время прослушивания третьей части.'
      },
      {
        id: 'mock-2-2',
        name: 'Пробный №2 (Весенний)',
        date: '2026-04-10',
        score: 86,
        maxScore: 100,
        gaps: ['Словообразование (Suffixes/Prefixes)', 'Грамматические времена'],
        notes: 'Потрясающее описание графиков, балл вырос. Запуталась в артиклях и устойчивых предлогах.'
      },
      {
        id: 'mock-2-3',
        name: 'Финальный Пробник',
        date: '2026-05-25',
        score: 93,
        maxScore: 100,
        gaps: ['Устная речь (Задание 4)'],
        notes: 'Прекрасно выполнен весь тест. Сняли 1 балл в аудио и 2 балла за устную речь из-за превышения лимита времени.'
      }
    ],
    
    lessons: [
      {
        id: 'les-2-1',
        date: '2026-06-16',
        time: '15:00',
        status: 'attended',
        summary: 'Отработка устных упражнений на сравнение картинок. Тайм-менеджмент во время ответа.',
        homework: 'Записать 3 голосовых сообщения с ответами по шаблону.',
        homeworkStatus: 'completed'
      },
      {
        id: 'les-2-2',
        date: '2026-06-19',
        time: '17:30',
        status: 'attended',
        summary: 'Разбор фразовых глаголов (take, bring, turn). Словообразование существительных.',
        homework: 'Упражнения из учебника Macmillan (стр 45-47).',
        homeworkStatus: 'missed'
      },
      {
        id: 'les-2-3',
        date: '2026-06-12',
        time: '17:30',
        status: 'missed_unexcused',
        reason: 'Забыла про урок, не выходила на связь.',
        summary: 'Списан резервный час согласно правилам регулярных занятий.'
      }
    ],
    
    payments: [
      {
        id: 'pay-2-1',
        date: '2026-05-10',
        amount: 8000,
        lessonsPaid: 4,
        method: 'Тинькофф',
        notes: 'Предоплата четырех майских уроков'
      }
    ],
    
    topicGaps: [
      {
        id: 'gap-2-1',
        title: 'Устная часть: Сравнение изображений (Task 4)',
        severity: 'medium',
        status: 'learning',
        notes: 'Иногда забывает вставить вводные слова-связки или превышает лимит в 2 минуты.'
      },
      {
        id: 'gap-2-2',
        title: 'Использование инфинитива и герундия',
        severity: 'low',
        status: 'mastered',
        notes: 'Полностью разобрала разницу после глаголов stop, remember, forget.',
        fixedDate: '2026-05-12'
      },
      {
        id: 'gap-2-3',
        title: 'Фразовые глаголы (группы Get, Turn, Carry)',
        severity: 'high',
        status: 'new',
        notes: 'Огромный список путается в голове. Будем учить тематически по контексту.'
      }
    ]
  },
  {
    id: 'stud-3',
    name: 'Даниил Петров',
    emoji: '🧡',
    coverColor: 'linear-gradient(135deg, rgba(167, 243, 208, 0.15) 0%, rgba(216, 180, 254, 0.1) 100%)',
    subject: 'Физика (ОГЭ)',
    gradeClass: '9 класс',
    goal: 'Сдать ОГЭ на оценку "5" (от 35 баллов)',
    schedule: ['Ср 18:00'],
    hourlyRate: 1500,
    balanceLessons: 0, // Even balance
    notes: 'Даня перешел ко мне перед ОГЭ. Очень усердно читает параграфы. Хорошо ориентируется в механике, но "плавает" в оптике и термодинамике. Нужно больше практики в расчетных задачах второй части.',
    isActive: true,
    createdAt: '2026-03-01',
    
    mockExams: [
      {
        id: 'mock-3-1',
        name: 'Мартовский Пробник ФИПИ',
        date: '2026-03-20',
        score: 22,
        maxScore: 45,
        gaps: ['Геометрическая оптика', 'Законы сохранения энергии'],
        notes: 'Оценка "3". Плохо построены лучи в линзах. Формулы механики помнит кусками.'
      },
      {
        id: 'mock-3-2',
        name: 'Пробный №2 (Май)',
        date: '2026-05-15',
        score: 36,
        maxScore: 45,
        gaps: ['Уравнение теплового баланса'],
        notes: 'Оценка "5" (нижняя граница). Значительный скачок! Механика решена на 100%, оптика тоже. Ошибся в расчете теплоты нагрева воды.'
      }
    ],
    
    lessons: [
      {
        id: 'les-3-1',
        date: '2026-06-17',
        time: '18:00',
        status: 'attended',
        summary: 'Термодинамика. Уравнение теплового баланса. Решение задач на плавление льда и нагрев воды.',
        homework: 'Решить 6 задач из второй части ОГЭ РешуОГЭ.',
        homeworkStatus: 'completed'
      }
    ],
    
    payments: [
      {
        id: 'pay-3-1',
        date: '2026-06-10',
        amount: 3000,
        lessonsPaid: 2,
        method: 'СБП (ВТБ)',
        notes: 'Оплата за 2 занятия в июне'
      }
    ],
    
    topicGaps: [
      {
        id: 'gap-3-1',
        title: 'Уравнение теплового баланса (фазовые переходы)',
        severity: 'high',
        status: 'learning',
        notes: 'Забывает учесть, что лед сначала должен нагреться до 0°C, прежде чем начнется плавление.'
      },
      {
        id: 'gap-3-2',
        title: 'Закон сохранения импульса',
        severity: 'low',
        status: 'mastered',
        notes: 'Идеально расписывает векторный вид закона и делает проекции на оси.',
        fixedDate: '2026-04-05'
      }
    ]
  }
];

export function getInitialStudents(): Student[] {
  const data = safeStorage.getItem('tutor_students_db');
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse from storage, using initial state', e);
      return INITIAL_STUDENTS;
    }
  }
  // Store default
  safeStorage.setItem('tutor_students_db', JSON.stringify(INITIAL_STUDENTS));
  return INITIAL_STUDENTS;
}

export function saveStudents(students: Student[]) {
  safeStorage.setItem('tutor_students_db', JSON.stringify(students));
}
