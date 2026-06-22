import React, { useState } from 'react';
import { SyllabusProgram } from '../types';
import { X, BookOpen, Plus, Trash2, Edit3, Save, CheckCircle, ListPlus, Notebook } from 'lucide-react';
import { parseRawKtpText } from '../utils/scheduleParser';

interface ProgramManagerModalProps {
  programs: SyllabusProgram[];
  onSavePrograms: (updatedPrograms: SyllabusProgram[]) => void;
  onClose: () => void;
}

export function ProgramManagerModal({ programs, onSavePrograms, onClose }: ProgramManagerModalProps) {
  const [selectedProgram, setSelectedProgram] = useState<SyllabusProgram | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states for creating/editing program
  const [programName, setProgramName] = useState('');
  const [programTopicsText, setProgramTopicsText] = useState('');

  const handleKtpFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setProgramTopicsText(text);
    };
    reader.readAsText(file);
  };

  const handleSelectProgramForEdit = (prog: SyllabusProgram) => {
    setSelectedProgram(prog);
    setIsAddingNew(false);
    setProgramName(prog.name);
    setProgramTopicsText(prog.topics.join('\n'));
  };

  const handleStartAddNew = () => {
    setSelectedProgram(null);
    setIsAddingNew(true);
    setProgramName('');
    setProgramTopicsText('');
  };

  const handleDeleteProgram = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Вы действительно хотите удалить эту учебную программу? ' +
                       'Это действие не повлияет на уже назначенные курсы учеников, но удалит её из шаблонов.')) {
      const updated = programs.filter(p => p.id !== id);
      onSavePrograms(updated);
      if (selectedProgram?.id === id) {
        setSelectedProgram(null);
      }
    }
  };

  const handleSave = () => {
    if (!programName.trim()) {
      alert('Пожалуйста, заполните название программы.');
      return;
    }

    const topicsArr = programTopicsText
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);

    if (topicsArr.length === 0) {
      alert('Пожалуйста, введите хотя бы одну тему программы.');
      return;
    }

    if (isAddingNew) {
      const newProg: SyllabusProgram = {
        id: 'prog-' + Date.now(),
        name: programName.trim(),
        topics: topicsArr
      };
      onSavePrograms([...programs, newProg]);
      setIsAddingNew(false);
    } else if (selectedProgram) {
      const updated = programs.map(p => {
        if (p.id === selectedProgram.id) {
          return {
            ...p,
            name: programName.trim(),
            topics: topicsArr
          };
        }
        return p;
      });
      onSavePrograms(updated);
      setSelectedProgram(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-[#12131a] w-full max-w-4xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden text-left flex flex-col max-h-[90vh] animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#16171f] shrink-0">
          <div className="flex items-center gap-2.5">
            <Notebook className="w-5 h-5 text-dusty-rose" />
            <div>
              <h2 className="text-base font-serif text-white">Каталог учебных программ и КТП</h2>
              <p className="text-[10px] text-white/40">Управление шаблонами учебных планов для последующего назначения ученикам</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 px-3 border border-white/15 text-white/50 hover:text-white rounded-xl bg-white/5 text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Закрыть</span>
          </button>
        </div>

        {/* Content Body split */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
          
          {/* Left Column: Programs list */}
          <div className="lg:col-span-5 p-5 flex flex-col gap-4 overflow-y-auto max-h-[50vh] lg:max-h-none">
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-white/40">Доступные программы ({programs.length})</span>
              <button
                type="button"
                onClick={handleStartAddNew}
                className="px-2.5 py-1 bg-dusty-rose/10 hover:bg-dusty-rose/20 text-dusty-rose text-[9px] uppercase tracking-wider font-extrabold rounded-lg border border-dusty-rose/25 flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                Новая КТП
              </button>
            </div>

            <div className="space-y-2">
              {programs.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-xs">
                  Нет сохраненных учебных планов КТП
                </div>
              ) : (
                programs.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProgramForEdit(p)}
                    className={`p-3.5 border rounded-xl transition cursor-pointer flex justify-between items-start ${
                      (selectedProgram?.id === p.id)
                        ? 'bg-dusty-rose/15 border-dusty-rose text-white'
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02] text-white/80'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-serif text-white font-medium">{p.name}</p>
                      <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-blush-mist/80" />
                        Планируемых тем по КТП: {p.topics.length}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProgram(p.id, e)}
                      className="p-1 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Удалить из каталога"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Editor / Form view */}
          <div className="lg:col-span-7 p-6 overflow-y-auto flex flex-col justify-between">
            {selectedProgram || isAddingNew ? (
              <div className="space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                    <Edit3 className="w-4 h-4 text-blush-mist" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      {isAddingNew ? 'Создание программы обучения' : 'Редактировать КТП-программу'}
                    </h3>
                  </div>

                  {/* Program name input */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-extrabold text-white/45 mb-1.5">
                      Название курса / Программы
                    </label>
                    <input
                      type="text"
                      className="w-full text-xs px-3 py-2 border border-white/10 bg-black/40 text-white placeholder-white/20 focus:border-dusty-rose focus:outline-none rounded-xl font-medium"
                      placeholder="e.g. Подготовка к ЕГЭ Математика (Профильный уровень)"
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                    />
                  </div>

                  {/* Topics box */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/5 pb-1.5">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-extrabold text-blush-mist">
                          Список тем по КТП (Каждая с новой строки)
                        </label>
                        <p className="text-[10px] text-white/30">Каждая строчка автоматически станет отдельной темой для уроков.</p>
                      </div>

                      {/* File Import Button */}
                      <label className="cursor-pointer px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] uppercase tracking-widest font-extrabold text-white transition flex items-center gap-1">
                        📁 Импорт .txt / .csv
                        <input 
                          type="file" 
                          accept=".txt,.csv" 
                          onChange={handleKtpFileImport} 
                          className="hidden" 
                        />
                      </label>
                    </div>

                    <textarea
                      className="w-full text-xs font-mono p-3.5 border border-white/10 bg-black/40 text-white placeholder-white/25 focus:border-dusty-rose focus:outline-none h-44 leading-relaxed resize-none rounded-2xl font-light"
                      placeholder="Пример:&#10;1. Вводный урок и классификация&#10;2. Теория тригонометрического круга&#10;3. Раздел 2: Геометрия на плоскости"
                      value={programTopicsText}
                      onChange={(e) => setProgramTopicsText(e.target.value)}
                    />

                    {/* Actions bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!programTopicsText.trim()) {
                            alert('Пожалуйста, введите текст или загрузите файл перед очисткой.');
                            return;
                          }
                          const cleaned = parseRawKtpText(programTopicsText);
                          if (cleaned.length === 0) {
                            alert('Пожалуйста, внесите непустой текст.');
                            return;
                          }
                          setProgramTopicsText(cleaned.join('\n'));
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-lavender/10 hover:bg-lavender/20 active:scale-95 text-[#C3B4FC] border border-lavender/25 text-[9px] font-bold uppercase tracking-widest rounded-xl transition cursor-pointer"
                        title="Удаляет номера тем, даты, дубликаты, а также очищает лишние ячейки Excel"
                      >
                        ✨ Смарт-очистка КТП (для Excel копий)
                      </button>

                      <div className="text-[9px] text-[#C3B4FC]/60 max-w-sm">
                        💡 Темы автоматически привязываются по порядку к проведённым урокам.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex gap-2.5 justify-end mt-4 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProgram(null);
                      setIsAddingNew(false);
                    }}
                    className="px-4 py-2 border border-white/5 text-white/50 hover:text-white hover:bg-white/5 text-[10px] tracking-widest uppercase font-bold transition rounded-xl"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-5 py-2.5 bg-dusty-rose text-[#12131a] hover:bg-rose-ash text-[10px] tracking-widest uppercase font-extrabold transition rounded-xl flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Сохранить изменения
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-white/30 space-y-3">
                <BookOpen className="w-10 h-10 text-white/10" />
                <p className="text-xs max-w-sm">
                  Выберите программу из списка слева для её редактирования, удаления или нажмите кнопку "+ Новая КТП" для добавления собственной программы обучения.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
