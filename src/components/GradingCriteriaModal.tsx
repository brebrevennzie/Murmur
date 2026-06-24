import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Edit3, Check, ChevronDown, ChevronUp, BookOpen, 
  Award, FileText, ChevronRight, Settings, Info, AlertTriangle
} from 'lucide-react';

export interface ScoreRange {
  id: string;
  grade: string;   // e.g., "5", "4", "3"
  range: string;   // e.g., "29-33", "23-28"
}

export interface CriterionItem {
  id: string;
  name: string;        // e.g., "К1. Содержание изложения"
  maxPoints: number;   // e.g., 3
  description: string; // Brief summary
  details: string;     // Bullet points / detailed rules
  isExpanded?: boolean;
}

export interface ExamSystem {
  id: string;
  name: string;        // e.g., "Русский язык ОГЭ"
  scoreRanges: ScoreRange[];
  criteria: CriterionItem[];
}

interface GradingCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_CRITERIA: ExamSystem[] = [
  {
    id: 'rus-oge',
    name: 'Русский язык ОГЭ',
    scoreRanges: [
      { id: 'ro1', grade: '5', range: '29–33 баллов (из них не менее 6 за грамотность по ГК1–ГК4)' },
      { id: 'ro2', grade: '4', range: '23–28 баллов (из них не менее 4 за грамотность по ГК1–ГК4)' },
      { id: 'ro3', grade: '3', range: '15–22 баллов' },
      { id: 'ro4', grade: '2', range: '0–14 баллов' }
    ],
    criteria: [
      {
        id: 'roc1',
        name: 'Изложение (Задание 1) — Сжатие',
        maxPoints: 7,
        description: 'Оценка точности передачи содержания и применения приёмов сжатия текста.',
        details: '• ИК1 (Содержание изложения): 2 балла. Полный устный или письменный объём микротем.\n• ИК2 (Сжатие исходного текста): 3 балла. Применены 1 или несколько приёмов сжатия для всех микротем.\n• ИК3 (Смысловая цельность, логика и последовательность): 2 балла. Изложение характеризуется смысловой цельностью и последовательностью, без логических ошибок.'
      },
      {
        id: 'roc2',
        name: 'Сочинение (Задания 13.1, 13.2, 13.3)',
        maxPoints: 9,
        description: 'Написание связного сочинения-рассуждения с аргументацией.',
        details: '• С3К1 (Толкование понятия/формулировка тезиса): 2 балла. Тезис сформулирован и разъяснён верно.\n• С3К2 (Наличие примеров-аргументов): 3 балла. Приведено 2 аргумента: один из текста, один из жизненного опыта (или оба из текста).\n• С3К3 (Смысловая цельность, речевая связность и последовательность): 2 балла. Логика рассуждения безупречна, абзацное членение верное.\n• С3К4 (Композиционная стройность): 2 балла. Работа характеризуется композиционной стройностью, ошибок в построении нет.'
      },
      {
        id: 'roc3',
        name: 'Практическая грамотность (ГК1–ГК4) и точность (ФК1)',
        maxPoints: 10,
        description: 'Оценка грамотности по всему тексту изложения и сочинения вместе взятых.',
        details: '• ГК1 (Орфографическая грамотность): 2 балла (0–1 ошибка), 1 балл (2–3 ошибки), 0 баллов (4 и более).\n• ГК2 (Пунктуационная грамотность): 2 балла (0–2 ошибки), 1 балл (3–4 ошибки), 0 баллов (5 и более).\n• ГК3 (Грамматическая правильность): 2 балла (0–1 ошибка), 1 балл (2 ошибки), 0 баллов (3 и более).\n• ГК4 (Речевая культура): 2 балла (0–2 ошибки), 1 балл (3–4 ошибки), 0 баллов (5 и более).\n• ФК1 (Фактическая точность): 2 балла (ошибок в фактах нет), 1 балл (1 ошибка), 0 баллов (2 и более).'
      }
    ]
  },
  {
    id: 'rus-ege',
    name: 'Русский язык ЕГЭ',
    scoreRanges: [
      { id: 're1', grade: '100 б. (макс)', range: '50 первичных баллов (идеальная работа без единой ошибки)' },
      { id: 're2', grade: '80+ б. (отл)', range: '42–49 первичных баллов (высокие баллы для лучших вузов)' },
      { id: 're3', grade: '60–79 б. (хор)', range: '32–41 первичных баллов (уверенный средний результат)' },
      { id: 're4', grade: '36–59 б. (удовл)', range: '21–31 первичных баллов (минимальный порог вузов пройден)' },
      { id: 're5', grade: '0–35 б. (не сдал)', range: '0–20 первичных баллов (не преодолен минимальный порог)' }
    ],
    criteria: [
      {
        id: 'rec1',
        name: 'Часть 1: Тестовые задания (1–26)',
        maxPoints: 28,
        description: 'Оценка кратких ответов на вопросы по орфографии, пунктуации, грамматике и лексике.',
        details: '• Задания 1-3, 5-7, 9-20, 22-25: по 1 баллу за правильный ответ.\n• Задание 8 (Синтаксические нормы): максимум 2 балла (1 ошибка = 1 балл, более 2 ошибок = 0 баллов).\n• Задание 21 (Пунктуационный анализ): 1 балл.\n• Задание 26 (Средства выразительности): максимум 3 балла.'
      },
      {
        id: 'rec2',
        name: 'Часть 2: Сочинение (Задание 27) — Содержание и логика',
        maxPoints: 8,
        description: 'Оценка формулировки проблемы, комментария, позиции автора и своей аргументации.',
        details: '• К1 (Проблема исходного текста): 1 балл. Верно сформулирована одна из проблем.\n• К2 (Комментарий к проблеме): 3 балла. Приведено 2 примера-иллюстрации, пояснено их значение, указана и проанализирована связь между ними.\n• К3 (Отражение позиции автора): 1 балл. Позиция автора по выделенной проблеме сформулирована верно.\n• К4 (Отношение к позиции автора + обоснование): 1 балл. Выражено свое отношение и приведено реальное обоснование (пример из литературы, истории или жизни).\n• К5 (Смысловая цельность и логика): 2 балла. Нет логических ошибок, абзацное членение верное.'
      },
      {
        id: 'rec3',
        name: 'Часть 2: Сочинение (Задание 27) — Язык и грамотность',
        maxPoints: 14,
        description: 'Оценка речевой культуры, орфографии, пунктуации и соблюдения норм.',
        details: '• К6 (Речевая связность и богатство словаря): 2 балла. Оценивается точность выражения мыслей.\n• К7 (Орфографические нормы): 3 балла (0-1 ошибка), 2 балла (2-3 ошибки), 1 балл (4 ошибки).\n• К8 (Пунктуационные нормы): 3 балла (0-1 ошибка), 2 балла (2-3 ошибки), 1 балл (4-5 ошибок).\n• К9 (Грамматические нормы): 2 балла (0 ошибок), 1 балл (1-2 ошибки).\n• К10 (Речевые нормы): 2 балла (0-1 ошибка), 1 балл (2-3 ошибки).\n• К11 (Этические нормы): 1 балл. Эстетические и этические ошибки отсутствуют.\n• К12 (Фактическая точность): 1 балл. Фактические ошибки в фоновом материале отсутствуют.'
      }
    ]
  },
  {
    id: 'lit-ege',
    name: 'Литература ЕГЭ',
    scoreRanges: [
      { id: 'le1', grade: '100 б. (макс)', range: '48 первичных баллов (высший пилотаж без помарок)' },
      { id: 'le2', grade: '80+ б. (отл)', range: '38–47 первичных баллов (превосходное знание текстов и теории)' },
      { id: 'le3', grade: '60–79 б. (хор)', range: '28–37 первичных баллов (хорошая аргументация и анализ)' },
      { id: 'le4', grade: '40–59 б. (удовл)', range: '15–27 первичных баллов (средний уровень сочинений)' },
      { id: 'le5', grade: '32–39 б. (порог)', range: '11–14 первичных баллов (минимальный порог для подачи документов в вузы)' },
      { id: 'le6', grade: '0–31 б. (не сдал)', range: '0–10 первичных баллов' }
    ],
    criteria: [
      {
        id: 'lec1',
        name: 'Часть 1: Краткие ответы (Задания 1–3, 6–8)',
        maxPoints: 6,
        description: 'Вопросы по теории литературы, авторам, терминам и родам произведений.',
        details: '• Задания 1, 2, 3 (по эпическому произведению): по 1 балу за верное слово/термин.\n• Задания 6, 7, 8 (по лирическому произведению): по 1 баллу за верный ответ.\n• Всего 6 кратких заданий = 6 первичных баллов.'
      },
      {
        id: 'lec2',
        name: 'Часть 1: Развернутые ответы (Задания 4, 5, 9, 10)',
        maxPoints: 24,
        description: 'Анализ фрагментов произведений и стихотворений, а также сопоставление с другими авторами.',
        details: '• Задание 4 (Анализ фрагмента): 4 балла. Оценивается соответствие теме, привлечение текста для аргументации и логика.\n• Задание 5 (Сопоставление фрагмента): 8 баллов. Оценивается выбор произведения для сопоставления, глубина сопоставления, привлечение текста обоих произведений и речь.\n• Задание 9 (Анализ стихотворения): 4 балла. Анализ лирического стихотворения по теме.\n• Задание 10 (Сопоставление стихотворения): 8 баллов. Сопоставление с другим лирическим произведением по указанному направлению.'
      },
      {
        id: 'lec3',
        name: 'Часть 2: Полноформатное сочинение (Задание 11)',
        maxPoints: 18,
        description: 'Написание глубокого литературно-критического сочинения объемом не менее 200 слов на одну из предложенных тем.',
        details: '• К1 (Соответствие теме и её раскрытие): 3 балла. Тема раскрыта глубоко, многосторонне.\n• К2 (Привлечение текста произведения для аргументации): 3 балла. Текст привлекается на уровне анализа важных фрагментов, деталей, микротем.\n• К3 (Опора на теоретико-литературные понятия): 2 балла. Теоретические термины использованы для анализа произведения, а не просто упомянуты.\n• К4 (Композиционная целостность и логичность): 3 балла. Ошибки в композиции и логике рассуждения отсутствуют.\n• К5 (Соблюдение речевых норм): 3 балла. Речевые ошибки отсутствуют или допущена одна.\n• К6 (Орфографические нормы): 1 балл. Допущено не более 2-3 ошибок.\n• К7 (Пунктуационные нормы): 1 балл. Допущено не более 2-3 ошибок.\n• К8 (Грамматические нормы): 2 балла. Ошибки отсутствуют или допущена одна.'
      }
    ]
  }
];

