import React, { useState } from 'react';
import { SyllabusProgram, SyllabusProgramTopic } from '../types';
import { X, BookOpen, Plus, Trash2, Edit3, Save, CheckCircle, ListPlus, Notebook, Paperclip, UploadCloud, FolderPlus, FileText, Link, ArrowUp, ArrowDown } from 'lucide-react';
import { parseRawKtpText } from '../utils/scheduleParser';
import { TopicAttachmentsModal, BulkPdfUploadModal } from './StudentDetail';

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
  const [localTopics, setLocalTopics] = useState<SyllabusProgramTopic[]>([]);
  const [showBulkPastePanel, setShowBulkPastePanel] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [showBulkPdfUpload, setShowBulkPdfUpload] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);

  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleKtpFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text
        .split('\n')
        .map(t => t.trim())
        .filter(Boolean);
      const parsedLines = parseRawKtpText(lines.join('\n'));
      const newTopics = parsedLines.map((title, idx) => ({
        id: 't-import-' + Date.now() + '-' + idx,
        title,
        pdfs: [],
        links: []
      }));
      setLocalTopics(prev => {
        const filteredPrev = prev.filter(p => p.title.trim() !== '');
        return [...filteredPrev, ...newTopics];
      });
    };
    reader.readAsText(file);
  };

  const handleBulkPaste = (append: boolean) => {
    if (!bulkPasteText.trim()) return;
    const parsedLines = parseRawKtpText(bulkPasteText);
    if (parsedLines.length === 0) return;

    const newTopics = parsedLines.map((title, idx) => ({
      id: 't-bulk-' + Date.now() + '-' + idx,
      title,
      pdfs: [],
      links: []
    }));

    if (append) {
      setLocalTopics(prev => {
        const filtered = prev.filter(p => p.title.trim() !== '');
        return [...filtered, ...newTopics];
      });
    } else {
      setLocalTopics(newTopics);
    }
    setBulkPasteText('');
    setShowBulkPastePanel(false);
  };

  const handleSelectProgramForEdit = (prog: SyllabusProgram) => {
    setSelectedProgram(prog);
    setIsAddingNew(false);
    setProgramName(prog.name);
    
    const normalized = (prog.topics || []).map((t: any, idx: number) => {
      if (typeof t === 'string') {
        return {
          id: 't-' + prog.id + '-' + idx + '-' + Date.now(),
          title: t,
          pdfs: [],
          links: []
        };
      }
      return {
        id: t.id || ('t-' + prog.id + '-' + idx + '-' + Date.now()),
        title: t.title || '',
        pdfs: t.pdfs || [],
        links: t.links || []
      };
    });
    setLocalTopics(normalized);
    setErrorMessage(null);
    setShowBulkPastePanel(false);
  };

  const handleStartAddNew = () => {
    setSelectedProgram(null);
    setIsAddingNew(true);
    setProgramName('');
    setLocalTopics([{ id: 't-new-0-' + Date.now(), title: '', pdfs: [], links: [] }]);
    setErrorMessage(null);
    setShowBulkPastePanel(false);
  };

  const handleDeleteProgram = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomConfirm({
      title: 'Удаление учебной программы',
      message: 'Вы действительно хотите удалить эту учебную программу? Это действие не повлияет на уже назначенные курсы учеников, но удалит её из шаблонов.',
      onConfirm: () => {
        const updated = programs.filter(p => p.id !== id);
        onSavePrograms(updated);
        if (selectedProgram?.id === id) {
          setSelectedProgram(null);
          setLocalTopics([]);
        }
        setCustomConfirm(null);
      }
    });
  };

  const handleSave = () => {
    if (!programName.trim()) {
      setErrorMessage('Пожалуйста, заполните название программы.');
      return;
    }

    const validTopics = localTopics
      .map(t => ({ ...t, title: t.title.trim() }))
      .filter(t => t.title.length > 0);

    if (validTopics.length === 0) {
      setErrorMessage('Пожалуйста, введите хотя бы одну тему программы.');
      return;
    }

    setErrorMessage(null);

    if (isAddingNew) {
      const newProg: SyllabusProgram = {
        id: 'prog-' + Date.now(),
        name: programName.trim(),
        topics: validTopics
      };
      onSavePrograms([...programs, newProg]);
      setIsAddingNew(false);
      setSelectedProgram(null);
    } else if (selectedProgram) {
      const updated = programs.map(p => {
        if (p.id === selectedProgram.id) {
          return {
            ...p,
            name: programName.trim(),
            topics: validTopics
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
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blush-mist" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        {isAddingNew ? 'Создание программы обучения' : 'Редактировать КТП-программу'}
                      </h3>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3 text-xs flex items-center justify-between">
                      <span>{errorMessage}</span>
                      <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white font-bold ml-2">×</button>
                    </div>
                  )}

                  {/* Program name input */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-extrabold text-white/45 mb-1.5">
                      Название курса / Программы
                    </label>
                    <input
                      type="text"
                      className="w-full text-xs px-3 py-2.5 border border-white/10 bg-black/40 text-white placeholder-white/20 focus:border-dusty-rose focus:outline-none rounded-xl font-medium"
                      placeholder="Например: Подготовка к ЕГЭ Математика (Профильный уровень)"
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                    />
                  </div>

                  {/* Interactive Topics Header with action buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-white/5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-extrabold text-blush-mist">
                        Список тем программы и материалы КТП
                      </label>
                      <p className="text-[10px] text-white/30">Введите названия тем и прикрепите файлы к каждой теме.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Bulk Paste Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setShowBulkPastePanel(!showBulkPastePanel)}
                        className={`px-2.5 py-1.5 border rounded-xl text-[9px] uppercase tracking-widest font-extrabold transition flex items-center gap-1 cursor-pointer ${
                          showBulkPastePanel 
                            ? 'bg-lavender/20 border-lavender text-white' 
                            : 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10'
                        }`}
                      >
                        📝 Быстрый импорт текстом
                      </button>
                      
                      {/* File Import Button */}
                      <label className="cursor-pointer px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] uppercase tracking-widest font-extrabold text-white/75 transition flex items-center gap-1">
                        📁 Из .txt / .csv
                        <input 
                          type="file" 
                          accept=".txt,.csv" 
                          onChange={handleKtpFileImport} 
                          className="hidden" 
                        />
                      </label>
                      
                      {/* Bulk PDF Upload (Auto-binding) */}
                      <button
                        type="button"
                        onClick={() => setShowBulkPdfUpload(true)}
                        className="px-2.5 py-1.5 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 border border-[#F4B5CD]/25 text-[#F4B5CD] text-[9px] font-extrabold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1"
                        title="Загрузить пачку PDF и автоматически распределить по совпадению имен"
                      >
                        <FolderPlus className="w-3 h-3 text-[#F4B5CD]" />
                        <span>Авто-PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Bulk Paste Panel */}
                  {showBulkPastePanel && (
                    <div className="p-3.5 bg-black/50 border border-white/10 rounded-2xl space-y-3 animate-fadeIn">
                      <span className="text-[10px] uppercase font-bold text-blush-mist block">Вставьте список тем (каждая тема с новой строки):</span>
                      <textarea
                        className="w-full text-xs font-mono p-2.5 border border-white/10 bg-black/40 text-white placeholder-white/20 focus:border-dusty-rose focus:outline-none h-28 leading-relaxed resize-none rounded-xl font-light"
                        placeholder="Пример:&#10;1. Вводный урок и классификация&#10;2. Теория тригонометрического круга"
                        value={bulkPasteText}
                        onChange={(e) => setBulkPasteText(e.target.value)}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const cleaned = parseRawKtpText(bulkPasteText);
                            setBulkPasteText(cleaned.join('\n'));
                          }}
                          className="px-2 py-1 bg-lavender/10 hover:bg-lavender/20 text-[#C3B4FC] border border-lavender/25 text-[9px] font-bold uppercase tracking-widest rounded-lg transition"
                        >
                          ✨ Смарт-очистка КТП
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleBulkPaste(true)}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition"
                          >
                            ➕ Добавить к текущим
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkPaste(false)}
                            className="px-2.5 py-1.5 bg-[#F4B5CD] text-black hover:opacity-90 text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition"
                          >
                            🔄 Заменить текущие
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Topics List wrapper */}
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar flex-1 border border-white/5 bg-black/20 p-2.5 rounded-2xl">
                    {localTopics.length === 0 ? (
                      <div className="text-center py-8 text-white/25 text-xs italic">
                        Список тем пуст. Нажмите "+ Добавить тему" ниже или вставьте список тем текстом.
                      </div>
                    ) : (
                      localTopics.map((topic, idx) => (
                        <div key={topic.id} className="p-2.5 bg-[#16171f]/60 border border-white/5 rounded-xl space-y-1.5 hover:border-white/10 transition">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-[11px] font-mono font-bold text-white/40 shrink-0">
                                #{idx + 1}
                              </span>
                              <input
                                type="text"
                                value={topic.title}
                                onChange={(e) => {
                                  const updated = localTopics.map(t => t.id === topic.id ? { ...t, title: e.target.value } : t);
                                  setLocalTopics(updated);
                                }}
                                className="flex-1 bg-black/30 border border-white/5 focus:border-dusty-rose text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none placeholder-white/20 transition font-medium"
                                placeholder="Введите название темы"
                              />
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (idx === 0) return;
                                  const copy = [...localTopics];
                                  const temp = copy[idx];
                                  copy[idx] = copy[idx - 1];
                                  copy[idx - 1] = temp;
                                  setLocalTopics(copy);
                                }}
                                disabled={idx === 0}
                                className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition"
                                title="Переместить вверх"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (idx === localTopics.length - 1) return;
                                  const copy = [...localTopics];
                                  const temp = copy[idx];
                                  copy[idx] = copy[idx + 1];
                                  copy[idx + 1] = temp;
                                  setLocalTopics(copy);
                                }}
                                disabled={idx === localTopics.length - 1}
                                className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition"
                                title="Переместить вниз"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalTopics(localTopics.filter(t => t.id !== topic.id));
                                }}
                                className="p-1 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                title="Удалить тему"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Attachments & Files inside the Topic line */}
                          <div className="pl-6 flex flex-wrap items-center gap-1.5 pt-0.5">
                            {topic.pdfs?.map((pdf, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/40 border border-white/5 text-[9px] text-white/80">
                                <FileText className="w-2.5 h-2.5 text-[#F4B5CD]" />
                                <span className="max-w-[120px] truncate" title={pdf.name}>{pdf.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = localTopics.map(t => t.id === topic.id ? {
                                      ...t,
                                      pdfs: t.pdfs?.filter((_, pi) => pi !== pIdx) || []
                                    } : t);
                                    setLocalTopics(updated);
                                  }}
                                  className="text-white/40 hover:text-rose-400 ml-1 font-bold font-sans"
                                >
                                  ×
                                </button>
                              </div>
                            ))}

                            {topic.links?.map((link, lIdx) => (
                              <div key={lIdx} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/40 border border-white/5 text-[9px] text-white/80">
                                <Link className="w-2.5 h-2.5 text-blush-mist" />
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="max-w-[120px] truncate hover:underline text-white/95" title={link.name}>{link.name}</a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = localTopics.map(t => t.id === topic.id ? {
                                      ...t,
                                      links: t.links?.filter((_, li) => li !== lIdx) || []
                                    } : t);
                                    setLocalTopics(updated);
                                  }}
                                  className="text-white/40 hover:text-rose-400 ml-1 font-bold font-sans"
                                >
                                  ×
                                </button>
                              </div>
                            ))}

                            {/* Single Attach button for this line */}
                            <button
                              type="button"
                              onClick={() => setEditingTopicId(topic.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F4B5CD]/10 hover:bg-[#F4B5CD]/20 text-[#F4B5CD] text-[9px] font-extrabold uppercase tracking-wider rounded-lg border border-[#F4B5CD]/20 transition cursor-pointer"
                            >
                              <Paperclip className="w-2.5 h-2.5" />
                              <span>Прикрепить</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Topic button at the bottom of list */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const newId = 't-new-' + Date.now();
                        setLocalTopics([...localTopics, { id: newId, title: '', pdfs: [], links: [] }]);
                      }}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 border border-dashed border-white/15 text-white/80 text-[10px] tracking-widest uppercase font-extrabold transition rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Добавить тему
                    </button>
                  </div>

                </div>

                {/* Footer Controls */}
                <div className="flex gap-2.5 justify-end mt-4 pt-4 border-t border-white/5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProgram(null);
                      setIsAddingNew(false);
                      setErrorMessage(null);
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

      {/* Custom Confirm Modal overlay */}
      {customConfirm && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#12131a] w-full max-w-sm border border-white/10 shadow-2xl rounded-2xl overflow-hidden text-left p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
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

      {/* Topic Attachments Modal */}
      {(() => {
        if (!editingTopicId) return null;
        const topicVal = localTopics.find(t => t.id === editingTopicId);
        if (!topicVal) return null;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <TopicAttachmentsModal
              topic={topicVal}
              onClose={() => setEditingTopicId(null)}
              onSave={(updatedTopic) => {
                const updatedTopics = localTopics.map((t) => {
                  return t.id === updatedTopic.id ? updatedTopic : t;
                });
                setLocalTopics(updatedTopics);
                setEditingTopicId(null);
              }}
            />
          </div>
        );
      })()}

      {/* Bulk PDF Upload Modal */}
      {showBulkPdfUpload && (
        <div onClick={(e) => e.stopPropagation()}>
          <BulkPdfUploadModal
            topics={localTopics}
            onClose={() => setShowBulkPdfUpload(false)}
            onSave={(updatedTopics) => {
              setLocalTopics(updatedTopics);
              setShowBulkPdfUpload(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
