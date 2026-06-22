import React, { useState } from 'react';
import { Student } from '../types';
import { X, UserPlus, Sparkles } from 'lucide-react';

interface AddStudentModalProps {
  onClose: () => void;
  onAdd: (student: Student) => void;
}

const COVER_PRESETS = [
  { name: 'Нежная сакура', value: 'linear-gradient(135deg, rgba(244, 181, 205, 0.12) 0%, rgba(254, 219, 231, 0.08) 100%)' },
  { name: 'Лиловый закат', value: 'linear-gradient(135deg, rgba(216, 180, 254, 0.12) 0%, rgba(244, 181, 205, 0.08) 100%)' },
  { name: 'Пепел розы (пыльный)', value: 'linear-gradient(135deg, rgba(212, 178, 182, 0.16) 0%, rgba(195, 180, 252, 0.08) 100%)' },
  { name: 'Пыльный зефир', value: 'linear-gradient(135deg, rgba(232, 197, 200, 0.15) 0%, rgba(222, 165, 169, 0.07) 100%)' },
  { name: 'Розовая дымка', value: 'linear-gradient(135deg, rgba(244, 194, 208, 0.18) 0%, rgba(212, 178, 182, 0.08) 100%)' },
  { name: 'Муссовый рассвет', value: 'linear-gradient(135deg, rgba(222, 165, 169, 0.14) 0%, rgba(195, 180, 252, 0.05) 100%)' },
  { name: 'Мятная роса', value: 'linear-gradient(135deg, rgba(167, 243, 208, 0.12) 0%, rgba(209, 250, 229, 0.08) 100%)' },
  { name: 'Коралловая пудра', value: 'linear-gradient(135deg, rgba(251, 146, 146, 0.1) 0%, rgba(244, 181, 205, 0.08) 100%)' },
  { name: 'Лавандовый сон', value: 'linear-gradient(135deg, rgba(216, 180, 254, 0.12) 0%, rgba(244, 181, 205, 0.08) 100%)' },
];

const EMOJI_PRESETS = ['💖', '❤️', '💝', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💞', '💓', '💗', '💘', '💟', '❣️', '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🐱', '🐰', '🦊', '🐻', '🐼'];

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Математика');
  const [gradeClass, setGradeClass] = useState('11 класс');
  const [goal, setGoal] = useState('');
  const [balanceLessons, setBalanceLessons] = useState('4');
  const [hourlyRate, setHourlyRate] = useState('1500');
  const [scheduleText, setScheduleText] = useState('Пн 17:00, Чт 17:00');
  const [selectedCover, setSelectedCover] = useState(COVER_PRESETS[0].value);
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_PRESETS[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subject || !goal) return;

    const schedule = scheduleText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

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
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-[#12131a] w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden my-4 md:my-8 animate-slideUp text-left rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with style preview */}
        <div 
          className="h-24 w-full p-6 flex items-end justify-between transition-all relative"
          style={{ background: selectedCover, backgroundSize: 'cover' }}
        >
          <span className="text-4xl p-2 bg-[#12131a] rounded-2xl shadow-xl translate-y-8 select-none border border-white/10">
            {selectedEmoji}
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

            {/* Goal */}
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Основная цель обучения</label>
              <input 
                type="text" 
                required
                placeholder="Подготовка к ЕГЭ на 80+ баллов"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-[#8EA4C9] focus:outline-none rounded-xl"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Предмет репетитора</label>
              <input 
                type="text" 
                required
                placeholder="Математика (Профиль)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-[#8EA4C9] focus:outline-none rounded-xl"
              />
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

            {/* Starting Balance of pre-paid classes */}
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Оплачено уроков вперед (абонемент)</label>
              <input 
                type="number" 
                min="0"
                value={balanceLessons}
                onChange={(e) => setBalanceLessons(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-[#8EA4C9] focus:outline-none font-mono rounded-xl"
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
          </div>

          {/* Emoji Preset Selection */}
          <div>
            <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1.5">Аватар ученика (стиль Notion)</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_PRESETS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setSelectedEmoji(em)}
                  className={`text-lg p-1.5 border transition select-none rounded-xl bg-[#0D0D0D] ${
                    selectedEmoji === em ? 'border-[#8EA4C9] text-[#8EA4C9]' : 'border-white/5 hover:bg-white/5 text-white'
                  }`}
                >
                  {em}
                </button>
              ))}
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

          {/* Notes textarea */}
          <div>
            <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Методические примечания / особенности</label>
            <textarea 
              rows={2}
              placeholder="Опишите особенности восприятия информации учеником, регулярные требования..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-white/5 bg-white/5 text-white placeholder-white/20 focus:border-[#8EA4C9] focus:outline-none resize-none leading-relaxed rounded-xl"
            />
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
