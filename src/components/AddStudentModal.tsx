import React, { useState } from 'react';
import { Student, COVER_PRESETS } from '../types';
import { X, UserPlus, Sparkles } from 'lucide-react';
import { normalizeScheduleText } from '../utils/scheduleParser';

interface AddStudentModalProps {
  onClose: () => void;
  onAdd: (student: Student) => void;
}

const EMOJI_PRESETS = [
  // Учёба, Предметы и Инструменты
  '📚', '🎓', '🏫', '🎒', '📝', '💻', '📐', '🧪', '🧬', '🌍', '🎨', '🎭', '💡', '♟️',
  // Ученики и Персонажи
  '🙋‍♂️', '🙋‍♀️', '🧑‍🎓', '👨‍💻', '👩‍💻', '🤓', '😎', '😊', '✍️',
  // Мудрые и Дружелюбные животные
  '🦉', '🦊', '🦁', '🐯', '🐻', '🐼', '🐱', '🐰', '🐬',
  // Достижения и Символы
  '⭐', '✨', '🏆', '🥇', '💖', '🍀'
];

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Русский язык');
  const [gradeClass, setGradeClass] = useState('11 класс');
  const [goal, setGoal] = useState('Цель не указана');
  const [balanceLessons, setBalanceLessons] = useState('0');
  const [hourlyRate, setHourlyRate] = useState('1500');
  const [scheduleText, setScheduleText] = useState('Пн 17:00, Чт 17:00');
  const [selectedCover, setSelectedCover] = useState(COVER_PRESETS[0].value);
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_PRESETS[0]);
  const [notes, setNotes] = useState('');
  const [zoomLink, setZoomLink] = useState('');

  React.useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setSelectedEmoji(event.target.result as string);
              }
            };
            reader.readAsDataURL(file);
            e.preventDefault();
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, []);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setSelectedEmoji(event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subject || !goal) return;

    const schedule = normalizeScheduleText(scheduleText);


    const newStudent: Student = {
      id: 'stud-' + Date.now(),
      name,
      emoji: selectedEmoji,
      coverColor: selectedCover,
      subject,
      gradeClass,
      goal,
      schedule,
      hourlyRate: Number(hourlyRate),
      balanceLessons: Number(balanceLessons),
      notes: notes || 'Заметки не заполнены. Нажмите изменить, чтобы оставить комментарий к процессу.',
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      zoomLink: zoomLink.trim() || undefined,
      mockExams: [],
      lessons: [],
      payments: Number(balanceLessons) > 0 ? [{
        id: 'pay-init-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        amount: Number(balanceLessons) * Number(hourlyRate),
        lessonsPaid: Number(balanceLessons),
        method: 'СБП',
        notes: 'Стартовый баланс при регистрации аккаунта'
      }] : [],
      topicGaps: []
    };

    onAdd(newStudent);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={onClose} onPaste={handlePaste}>
      <div 
        className="bg-[#12131a] w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden my-4 md:my-8 animate-slideUp text-left rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with style preview */}
        <div 
          className="h-24 w-full p-6 flex items-end justify-between transition-all relative"
          style={{ background: selectedCover, backgroundSize: 'cover' }}
        >
          <span className="w-16 h-16 flex items-center justify-center bg-[#12131a] rounded-2xl shadow-xl translate-y-8 select-none border border-white/10 overflow-hidden shrink-0">
            {selectedEmoji.startsWith('data:') || selectedEmoji.startsWith('http') ? (
              <img src={selectedEmoji} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-4xl leading-none">{selectedEmoji}</span>
            )}
          </span>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 bg-black/60 hover:bg-black/90 text-white transition absolute top-4 right-4 rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 pt-12 space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <UserPlus className="w-4 h-4 text-[#8EA4C9]" />
            <h2 className="text-base font-serif text-white">Регистрация личного кабинета ученика</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">ФИО Ученика</label>
              <input 
                type="text" 
                required
                placeholder="Софья Ковалева"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-[#8EA4C9] focus:outline-none rounded-xl"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Предмет репетитора</label>
              <select
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-white/5 bg-[#181920] text-white focus:border-[#8EA4C9] focus:outline-none rounded-xl cursor-pointer"
              >
                <option value="Русский язык">Русский язык</option>
                <option value="Литература">Литература</option>
                <option value="Испанский язык">Испанский язык</option>
                <option value="Английский язык">Английский язык</option>
              </select>
            </div>

            {/* Class info */}
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Класс / Уровень</label>
              <input 
                type="text" 
                placeholder="11 класс"
                value={gradeClass}
                onChange={(e) => setGradeClass(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-[#8EA4C9] focus:outline-none rounded-xl"
              />
            </div>

            {/* Rate */}
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Ставка за 1 академический час (₽)</label>
              <input 
                type="number" 
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-[#8EA4C9] focus:outline-none font-mono rounded-xl"
              />
            </div>

            {/* Schedule */}
            <div className="md:col-span-2">
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">
                Постоянное расписание занятий (через запятую)
              </label>
              <input 
                type="text" 
                placeholder="Пн 17:00, Чт 18:30 (90 мин)"
                value={scheduleText}
                onChange={(e) => setScheduleText(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-[#8EA4C9] focus:outline-none font-mono rounded-xl"
              />
              <p className="text-[10px] text-white/30 mt-1">
                Пример: <code className="text-white/50">Пн 17:00, Чт 18:30 (90 мин)</code>. Без указания минут урок считается часовым (60 мин).
              </p>
            </div>

            {/* Zoom Link */}
            <div className="md:col-span-2">
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">
                Ссылка на конференцию Zoom (необязательно)
              </label>
              <input 
                type="url" 
                placeholder="https://zoom.us/j/..."
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-[#8EA4C9] focus:outline-none rounded-xl"
              />
            </div>
          </div>

          {/* Emoji Preset Selection and Upload / Paste Zone */}
          <div className="space-y-1.5">
            <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40">Аватар ученика</label>
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
              {/* Preset List */}
              <div className="flex-1">
                <span className="block text-[8px] text-white/30 uppercase tracking-wider mb-1">Выберите эмодзи-аватар</span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-black/25 rounded-xl border border-white/5 no-scrollbar">
                  {EMOJI_PRESETS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setSelectedEmoji(em)}
                      className={`text-lg p-1 transition select-none rounded-lg bg-[#0D0D0D] shrink-0 ${
                        selectedEmoji === em ? 'ring-2 ring-[#8EA4C9] text-[#8EA4C9]' : 'border border-white/5 hover:bg-white/5 text-white'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload/Paste Zone */}
              <div 
                className="md:w-60 flex flex-col justify-between p-3.5 bg-black/25 border border-dashed border-white/10 rounded-xl relative hover:border-[#8EA4C9]/40 transition group"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setSelectedEmoji(event.target.result as string);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              >
                <div className="text-center space-y-1">
                  <span className="block text-[9px] text-[#8EA4C9] font-bold uppercase tracking-wider">Своё фото / PNG</span>
                  <p className="text-[9px] text-white/40 leading-normal">
                    Перетащите файл, скопируйте картинку и нажмите <kbd className="bg-white/5 px-1 py-0.5 rounded text-white/50">Ctrl+V</kbd> или выберите файл на ПК
                  </p>
                </div>
                
                <label className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] text-white font-bold uppercase tracking-widest rounded-lg cursor-pointer transition">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-[#8EA4C9]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Обзор файлов
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setSelectedEmoji(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Cover gradient selection presets */}
          <div>
            <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1.5">Обложка личного кабинета</label>
            <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setSelectedCover(preset.value)}
                  className={`h-8 relative transition duration-200 rounded-lg overflow-hidden ${
                    selectedCover === preset.value ? 'ring-2 ring-[#8EA4C9] ring-offset-[#12131a] ring-offset-2' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: preset.value, backgroundSize: 'cover' }}
                  title={preset.name}
                >
                  <span className="sr-only">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer controls */}
          <div className="flex gap-2.5 justify-end pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-transparent hover:bg-white/5 border border-white/10 text-white/60 text-[10px] tracking-widest uppercase font-bold rounded-xl transition duration-200"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#8EA4C9] text-black text-[10px] tracking-widest uppercase font-bold hover:bg-[#788DB3] transition duration-200 flex items-center gap-1.5 rounded-xl"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Создать кабинет
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