export const GradingCriteriaModal: React.FC<GradingCriteriaModalProps> = ({ isOpen, onClose }) => {
  const [systems, setSystems] = useState<ExamSystem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  
  // Tab editing state
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState<string>('');

  // Editing range state
  const [editingRangeId, setEditingRangeId] = useState<string | null>(null);
  const [editingGrade, setEditingGrade] = useState<string>('');
  const [editingRangeText, setEditingRangeText] = useState<string>('');

  // Expanded criteria IDs
  const [expandedCriteriaIds, setExpandedCriteriaIds] = useState<Record<string, boolean>>({});

  // Form states for adding elements
  const [showAddRangeForm, setShowAddRangeForm] = useState(false);
  const [newGrade, setNewGrade] = useState('');
  const [newRangeText, setNewRangeText] = useState('');

  const [showAddCriterionForm, setShowAddCriterionForm] = useState(false);
  const [newCritName, setNewCritName] = useState('');
  const [newCritPoints, setNewCritPoints] = useState(0);
  const [newCritDesc, setNewCritDesc] = useState('');
  const [newCritDetails, setNewCritDetails] = useState('');

  // Editing criterion state
  const [editingCritId, setEditingCritId] = useState<string | null>(null);
  const [editCritName, setEditCritName] = useState('');
  const [editCritPoints, setEditCritPoints] = useState(0);
  const [editCritDesc, setEditCritDesc] = useState('');
  const [editCritDetails, setEditCritDetails] = useState('');

  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load criteria from localStorage on open
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('tutor_grading_criteria');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSystems(parsed);
            setActiveTabId(parsed[0].id);
          } else {
            setSystems(DEFAULT_CRITERIA);
            setActiveTabId(DEFAULT_CRITERIA[0].id);
          }
        } catch (e) {
          console.error("Failed to parse grading criteria", e);
          setSystems(DEFAULT_CRITERIA);
          setActiveTabId(DEFAULT_CRITERIA[0].id);
        }
      } else {
        setSystems(DEFAULT_CRITERIA);
        setActiveTabId(DEFAULT_CRITERIA[0].id);
      }
    }
  }, [isOpen]);

  // Auto-save changes to localStorage
  const saveSystems = (updated: ExamSystem[]) => {
    setSystems(updated);
    localStorage.setItem('tutor_grading_criteria', JSON.stringify(updated));
  };

  if (!isOpen) return null;

  const activeSystem = systems.find(s => s.id === activeTabId) || systems[0];

  // Tab operations
  const handleAddTab = () => {
    const newId = `exam-${Date.now()}`;
    const newExam: ExamSystem = {
      id: newId,
      name: 'Новый Экзамен',
      scoreRanges: [
        { id: `r-${Date.now()}-1`, grade: '5', range: 'отличный результат' },
        { id: `r-${Date.now()}-2`, grade: '4', range: 'хороший результат' },
        { id: `r-${Date.now()}-3`, grade: '3', range: 'удовлетворительно' }
      ],
      criteria: [
        {
          id: `c-${Date.now()}-1`,
          name: 'Основной критерий',
          maxPoints: 10,
          description: 'Краткое описание требований критерия.',
          details: '• Шаг 1: Правильное оформление (5 баллов).\n• Шаг 2: Верные вычисления (5 баллов).'
        }
      ]
    };
    const updated = [...systems, newExam];
    saveSystems(updated);
    setActiveTabId(newId);
    setEditingTabId(newId);
    setEditingTabName(newExam.name);
  };

  const handleStartRenameTab = (system: ExamSystem) => {
    setEditingTabId(system.id);
    setEditingTabName(system.name);
  };

  const handleSaveRenameTab = () => {
    if (!editingTabName.trim()) return;
    const updated = systems.map(s => {
      if (s.id === editingTabId) {
        return { ...s, name: editingTabName.trim() };
      }
      return s;
    });
    saveSystems(updated);
    setEditingTabId(null);
  };

  const handleDeleteTab = (idToDelete: string) => {
    if (systems.length <= 1) {
      setErrorMessage("Нельзя удалить последнюю оставшуюся вкладку!");
      return;
    }
    setCustomConfirm({
      title: 'Удалить систему оценивания',
      message: 'Вы уверены, что хотите удалить эту систему оценивания?',
      onConfirm: () => {
        const updated = systems.filter(s => s.id !== idToDelete);
        saveSystems(updated);
        if (activeTabId === idToDelete) {
          setActiveTabId(updated[0].id);
        }
        setCustomConfirm(null);
      }
    });
  };

  // Score ranges operations
  const handleStartEditRange = (range: ScoreRange) => {
    setEditingRangeId(range.id);
    setEditingGrade(range.grade);
    setEditingRangeText(range.range);
  };

  const handleSaveEditRange = () => {
    if (!editingGrade.trim() || !editingRangeText.trim() || !activeSystem) return;
    const updatedRanges = activeSystem.scoreRanges.map(r => {
      if (r.id === editingRangeId) {
        return { ...r, grade: editingGrade.trim(), range: editingRangeText.trim() };
      }
      return r;
    });
    
    const updatedSystems = systems.map(s => {
      if (s.id === activeSystem.id) {
        return { ...s, scoreRanges: updatedRanges };
      }
      return s;
    });
    saveSystems(updatedSystems);
    setEditingRangeId(null);
  };

  const handleDeleteRange = (rangeId: string) => {
    if (!activeSystem) return;
    const updatedRanges = activeSystem.scoreRanges.filter(r => r.id !== rangeId);
    const updatedSystems = systems.map(s => {
      if (s.id === activeSystem.id) {
        return { ...s, scoreRanges: updatedRanges };
      }
      return s;
    });
    saveSystems(updatedSystems);
  };

  const handleAddRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrade.trim() || !newRangeText.trim() || !activeSystem) return;
    const newR: ScoreRange = {
      id: `range-${Date.now()}`,
      grade: newGrade.trim(),
      range: newRangeText.trim()
    };
    const updatedSystems = systems.map(s => {
      if (s.id === activeSystem.id) {
        return { ...s, scoreRanges: [...s.scoreRanges, newR] };
      }
      return s;
    });
    saveSystems(updatedSystems);
    setNewGrade('');
    setNewRangeText('');
    setShowAddRangeForm(false);
  };

  // Criteria operations
  const toggleCriterionExpanded = (id: string) => {
    setExpandedCriteriaIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCritName.trim() || !activeSystem) return;
    const newC: CriterionItem = {
      id: `crit-${Date.now()}`,
      name: newCritName.trim(),
      maxPoints: Number(newCritPoints) || 0,
      description: newCritDesc.trim(),
      details: newCritDetails.trim()
    };
    const updatedSystems = systems.map(s => {
      if (s.id === activeSystem.id) {
        return { ...s, criteria: [...s.criteria, newC] };
      }
      return s;
    });
    saveSystems(updatedSystems);
    setNewCritName('');
    setNewCritPoints(0);
    setNewCritDesc('');
    setNewCritDetails('');
    setShowAddCriterionForm(false);
    // Expand newly created
    setExpandedCriteriaIds(prev => ({ ...prev, [newC.id]: true }));
  };

  const handleStartEditCrit = (crit: CriterionItem) => {
    setEditingCritId(crit.id);
    setEditCritName(crit.name);
    setEditCritPoints(crit.maxPoints);
    setEditCritDesc(crit.description);
    setEditCritDetails(crit.details);
  };

  const handleSaveEditCrit = () => {
    if (!editCritName.trim() || !activeSystem) return;
    const updatedCriteria = activeSystem.criteria.map(c => {
      if (c.id === editingCritId) {
        return {
          ...c,
          name: editCritName.trim(),
          maxPoints: Number(editCritPoints) || 0,
          description: editCritDesc.trim(),
          details: editCritDetails.trim()
        };
      }
      return c;
    });

    const updatedSystems = systems.map(s => {
      if (s.id === activeSystem.id) {
        return { ...s, criteria: updatedCriteria };
      }
      return s;
    });
    saveSystems(updatedSystems);
    setEditingCritId(null);
  };

  const handleDeleteCrit = (critId: string) => {
    if (!activeSystem) return;
    setCustomConfirm({
      title: 'Удалить критерий',
      message: 'Удалить этот критерий оценивания?',
      onConfirm: () => {
        const updatedCriteria = activeSystem.criteria.filter(c => c.id !== critId);
        const updatedSystems = systems.map(s => {
          if (s.id === activeSystem.id) {
            return { ...s, criteria: updatedCriteria };
          }
          return s;
        });
        saveSystems(updatedSystems);
        setCustomConfirm(null);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#060709]/80 backdrop-blur-md animate-fadeIn" id="grading-modal">
      <div className="bg-[#0f111a] border border-white/5 rounded-2xl w-full max-w-4xl h-[90vh] sm:h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Header decoration bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C3B4FC] via-[#E598B8] to-[#C3B4FC]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-[#141724]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C3B4FC]/10 border border-[#C3B4FC]/25 flex items-center justify-center">
              <Award className="w-4.5 h-4.5 text-[#C3B4FC]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-white tracking-wide">Системы оценивания и критерии баллов</h2>
              <p className="text-[10px] text-white/40 font-light mt-0.5">Шкалы перевода баллов в оценки и критерии экзаменов ОГЭ/ЕГЭ</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 text-rose-300 p-3 text-xs flex items-center justify-between z-10 animate-fadeIn">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white font-bold ml-2">×</button>
          </div>
        )}

        {/* Modal content area: Split layout (Left: Tabs sidebar, Right: grading tables & details) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT SIDEBAR: Exam tabs */}
          <div className="w-full md:w-56 bg-[#11131f] border-b md:border-b-0 md:border-r border-white/5 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible md:overflow-y-auto p-2 gap-1.5 shrink-0 scrollbar-none">
            {systems.map((sys) => {
              const isActive = sys.id === activeTabId;
              const isEditing = sys.id === editingTabId;

              return (
                <div 
                  key={sys.id}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition group shrink-0 md:shrink select-none text-xs ${
                    isActive 
                      ? 'bg-[#C3B4FC]/10 border border-[#C3B4FC]/25 text-[#C3B4FC]' 
                      : 'border border-transparent text-white/60 hover:bg-white/[0.02] hover:text-white'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text"
                        value={editingTabName}
                        onChange={(e) => setEditingTabName(e.target.value)}
                        className="bg-[#0f111a] text-white text-[11px] px-1.5 py-0.5 rounded border border-[#C3B4FC]/30 focus:outline-none focus:border-[#C3B4FC] w-24 md:w-full"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameTab()}
                      />
                      <button 
                        onClick={handleSaveRenameTab}
                        className="text-emerald-400 p-0.5 hover:bg-white/5 rounded cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        setActiveTabId(sys.id);
                        setEditingRangeId(null);
                        setEditingCritId(null);
                      }}
                      className="flex-1 text-left cursor-pointer truncate flex items-center justify-between"
                    >
                      <span className="truncate pr-1 font-light tracking-wide">{sys.name}</span>
                      
                      {/* Control buttons inside tab */}
                      <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRenameTab(sys);
                          }}
                          className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white cursor-pointer"
                          title="Переименовать"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTab(sys.id);
                          }}
                          className="p-1 hover:bg-white/10 rounded text-rose-400 hover:text-rose-300 cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Exam tab Button */}
            <button
              onClick={handleAddTab}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-dashed border-white/10 hover:border-[#C3B4FC]/40 text-white/50 hover:text-[#C3B4FC] transition text-xs shrink-0 md:shrink md:mt-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать систему</span>
            </button>
          </div>

          {/* RIGHT PANELS: Grading Table & Detailed Criteria Accordions */}
          {activeSystem ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* SECTION 1: Score translation scale (Шкала перевода баллов) */}
              <div className="space-y-3 bg-[#11131f]/50 border border-white/[0.03] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#C3B4FC]/80" strokeWidth={1.5} />
                    <h3 className="text-xs font-medium text-white uppercase tracking-wider">Шкала перевода баллов в оценки</h3>
                  </div>
                  {!showAddRangeForm && (
                    <button
                      onClick={() => setShowAddRangeForm(true)}
                      className="flex items-center gap-1 text-[10px] text-[#C3B4FC] hover:text-[#C3B4FC]/80 transition font-medium tracking-wide uppercase cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Добавить оценку</span>
                    </button>
                  )}
                </div>

                {/* Inline add range form */}
                {showAddRangeForm && (
                  <form onSubmit={handleAddRange} className="flex flex-col sm:flex-row items-end gap-3 bg-[#0f111a] p-3 border border-white/5 rounded-xl">
                    <div className="w-full sm:w-24">
                      <label className="block text-[9px] text-white/40 uppercase mb-1">Оценка</label>
                      <input 
                        type="text" 
                        placeholder="5, 4, 3 или др."
                        value={newGrade}
                        onChange={(e) => setNewGrade(e.target.value)}
                        className="w-full bg-[#11131f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C3B4FC]"
                        required
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[9px] text-white/40 uppercase mb-1">Диапазон баллов / Критерии</label>
                      <input 
                        type="text" 
                        placeholder="например, 22–31 баллов"
                        value={newRangeText}
                        onChange={(e) => setNewRangeText(e.target.value)}
                        className="w-full bg-[#11131f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C3B4FC]"
                        required
                      />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        type="submit"
                        className="px-3 py-1.5 bg-[#C3B4FC]/15 hover:bg-[#C3B4FC]/25 border border-[#C3B4FC]/30 rounded-lg text-xs text-[#C3B4FC] cursor-pointer"
                      >
                        Сохранить
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowAddRangeForm(false)}
                        className="px-3 py-1.5 hover:bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                )}

                {/* Ranges list layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeSystem.scoreRanges.map((range) => {
                    const isRangeEditing = editingRangeId === range.id;

                    return (
                      <div 
                        key={range.id}
                        className="flex items-center justify-between p-2.5 bg-[#0f111a]/85 border border-white/[0.03] rounded-xl hover:border-white/10 transition group text-xs"
                      >
                        {isRangeEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input 
                              type="text" 
                              value={editingGrade} 
                              onChange={(e) => setEditingGrade(e.target.value)}
                              className="w-12 bg-[#11131f] border border-white/10 rounded px-1.5 py-0.5 text-xs text-center text-white"
                            />
                            <input 
                              type="text" 
                              value={editingRangeText} 
                              onChange={(e) => setEditingRangeText(e.target.value)}
                              className="flex-1 bg-[#11131f] border border-white/10 rounded px-1.5 py-0.5 text-xs text-white"
                            />
                            <button 
                              onClick={handleSaveEditRange}
                              className="text-emerald-400 p-0.5 hover:bg-white/5 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6.5 h-6.5 rounded-lg bg-[#C3B4FC]/10 border border-[#C3B4FC]/25 flex items-center justify-center font-semibold text-[#C3B4FC] shrink-0 text-xs sm:text-sm">
                                {range.grade}
                              </span>
                              <span className="text-white/80 font-light truncate leading-normal" title={range.range}>
                                {range.range}
                              </span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-2">
                              <button
                                onClick={() => handleStartEditRange(range)}
                                className="p-1 hover:bg-white/5 rounded text-white/50 hover:text-white cursor-pointer"
                                title="Редактировать"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteRange(range.id)}
                                className="p-1 hover:bg-white/5 rounded text-rose-400 hover:text-rose-350 cursor-pointer"
                                title="Удалить"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {activeSystem.scoreRanges.length === 0 && (
                    <p className="text-[10px] text-white/30 italic p-2 col-span-2">Шкалы для этого экзамена пока не настроены.</p>
                  )}
                </div>
              </div>

              {/* SECTION 2: Detailed criteria components (Критерии оценивания по частям) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#E598B8]/80" strokeWidth={1.5} />
                    <h3 className="text-xs font-medium text-white uppercase tracking-wider">Критерии и структура баллов</h3>
                  </div>
                  {!showAddCriterionForm && (
                    <button
                      onClick={() => {
                        setEditingCritId(null);
                        setShowAddCriterionForm(true);
                      }}
                      className="flex items-center gap-1 text-[10px] text-[#E598B8] hover:text-[#E598B8]/80 transition font-medium tracking-wide uppercase cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Создать критерий</span>
                    </button>
                  )}
                </div>

                {/* Form to add a new detailed criterion */}
                {showAddCriterionForm && (
                  <form onSubmit={handleAddCriterion} className="bg-[#11131f] border border-white/5 rounded-2xl p-4 space-y-3">
                    <h4 className="text-[11px] font-semibold text-white/80 uppercase tracking-wider mb-2">Новый критерий оценивания</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[9px] text-white/40 uppercase mb-1">Название критерия/части</label>
                        <input 
                          type="text" 
                          placeholder="например, Сочинение (Критерий К1)"
                          value={newCritName}
                          onChange={(e) => setNewCritName(e.target.value)}
                          className="w-full bg-[#0f111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C3B4FC]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-white/40 uppercase mb-1">Макс. балл</label>
                        <input 
                          type="number" 
                          value={newCritPoints}
                          onChange={(e) => setNewCritPoints(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-[#0f111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C3B4FC]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] text-white/40 uppercase mb-1">Краткое резюме / Описание</label>
                      <input 
                        type="text" 
                        placeholder="например, Оценивает полноту раскрытия темы."
                        value={newCritDesc}
                        onChange={(e) => setNewCritDesc(e.target.value)}
                        className="w-full bg-[#0f111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C3B4FC]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-white/40 uppercase mb-1">Детализированные правила развертывания (каждая строка как пункт)</label>
                      <textarea
                        rows={3}
                        placeholder="• Критерий С1 (3 балла): Сформулирован тезис...&#10;• Критерий С2 (2 балла): ..."
                        value={newCritDetails}
                        onChange={(e) => setNewCritDetails(e.target.value)}
                        className="w-full bg-[#0f111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C3B4FC] font-mono leading-relaxed"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button 
                        type="button"
                        onClick={() => setShowAddCriterionForm(false)}
                        className="px-3.5 py-1.5 hover:bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button 
                        type="submit"
                        className="px-3.5 py-1.5 bg-[#E598B8]/15 hover:bg-[#E598B8]/25 border border-[#E598B8]/30 rounded-lg text-xs text-[#E598B8] font-medium cursor-pointer"
                      >
                        Сохранить
                      </button>
                    </div>
                  </form>
                )}

                {/* Criteria items listing */}
                <div className="space-y-3">
                  {activeSystem.criteria.map((crit) => {
                    const isExpanded = !!expandedCriteriaIds[crit.id];
                    const isCritEditing = editingCritId === crit.id;

                    return (
                      <div 
                        key={crit.id}
                        className="bg-[#11131f]/40 border border-white/5 rounded-2xl overflow-hidden transition hover:border-white/10"
                      >
                        {isCritEditing ? (
                          <div className="p-4 space-y-3 bg-[#11131f]">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-2">
                                <label className="block text-[9px] text-white/40 uppercase mb-1">Название критерия</label>
                                <input 
                                  type="text" 
                                  value={editCritName}
                                  onChange={(e) => setEditCritName(e.target.value)}
                                  className="w-full bg-[#0f111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-white/40 uppercase mb-1">Макс. балл</label>
                                <input 
                                  type="number" 
                                  value={editCritPoints}
                                  onChange={(e) => setEditCritPoints(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-full bg-[#0f111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[9px] text-white/40 uppercase mb-1">Описание</label>
                              <input 
                                type="text" 
                                value={editCritDesc}
                                onChange={(e) => setEditCritDesc(e.target.value)}
                                className="w-full bg-[#0f111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] text-white/40 uppercase mb-1">Подробные критерии</label>
                              <textarea
                                rows={4}
                                value={editCritDetails}
                                onChange={(e) => setEditCritDetails(e.target.value)}
                                className="w-full bg-[#0f111a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono leading-relaxed"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button 
                                type="button"
                                onClick={() => setEditingCritId(null)}
                                className="px-3 py-1.5 hover:bg-white/5 border border-white/10 rounded-lg text-xs text-white/60"
                              >
                                Отмена
                              </button>
                              <button 
                                type="button"
                                onClick={handleSaveEditCrit}
                                className="px-3 py-1.5 bg-[#C3B4FC]/15 hover:bg-[#C3B4FC]/25 border border-[#C3B4FC]/30 rounded-lg text-xs text-[#C3B4FC]"
                              >
                                Применить
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Accordion trigger row */}
                            <div 
                              onClick={() => toggleCriterionExpanded(crit.id)}
                              className="p-3.5 flex items-center justify-between cursor-pointer select-none gap-4"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-medium text-white tracking-wide">{crit.name}</h4>
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] bg-white/5 border border-white/10 text-[#C3B4FC] font-semibold">
                                    до {crit.maxPoints} б.
                                  </span>
                                </div>
                                {crit.description && (
                                  <p className="text-[10px] text-white/45 font-light mt-1 truncate">{crit.description}</p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                {/* Edit & Delete Controls */}
                                <div className="flex items-center gap-1 sm:opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleStartEditCrit(crit)}
                                    className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-[#C3B4FC] cursor-pointer"
                                    title="Изменить"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCrit(crit.id)}
                                    className="p-1 hover:bg-white/5 rounded text-rose-400 hover:text-rose-350 cursor-pointer"
                                    title="Удалить"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-white/40" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-white/40" />
                                )}
                              </div>
                            </div>

                            {/* Accordion expanding details body */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1.5 border-t border-white/[0.03] bg-[#0c0d15]/50 text-[11px] text-white/70 leading-relaxed font-mono whitespace-pre-line">
                                {crit.details ? (
                                  crit.details
                                ) : (
                                  <span className="text-white/30 italic">Подробные критерии не заполнены. Нажмите значок редактирования, чтобы заполнить их.</span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                  {activeSystem.criteria.length === 0 && (
                    <div className="text-center p-8 bg-[#11131f]/20 border border-dashed border-white/5 rounded-2xl">
                      <AlertTriangle className="w-6 h-6 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/40 font-light">Критерии для этого экзамена еще не созданы.</p>
                      <button
                        onClick={() => setShowAddCriterionForm(true)}
                        className="mt-3 text-[10px] text-[#E598B8] uppercase tracking-wider font-semibold hover:underline"
                      >
                        Создать первый критерий
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white/40">
              <Award className="w-12 h-12 text-white/10 mb-2" />
              <p className="text-sm font-light">Выберите систему оценивания слева или создайте новую.</p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/5 bg-[#141724] flex items-center justify-between text-[10px] text-white/30 select-none">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-white/30" />
            <span>Все изменения сохраняются в фоновом режиме автоматически.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs transition duration-200 cursor-pointer"
          >
            Закрыть
          </button>
        </div>

      </div>

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
    </div>
  );
};
