import React, { useState } from 'react';
import { Plus, Trash2, Copy, Check, FileText, Sparkles, BookOpen, ChevronRight, X, ArrowUp, GraduationCap, Laptop, ExternalLink, Search } from 'lucide-react';
import { TestTemplate, TestQuestion, Student, StudentCabinet } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { safeStorage } from '../utils/safeStorage';

interface TestLibraryProps {
  templates: TestTemplate[];
  onSaveTemplate: (template: TestTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  students: Student[];
  cabinets: Record<string, StudentCabinet>;
  onUpdateCabinets: (updated: Record<string, StudentCabinet>) => void;
  onUpdateStudent?: (updatedStudent: Student) => void;
  user?: any;
}

export const TestLibrary: React.FC<TestLibraryProps> = ({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  students,
  cabinets,
  onUpdateCabinets,
  onUpdateStudent,
  user
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'tests' | 'cabinets'>('tests');
  const [searchCabinetQuery, setSearchCabinetQuery] = useState('');
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);
  const [assigningToStudent, setAssigningToStudent] = useState<Student | null>(null);

  // Form states for constructor
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'OGE' | 'EGE'>('EGE');
  const [questions, setQuestions] = useState<TestQuestion[]>([]);

  // Assign modal state
  const [assigningTemplate, setAssigningTemplate] = useState<TestTemplate | null>(null);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  // Create or edit handler
  const handleStartCreate = () => {
    setTitle('');
    setType('EGE');
    setQuestions([
      {
        id: 'q-1',
        type: 'short',
        text: 'Задание 1: Укажите варианты ответов...',
        correctAnswer: ''
      }
    ]);
    setEditingTemplate(null);
    setIsCreating(true);
  };

  const handleStartEdit = (tmpl: TestTemplate) => {
    setEditingTemplate(tmpl);
    setTitle(tmpl.title);
    setType(tmpl.type);
    setQuestions([...tmpl.questions]);
    setIsCreating(true);
  };

  const syncQuestionAnswerValue = (q: TestQuestion, val: string): Partial<TestQuestion> => {
    if (q.type === 'short' || q.type === 'matching') {
      return { correctAnswer: val };
    } else if (q.type === 'single') {
      const idx = parseInt(val) - 1;
      const correctOptions = (q.options || []).map((_, i) => i === idx);
      return { correctAnswer: val, correctOptions };
    } else if (q.type === 'multiple') {
      const indices = val.split(/[,\s]+/).map(x => parseInt(x.trim()) - 1).filter(n => !isNaN(n));
      const correctOptions = (q.options || []).map((_, i) => indices.includes(i));
      return { correctAnswer: val, correctOptions };
    }
    return { correctAnswer: val };
  };

  const syncQuestionCorrectOptions = (q: TestQuestion, correctOpts: boolean[]): Partial<TestQuestion> => {
    if (q.type === 'single') {
      const idx = correctOpts.findIndex(x => x);
      const keyVal = idx !== -1 ? String(idx + 1) : '';
      return { correctOptions: correctOpts, correctAnswer: keyVal };
    } else if (q.type === 'multiple') {
      const indices = correctOpts.map((x, i) => x ? String(i + 1) : '').filter(Boolean);
      const keyVal = indices.join(',');
      return { correctOptions: correctOpts, correctAnswer: keyVal };
    }
    return { correctOptions: correctOpts };
  };

  const handleAddQuestionWithType = (type: 'short' | 'single' | 'multiple' | 'matching') => {
    const newQuestion: TestQuestion = {
      id: 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      type,
      text: '',
      taskNumber: String(questions.length + 1),
      correctAnswer: '',
      options: type === 'single' || type === 'multiple' ? ['', '', '', ''] : undefined,
      correctOptions: type === 'single' || type === 'multiple' ? [false, false, false, false] : undefined,
      explanation: ''
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const handleAddQuestion = () => {
    handleAddQuestionWithType('short');
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleQuestionChange = (id: string, updatedFields: Partial<TestQuestion>) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, ...updatedFields } as TestQuestion;
      }
      return q;
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTemplate: TestTemplate = {
      id: editingTemplate?.id || 'tmpl-' + Date.now(),
      title: title.trim(),
      type,
      createdAt: editingTemplate?.createdAt || new Date().toISOString(),
      questions: questions.map((q, idx) => ({
        ...q,
        // Ensure index order is beautiful
        text: q.text.trim() || `Задание ${idx + 1}`
      }))
    };

    onSaveTemplate(newTemplate);
    setIsCreating(false);
    setEditingTemplate(null);
  };

  // Assign to Student helper
  const handleAssignToStudent = (studentId: string, template: TestTemplate) => {
    const student = students.find(s => s.id === studentId);
    if (!student || !student.cabinetId) return;

    const cabinetId = student.cabinetId;
    const cabinet = cabinets[cabinetId];
    if (!cabinet) return;

    // Create assigned test structure
    const newAssignedTest = {
      id: 'assigned-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      templateId: template.id,
      title: template.title,
      type: template.type,
      questions: JSON.parse(JSON.stringify(template.questions)), // deep copy questions
      status: 'pending' as const,
      assignedAt: new Date().toISOString()
    };

    const updatedCabinet: StudentCabinet = {
      ...cabinet,
      assignedTests: [newAssignedTest, ...cabinet.assignedTests]
    };

    onUpdateCabinets({
      ...cabinets,
      [cabinetId]: updatedCabinet
    });

    setAssigningTemplate(null);
    alert(`Тест "${template.title}" успешно добавлен в кабинет ученика: ${student.name}!`);
  };

  const handleCreateCabinet = (student: Student) => {
    const cabId = `cab-${Math.random().toString(36).substring(2, 11)}`;
    const newCabinet: StudentCabinet = {
      id: cabId,
      studentId: student.id,
      studentName: student.name,
      tutorId: user?.uid || safeStorage.getItem('guest_tutor_id') || 'guest',
      createdAt: new Date().toISOString(),
      assignedTests: []
    };
    if (onUpdateStudent) {
      onUpdateStudent({ ...student, cabinetId: cabId });
    }
    onUpdateCabinets({
      ...cabinets,
      [cabId]: newCabinet
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-4">
      {isCreating ? (
        /* Test Constructor Form */
        <div className="bg-[#12131a]/85 border border-white/5 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#F4B5CD] font-bold">
                {editingTemplate ? 'Редактировать тест' : 'Создать новый тест'}
              </span>
              <h3 className="text-lg font-serif text-white font-medium mt-0.5">
                Конструктор вариантов
              </h3>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">
                  Название варианта
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Вариант 1 - Орфография и Пунктуация"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full text-xs px-4 py-3 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl placeholder-white/20 transition"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">
                  Категория экзамена
                </label>
                <div className="grid grid-cols-2 gap-2 h-[42px]">
                  <button
                    type="button"
                    onClick={() => setType('EGE')}
                    className={`h-full text-xs font-bold rounded-xl transition cursor-pointer border ${
                      type === 'EGE'
                        ? 'bg-[#F4B5CD]/15 border-[#F4B5CD]/30 text-[#F4B5CD]'
                        : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                    }`}
                  >
                    ЕГЭ (Русский)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('OGE')}
                    className={`h-full text-xs font-bold rounded-xl transition cursor-pointer border ${
                      type === 'OGE'
                        ? 'bg-[#C3B4FC]/15 border-[#C3B4FC]/30 text-[#C3B4FC]'
                        : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                    }`}
                  >
                    ОГЭ (Русский)
                  </button>
                </div>
              </div>
            </div>

            {/* Questions list */}
            <div className="space-y-6 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-white/40">
                  Содержимое варианта ({questions.length} зад.)
                </span>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-white/30 text-xs">
                  Нет добавленных вопросов. Используйте кнопки ниже, чтобы добавить первое задание.
                </div>
              ) : (
                <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="bg-[#12131a]/85 border border-white/5 p-6 rounded-2xl space-y-4 relative group/question shadow-xl"
                    >
                      {/* Question Header & Delete */}
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <h3 className="text-xs uppercase tracking-wider font-extrabold text-[#F4B5CD]">
                          ЗАДАНИЕ #{idx + 1}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="p-1.5 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                          title="Удалить задание"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* ФОРМАТ ОТВЕТА */}
                      <div className="space-y-2">
                        <label className="block text-[9px] uppercase tracking-widest font-extrabold text-white/45">
                          ФОРМАТ ОТВЕТА
                        </label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                          {[
                            { value: 'short', label: '✍️ Короткий ответ' },
                            { value: 'single', label: '⚪ Один вариант' },
                            { value: 'multiple', label: '✔️ Несколько вариантов' },
                            { value: 'matching', label: '🔗 Соответствие (АБВГ)' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                const currentVal = q.correctAnswer || '';
                                let newFields: Partial<TestQuestion> = { type: opt.value as any };
                                if (opt.value === 'short' || opt.value === 'matching') {
                                  newFields.options = undefined;
                                  newFields.correctOptions = undefined;
                                  newFields.correctAnswer = currentVal;
                                } else {
                                  newFields.options = q.options || ['', '', '', ''];
                                  newFields.correctOptions = q.correctOptions || [false, false, false, false];
                                  newFields.correctAnswer = currentVal;
                                }
                                handleQuestionChange(q.id, newFields);
                              }}
                              className={`py-2.5 text-[11px] font-semibold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                q.type === opt.value
                                  ? 'bg-[#F4B5CD]/10 border-[#F4B5CD] text-[#F4B5CD] shadow-[0_0_12px_rgba(244,181,205,0.06)]'
                                  : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05] hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* НОМЕР ЗАДАНИЯ & ПРАВИЛЬНЫЙ ОТВЕТ */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <label className="block text-[9px] uppercase tracking-widest font-extrabold text-white/45 mb-1.5">
                            НОМЕР ЗАДАНИЯ ОГЭ/ЕГЭ
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Например: 2"
                            value={q.taskNumber || ''}
                            onChange={e => handleQuestionChange(q.id, { taskNumber: e.target.value })}
                            className="w-full text-xs px-4 py-3 border border-white/5 bg-black/40 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl placeholder-white/10 transition"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[9px] uppercase tracking-widest font-extrabold text-white/45 mb-1.5">
                            ПРАВИЛЬНЫЙ ОТВЕТ ПО КЛЮЧУ
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={
                              q.type === 'short'
                                ? 'Например: безразличный/привет (варианты через "/")'
                                : q.type === 'matching'
                                ? 'Например: 4152'
                                : q.type === 'single'
                                ? 'Например: 2 (индекс правильного ответа)'
                                : 'Например: 1,3 (правильные индексы через запятую)'
                            }
                            value={q.correctAnswer || ''}
                            onChange={e => {
                              const syncFields = syncQuestionAnswerValue(q, e.target.value);
                              handleQuestionChange(q.id, syncFields);
                            }}
                            className="w-full text-xs px-4 py-3 border border-white/5 bg-black/40 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl placeholder-white/20 transition font-mono"
                          />
                        </div>
                      </div>

                      {/* ТЕКСТ ЗАДАНИЯ */}
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-extrabold text-white/45 mb-1.5">
                          ТЕКСТ ЗАДАНИЯ (ФОРМУЛИРОВКА ВОПРОСА)
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={q.text}
                          onChange={e => handleQuestionChange(q.id, { text: e.target.value })}
                          placeholder="Например: Укажите варианты ответов, в которых во всех словах одного ряда пропущена одна и та же буква..."
                          className="w-full text-xs px-4 py-3 border border-white/5 bg-black/40 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl placeholder-white/20 transition resize-none leading-relaxed"
                        />
                      </div>

                      {/* ПОЯСНЕНИЕ / ПРАВИЛО */}
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest font-extrabold text-white/45 mb-1.5">
                          ПОЯСНЕНИЕ / ПРАВИЛО ДЛЯ УЧЕНИКА ПОСЛЕ ПРОВЕРКИ
                        </label>
                        <textarea
                          rows={2}
                          value={q.explanation || ''}
                          onChange={e => handleQuestionChange(q.id, { explanation: e.target.value })}
                          placeholder="Например: Слово БЕЗУПРЕЧНЫЙ пишется с приставкой БЕЗ-, так как далее следует звонкий согласный..."
                          className="w-full text-xs px-4 py-3 border border-white/5 bg-black/40 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl placeholder-white/20 transition resize-none leading-relaxed"
                        />
                      </div>

                      {/* OPTIONS LIST FOR SINGLE / MULTIPLE */}
                      {(q.type === 'single' || q.type === 'multiple') && (
                        <div className="space-y-3 pt-3 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] uppercase tracking-widest font-extrabold text-white/40">
                              Варианты выбора и правильный ответ (через галочки)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentOpts = q.options || [];
                                const currentCorrect = q.correctOptions || [];
                                const updatedOpts = [...currentOpts, ''];
                                const updatedCorrect = [...currentCorrect, false];
                                handleQuestionChange(q.id, {
                                  options: updatedOpts,
                                  correctOptions: updatedCorrect
                                });
                              }}
                              className="text-[9px] text-[#F4B5CD] hover:underline flex items-center gap-1 cursor-pointer font-bold uppercase tracking-wider"
                            >
                              <Plus className="w-2.5 h-2.5" /> Добавить вариант
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(q.options || []).map((opt, optIdx) => {
                              const isCorrect = !!(q.correctOptions || [])[optIdx];
                              return (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentCorrect = [...(q.correctOptions || [])];
                                      if (q.type === 'multiple') {
                                        currentCorrect[optIdx] = !currentCorrect[optIdx];
                                      } else {
                                        currentCorrect.fill(false);
                                        currentCorrect[optIdx] = true;
                                      }
                                      const syncFields = syncQuestionCorrectOptions(q, currentCorrect);
                                      handleQuestionChange(q.id, syncFields);
                                    }}
                                    className={`p-2 border rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
                                      isCorrect
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-white/5 border-white/10 text-white/20 hover:text-white/40'
                                    }`}
                                    title="Отметить как правильный"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>

                                  <input
                                    type="text"
                                    required
                                    value={opt}
                                    onChange={e => {
                                      const currentOpts = [...(q.options || [])];
                                      currentOpts[optIdx] = e.target.value;
                                      handleQuestionChange(q.id, { options: currentOpts });
                                    }}
                                    placeholder={`Вариант ${optIdx + 1}`}
                                    className="flex-1 text-xs px-3 py-2 border border-white/5 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl placeholder-white/25 transition"
                                  />

                                  {(q.options || []).length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentOpts = (q.options || []).filter((_, oIdx) => oIdx !== optIdx);
                                        const currentCorrect = (q.correctOptions || []).filter((_, oIdx) => oIdx !== optIdx);
                                        const updatedFields = {
                                          options: currentOpts,
                                          correctOptions: currentCorrect
                                        };
                                        const syncFields = syncQuestionCorrectOptions({ ...q, ...updatedFields }, currentCorrect);
                                        handleQuestionChange(q.id, { ...updatedFields, ...syncFields });
                                      }}
                                      className="p-2 text-white/20 hover:text-rose-400 transition cursor-pointer"
                                      title="Удалить вариант"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ДОБАВИТЬ НОВОЕ ЗАДАНИЕ SECTION */}
              <div className="space-y-3 pt-6 border-t border-white/5">
                <span className="block text-[10px] uppercase tracking-widest font-extrabold text-white/40">
                  ДОБАВИТЬ НОВОЕ ЗАДАНИЕ:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { type: 'short', label: '✍️ Короткий ответ' },
                    { type: 'single', label: '⚪ Один вариант' },
                    { type: 'multiple', label: '✔️ Несколько вариантов' },
                    { type: 'matching', label: '🔗 Соответствие' }
                  ].map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleAddQuestionWithType(item.type as any)}
                      className="py-3 px-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#F4B5CD]/30 text-white/70 hover:text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span className="text-white/40 text-sm font-light">+</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Form footer actions */}
            <div className="pt-6 border-t border-white/5">
              <button
                type="submit"
                disabled={questions.length === 0}
                className="w-full py-4 bg-[#C3B4FC]/10 hover:bg-[#C3B4FC]/20 border border-[#C3B4FC]/15 text-[#C3B4FC] hover:text-white rounded-xl transition text-xs tracking-wider uppercase font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] shadow-lg disabled:opacity-40 disabled:pointer-events-none"
              >
                Сохранить и добавить в библиотеку
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Test Library & Cabinets List Container */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#F4B5CD] font-bold">
                База тестов и кабинеты учеников
              </span>
              <h2 className="font-serif text-xl md:text-2xl text-white tracking-wide mt-0.5">
                Материалы и обучение
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-white/5 p-1 rounded-xl border border-white/5 flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('tests')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    activeSubTab === 'tests'
                      ? 'bg-[#F4B5CD]/10 text-[#F4B5CD] border border-[#F4B5CD]/20'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Тесты ({templates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('cabinets')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    activeSubTab === 'cabinets'
                      ? 'bg-[#F4B5CD]/10 text-[#F4B5CD] border border-[#F4B5CD]/20'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Кабинеты ({students.filter(s => s.isActive).length})
                </button>
              </div>

              {activeSubTab === 'tests' && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="px-4 h-9 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[9px] tracking-widest uppercase font-bold transition rounded-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] shadow-md shadow-[#F4B5CD]/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Создать тест</span>
                </button>
              )}
            </div>
          </div>

          {activeSubTab === 'tests' ? (
            templates.length === 0 ? (
              <div className="bg-[#12131a]/70 border border-dashed border-white/10 rounded-2xl p-16 text-center max-w-lg mx-auto space-y-4 backdrop-blur-md">
                <div className="w-12 h-12 rounded-2xl bg-[#F4B5CD]/10 border border-[#F4B5CD]/20 flex items-center justify-center mx-auto text-xl">
                  📝
                </div>
                <div>
                  <h4 className="font-serif text-base text-white">Тестов пока нет</h4>
                  <p className="text-[11px] text-white/40 leading-relaxed mt-1 font-light">
                    Создайте первый вариант в конструкторе, добавляйте задания с автоматической проверкой ответов и делитесь ими с учениками!
                  </p>
                </div>
                <button
                  onClick={handleStartCreate}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 rounded-xl text-[10px] uppercase tracking-wider font-bold transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F4B5CD]" />
                  Конструктор тестов
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(tmpl => {
                  const totalQuestions = tmpl.questions?.length || 0;
                  return (
                    <div
                      key={tmpl.id}
                      className="bg-[#12131a]/80 border border-white/5 hover:border-white/15 p-5 rounded-2xl flex flex-col justify-between min-h-[160px] transition duration-300 group shadow-xl backdrop-blur-md relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#F4B5CD]/5 to-transparent rounded-full pointer-events-none opacity-40" />

                      <div>
                        {/* Badge Row */}
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <span className={`px-2.5 py-0.5 rounded-md text-[8px] font-mono font-bold uppercase tracking-wider ${
                            tmpl.type === 'EGE'
                              ? 'bg-[#F4B5CD]/10 border border-[#F4B5CD]/20 text-[#F4B5CD]'
                              : 'bg-[#C3B4FC]/10 border border-[#C3B4FC]/20 text-[#C3B4FC]'
                          }`}>
                            {tmpl.type}
                          </span>
                          <span className="text-[10px] font-mono text-white/30">
                            {totalQuestions} зад.
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-serif text-sm font-medium text-white group-hover:text-[#F4B5CD] transition line-clamp-2 leading-snug">
                          {tmpl.title}
                        </h4>
                      </div>

                      {/* Action Panel */}
                      <div className="flex gap-2 mt-5 pt-3 border-t border-white/5">
                        <button
                          onClick={() => setAssigningTemplate(tmpl)}
                          className="flex-1 py-2 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/10 text-[#F4B5CD] text-[9px] tracking-wider uppercase font-bold transition rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Назначить
                        </button>
                        <button
                          onClick={() => handleStartEdit(tmpl)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-[9px] tracking-wider uppercase font-bold transition cursor-pointer"
                          title="Редактировать"
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Удалить тест "${tmpl.title}"? Кабинеты учеников останутся нетронутыми.`)) {
                              onDeleteTemplate(tmpl.id);
                            }
                          }}
                          className="p-2 bg-white/5 hover:bg-rose-500/10 text-white/30 hover:text-rose-400 rounded-xl transition cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Student Cabinets Sub-tab */
            <div className="space-y-6 animate-fadeIn">
              {/* Header Controls for Cabinets */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    placeholder="Поиск ученика по имени..."
                    value={searchCabinetQuery}
                    onChange={e => setSearchCabinetQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-black/40 border border-white/10 text-white rounded-xl focus:outline-none focus:border-[#F4B5CD] placeholder-white/20 transition font-sans"
                  />
                </div>
                <div className="text-[10px] text-white/40 text-right font-mono">
                  Активных кабинетов: {students.filter(s => s.isActive && s.cabinetId).length} / {students.filter(s => s.isActive).length}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students
                  .filter(s => s.isActive && s.name.toLowerCase().includes(searchCabinetQuery.toLowerCase()))
                  .map(student => {
                    const cabId = student.cabinetId;
                    const cabinet = cabId ? cabinets[cabId] : null;
                    const isCreated = !!cabinet;
                    const link = isCreated ? `${window.location.origin}${window.location.pathname}?cabinet=${student.cabinetId}` : '';
                    
                    const assignedTestsCount = cabinet?.assignedTests?.length || 0;
                    const completedTestsCount = cabinet?.assignedTests?.filter(t => t.status === 'submitted').length || 0;

                    return (
                      <div
                        key={student.id}
                        className="bg-[#12131a]/80 border border-white/5 hover:border-white/10 p-5 rounded-2xl flex flex-col justify-between min-h-[180px] transition duration-300 relative overflow-hidden group shadow-xl"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#F4B5CD]/[0.02] to-transparent rounded-full pointer-events-none" />
                        
                        <div className="space-y-3.5">
                          {/* Top row */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-2xl shrink-0">{student.emoji}</span>
                              <div className="min-w-0">
                                <h4 className="font-serif text-sm font-semibold text-white group-hover:text-[#F4B5CD] transition truncate leading-snug">
                                  {student.name}
                                </h4>
                                <p className="text-[10px] text-white/40 truncate">
                                  {student.subject} • {student.gradeClass}
                                </p>
                              </div>
                            </div>

                            {/* Cabinet status badge */}
                            <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider ${
                              isCreated
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                : 'bg-white/5 text-white/30 border border-white/5'
                            }`}>
                              {isCreated ? 'АКТИВЕН' : 'НЕ СОЗДАН'}
                            </span>
                          </div>

                          {/* Middle action area */}
                          {isCreated ? (
                            <div className="space-y-2">
                              <label className="block text-[8px] uppercase tracking-widest font-extrabold text-white/30 font-mono">
                                Ссылка для ученика
                              </label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  readOnly
                                  value={link}
                                  onClick={e => (e.target as HTMLInputElement).select()}
                                  className="flex-1 text-[10px] px-2.5 py-2 bg-black/40 border border-white/5 rounded-lg text-white/60 focus:outline-none font-mono truncate select-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    copyToClipboard(link);
                                    setCopiedStudentId(student.id);
                                    setTimeout(() => setCopiedStudentId(null), 2000);
                                  }}
                                  className="px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition flex items-center justify-center cursor-pointer h-[30px]"
                                  title="Копировать ссылку"
                                >
                                  {copiedStudentId === student.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-white/50 group-hover:text-white" />
                                  )}
                                </button>
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/15 text-[#F4B5CD] rounded-lg transition flex items-center justify-center h-[30px]"
                                  title="Открыть кабинет"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>

                              <div className="text-[10px] text-white/40 font-light flex justify-between items-center bg-white/[0.01] p-2 rounded-lg border border-white/[0.03]">
                                <span>Назначено тестов: <strong className="text-white font-medium font-mono">{assignedTestsCount}</strong></span>
                                <span>Решено: <strong className="text-[#F4B5CD] font-medium font-mono">{completedTestsCount}</strong></span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[10px] text-white/35 font-light leading-relaxed">
                                Ученик не сможет войти и выполнять тесты, пока вы не активируете личный кабинет.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleCreateCabinet(student)}
                                className="w-full py-2 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/25 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[10px] font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                              >
                                <Laptop className="w-3.5 h-3.5" />
                                <span>Создать кабинет</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Bottom control strip */}
                        {isCreated && (
                          <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => setAssigningToStudent(student)}
                              className="flex-1 py-1.5 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/10 text-[#F4B5CD] text-[9px] tracking-wider uppercase font-bold transition rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Назначить тест
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assignment overlay Modal */}
      {assigningTemplate && (
        <div className="fixed inset-0 bg-[#07080a]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#12131a] border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setAssigningTemplate(null)}
              className="absolute top-4 right-4 p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#F4B5CD]">
              Назначить вариант
            </span>
            <h3 className="font-serif text-base text-white mt-1 mb-4 line-clamp-1 pr-6">
              {assigningTemplate.title}
            </h3>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {students
                .filter(s => s.isActive && s.cabinetId)
                .map(student => {
                  const hasRussian = (student.subject || '').toLowerCase().includes('рус');
                  return (
                    <button
                      key={student.id}
                      onClick={() => handleAssignToStudent(student.id, assigningTemplate)}
                      className="w-full p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 rounded-xl flex items-center justify-between transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base">{student.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white group-hover:text-[#F4B5CD] transition truncate">
                            {student.name}
                          </p>
                          <p className="text-[10px] text-white/40 truncate">
                            {student.subject} ({student.gradeClass})
                          </p>
                        </div>
                      </div>
                      {hasRussian && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-[#F4B5CD]/10 text-[#F4B5CD] border border-[#F4B5CD]/15">
                          Русск
                        </span>
                      )}
                    </button>
                  );
                })}

              {students.filter(s => s.isActive && s.cabinetId).length === 0 && (
                <p className="text-center text-xs text-white/30 py-4">
                  Нет учеников с активными личными кабинетами. Создайте кабинет в профиле ученика!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assigning Test to Student overlay Modal */}
      {assigningToStudent && (
        <div className="fixed inset-0 bg-[#07080a]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#12131a] border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setAssigningToStudent(null)}
              className="absolute top-4 right-4 p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="text-[9px] uppercase tracking-widest font-extrabold text-[#F4B5CD]">
              Назначить тест ученику
            </span>
            <h3 className="font-serif text-base text-white mt-1 mb-4 line-clamp-1 pr-6">
              {assigningToStudent.name}
            </h3>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {templates.map(tmpl => {
                const totalQuestions = tmpl.questions?.length || 0;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      if (assigningToStudent.cabinetId) {
                        handleAssignToStudent(assigningToStudent.id, tmpl);
                        setAssigningToStudent(null);
                      }
                    }}
                    className="w-full p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 rounded-xl flex items-center justify-between transition text-left cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white group-hover:text-[#F4B5CD] transition truncate">
                        {tmpl.title}
                      </p>
                      <p className="text-[9px] text-white/40 font-mono">
                        {tmpl.type} • {totalQuestions} зад.
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition" />
                  </button>
                );
              })}

              {templates.length === 0 && (
                <p className="text-center text-xs text-white/30 py-4">
                  В библиотеке нет созданных вариантов. Сначала создайте тест!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
