import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { X, Calendar, ClipboardCheck, AlertCircle, PlusCircle, Check } from 'lucide-react';
import { parseScheduleCode } from '../utils/scheduleParser';

interface ImportScheduleModalProps {
  onClose: () => void;
  students: Student[];
  onImport: (updatedStudents: Student[]) => void;
}

export const ImportScheduleModal: React.FC<ImportScheduleModalProps> = ({ onClose, students, onImport }) => {
  const [inputText, setInputText] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Normalize name for matching
  const normalizeName = (name: string): string => {
    return name.trim().toLowerCase().replace(/[^a-zа-яё0-9]/g, '');
  };

  // Convert pasting text to lists
  const parsedItems = useMemo(() => {
    if (!inputText.trim()) return [];
    return parseScheduleCode(inputText);
  }, [inputText]);

  // Match existing profile or create a new student
  const mappedSchedules = useMemo(() => {
    return parsedItems.map(item => {
      const normInput = normalizeName(item.name);
      
      const foundStudent = students.find(s => {
        const normExisting = normalizeName(s.name);
        return normExisting.includes(normInput) || normInput.includes(normExisting);
      });

      return {
        ...item,
        matchedStudent: foundStudent || null,
        isNew: !foundStudent
      };
    });
  }, [parsedItems, students]);

  const handleApply = () => {
    if (mappedSchedules.length === 0) return;

    let updatedList = [...students];

    mappedSchedules.forEach(item => {
      if (item.matchedStudent) {
        // Update existing schedule
        updatedList = updatedList.map(s => {
          if (s.id === item.matchedStudent!.id) {
            return {
              ...s,
              schedule: item.schedule,
              isActive: true
            };
          }
          return s;
        });
      } else {
        // Automatically create new student profile
        const randomizedGrad = ['11 класс', '10 класс', '9 класс'][Math.floor(Math.random() * 3)];
        const randomizedEmoji = ['📐', '🇬🇧', '🧪', '👨‍💻', '📚', '🧠', '🎹'][Math.floor(Math.random() * 7)];
        const coverPresets = [
          'linear-gradient(135deg, rgba(244, 181, 205, 0.12) 0%, rgba(254, 219, 231, 0.08) 100%)', // Sakura pink
          'linear-gradient(135deg, rgba(216, 180, 254, 0.12) 0%, rgba(244, 181, 205, 0.08) 100%)', // Lilac violet
          'linear-gradient(135deg, rgba(167, 243, 208, 0.12) 0%, rgba(209, 250, 229, 0.08) 100%)', // Mint green
          'linear-gradient(135deg, rgba(251, 146, 146, 0.1) 0%, rgba(244, 181, 205, 0.08) 100%)', // Coral pink
          'linear-gradient(135deg, rgba(216, 180, 254, 0.15) 0%, rgba(167, 243, 208, 0.08) 100%)', // Purple mint wave
        ];
        const randomCover = coverPresets[Math.floor(Math.random() * coverPresets.length)];

        const newStud: Student = {
          id: 'stud-' + Date.now() + Math.random().toString(36).substr(2, 5),
          name: item.name,
          emoji: randomizedEmoji,
          coverColor: randomCover,
          subject: 'Новый предмет',
          gradeClass: randomizedGrad,
          goal: 'Цель не задана (импортировано из календаря)',
          schedule: item.schedule,
          hourlyRate: 1500,
          balanceLessons: 0,
          notes: 'Кабинет ученика автоматически создан при импорте расписания из Google Календаря.',
          isActive: true,
          createdAt: new Date().toISOString().split('T')[0],
          mockExams: [],
          lessons: [],
          payments: [],
          topicGaps: []
        };
        updatedList.push(newStud);
      }
    });

    onImport(updatedList);
    setSuccessMsg(`Успешно распределено! Создано/обновлено: ${mappedSchedules.length}.`);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-[#12131a] w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden animate-slideUp text-left rounded-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-[#181920] p-5 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5 h-5 text-[#8EA4C9]" />
            <div>
              <h2 className="text-sm font-serif text-white font-medium">Бесшовная загрузка расписания</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Парсер кода репетиторской сетки</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 border border-white/10 text-white/55 hover:text-white hover:bg-white/5 transition rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Tutorial hint box */}
          <div className="bg-white/5 p-4 border border-white/5 space-y-1.5 rounded-xl">
            <span className="text-[9px] bg-[#8EA4C9]/10 text-[#8EA4C9] border border-[#8EA4C9]/20 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider">Инструкция в 2 клика</span>
            <p className="text-xs text-white/70 leading-relaxed font-light">
              1. Скопируйте расписание (из Google Календаря или списка) и отправьте в Gemini / ChatGPT с фразой: 
              <br />
              <span className="text-white/40 font-mono text-[11px] bg-white/[0.03] px-1 py-0.5 rounded">«Сформируй список учеников в формате: Имя ученика: Дни недели Время»</span>
              <br />
              2. Скопируйте ответ языковой модели и закиньте в текстовое поле ниже. Приложение моментально распознает дни занятий, распределит их по кабинетам и заполнит календарную сетку!
            </p>
          </div>

          {/* Paste area */}
          <div className="space-y-1">
            <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40 mb-1">Полученный текст / код расписания</label>
            <textarea
              className="w-full h-32 p-3 font-mono text-xs border border-white/10 bg-white/5 text-white placeholder-white/20 focus:border-[#8EA4C9]/60 focus:outline-none resize-none leading-relaxed rounded-xl"
              placeholder={`Пример:\n- Александр Смирнов: Пн 16:30, Чт 18:00\n- Маргарита Кузнецова: Вт 15:00, Пт 17:30\n- Даня Сёмин: Ср 12:00`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          {/* Live Parsing Preview */}
          {mappedSchedules.length > 0 && (
            <div className="space-y-2 border-t border-white/5 pt-3">
              <h4 className="text-[9px] uppercase tracking-widest font-bold text-white/40">Распределение (распознано: {mappedSchedules.length})</h4>
              <div className="divide-y divide-white/5 max-h-48 overflow-y-auto bg-black/30 border border-white/5 p-1 rounded-xl">
                {mappedSchedules.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white font-serif">{item.name}</span>
                        {item.matchedStudent ? (
                          <span className="text-[8px] bg-lavender/10 text-lavender border border-lavender/25 px-1.5 py-0.5 uppercase font-medium rounded-md">
                            {item.matchedStudent.emoji} Есть кабинет
                          </span>
                        ) : (
                          <span className="text-[8px] bg-[#8EA4C9]/10 text-[#8EA4C9] border border-[#8EA4C9]/20 px-1.5 py-0.2 uppercase font-medium rounded-md">
                            ✦ Новый ученик
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/40">
                        {item.matchedStudent ? (
                          <span>Найден контракт: <strong className="text-white/60">{item.matchedStudent.name}</strong></span>
                        ) : (
                          <span>Система автоматически зарегистрирует новый кабинет!</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex gap-1 flex-wrap justify-end">
                        {item.schedule.map((t, i) => (
                          <span key={i} className="text-[9px] font-mono bg-white/5 border border-white/10 text-white/60 px-1.5 py-0.3 rounded-md">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-lavender/10 border border-lavender/25 text-lavender text-xs p-3 flex items-center gap-2 rounded-xl">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

        </div>

        {/* Action triggers */}
        <div className="bg-white/[0.01] backdrop-blur-md p-4 border-t border-white/5 flex gap-2 justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-white/20 text-[10px] tracking-widest uppercase font-bold text-white/60 hover:text-white transition rounded-xl active:scale-95 backdrop-blur-md"
          >
            Закрыть
          </button>
          <button
            type="button"
            disabled={mappedSchedules.length === 0 || !!successMsg}
            onClick={handleApply}
            className={`px-5 py-2.5 text-[10px] tracking-widest uppercase font-bold transition flex items-center gap-1 rounded-xl active:scale-95 backdrop-blur-md ${
              mappedSchedules.length === 0 || !!successMsg
                ? 'bg-white/[0.01] text-white/20 border border-white/5 cursor-not-allowed'
                : 'bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-lavender/30 text-lavender'
            }`}
          >
            Применить изменения
          </button>
        </div>
      </div>
    </div>
  );
};
