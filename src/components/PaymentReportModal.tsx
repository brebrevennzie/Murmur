import React, { useState } from 'react';
import { Student, Lesson } from '../types';
import { X, Copy, Download, Check, AlertCircle } from 'lucide-react';

interface PaymentReportModalProps {
  student: Student;
  onClose: () => void;
}

const formatDateToDDMM = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const month = parts[1];
  const day = parts[2];
  return `${day}.${month}`;
};

const getWeekdayDateInSameWeek = (lessonDateStr: string, targetRuWeekday: string): string => {
  const ruDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const targetDayIndex = ruDays.indexOf(targetRuWeekday);
  if (targetDayIndex === -1) return '';
  
  const lessonDate = new Date(lessonDateStr);
  const lessonDayIndex = lessonDate.getDay(); // 0-6
  
  // Calculate difference in days
  const diff = targetDayIndex - lessonDayIndex;
  const targetDate = new Date(lessonDate);
  targetDate.setDate(lessonDate.getDate() + diff);
  
  const day = String(targetDate.getDate()).padStart(2, '0');
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
};

const isLessonRescheduledOrExtra = (lesson: Lesson, student: Student): boolean => {
  if (!lesson.date || !lesson.time) return false;
  
  const dateObj = new Date(lesson.date);
  if (isNaN(dateObj.getTime())) return false;
  
  const ruWeekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const dayName = ruWeekdays[dateObj.getDay()];
  
  const cleanedLessonTime = lesson.time.trim();
  
  const matchesRegularSchedule = student.schedule.some(slot => {
    const slotPart = slot.toLowerCase();
    return slotPart.includes(dayName.toLowerCase()) && slotPart.includes(cleanedLessonTime);
  });
  
  return !matchesRegularSchedule;
};

export const PaymentReportModal: React.FC<PaymentReportModalProps> = ({ student, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Filter lessons that occurred (attended or missed_unexcused) and are not marked as paid
  const unpaidLessons = student.lessons.filter(l => 
    (l.status === 'attended' || l.status === 'missed_unexcused') && !l.isPaid
  );

  // Generate detailed description for each unpaid lesson
  const unpaidDescriptions = unpaidLessons.map(lesson => {
    const dateStr = formatDateToDDMM(lesson.date);
    const isTransferOrExtra = isLessonRescheduledOrExtra(lesson, student);
    if (!isTransferOrExtra) {
      return dateStr;
    }

    // Check oneTimeReschedules
    const reschedule = student.oneTimeReschedules?.find(r => r.date === lesson.date);
    if (reschedule && reschedule.originalSlot) {
      const weekdayMatch = reschedule.originalSlot.match(/^(Пн|Вт|Ср|Чт|Пт|Сб|Вс)/i);
      if (weekdayMatch) {
        const origWeekday = weekdayMatch[1];
        const originalDate = getWeekdayDateInSameWeek(lesson.date, origWeekday);
        if (originalDate) {
          return `${dateStr} (перенос с ${originalDate})`;
        }
      }
      return `${dateStr} (перенос)`;
    }

    return `${dateStr} (доп. занятие)`;
  });

  // Join names together politely with commas and "и" for the last item
  const formatList = (items: string[]): string => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    return items.slice(0, -1).join(', ') + ' и ' + items[items.length - 1];
  };

  const formattedDates = formatList(unpaidDescriptions);
  const totalAmount = unpaidLessons.length * student.hourlyRate;

  // Build natural Russian report text
  let reportText = '';
  if (unpaidLessons.length === 0) {
    reportText = `Добрый день! Я проверила, все прошедшие занятия оплачены, задолженностей нет. На всякий случай прошу перепроверить, если у вас другие данные 🙏🏻`;
  } else if (unpaidLessons.length === 1) {
    reportText = `Добрый день, я проверила, у меня не отмечена оплата занятия за ${formattedDates}, итого ${totalAmount} рублей. Но прошу на всякий случай перепроверить, я могла что-то не заметить 🙏🏻`;
  } else {
    reportText = `Добрый день, я проверила, у меня не отмечены оплаты занятий за ${formattedDates}, итого ${totalAmount} рублей. Но прошу на всякий случай перепроверить, я могла что-то не заметить 🙏🏻`;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([reportText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `Отчет_об_оплате_${student.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#12131a] w-full max-w-lg border border-white/10 shadow-2xl rounded-2xl overflow-hidden text-left p-6 space-y-5 animate-scaleIn">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#F4B5CD] uppercase tracking-wider">Отчет об оплате</h3>
            <p className="text-[10px] text-white/40 mt-0.5 font-light">Автоматический расчет долга по занятиям ученика</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition p-1.5 hover:bg-white/5 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Short info */}
        <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
          <div>
            <span className="text-[9px] uppercase tracking-widest font-bold text-white/40 block mb-1">Неоплаченных уроков:</span>
            <span className="text-sm font-mono font-bold text-white">{unpaidLessons.length}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-widest font-bold text-white/40 block mb-1">Сумма задолженности:</span>
            <span className="text-sm font-mono font-bold text-[#F4B5CD]">{totalAmount.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        {/* Text Preview */}
        <div className="space-y-2">
          <label className="block text-[9px] uppercase tracking-widest font-bold text-white/40">Готовое сообщение для отправки:</label>
          <div className="relative">
            <textarea
              readOnly
              value={reportText}
              className="w-full text-xs p-4 border border-white/5 bg-[#0d0f14]/80 text-white rounded-xl focus:outline-none leading-relaxed resize-none h-32 select-all font-sans"
            />
            {unpaidLessons.length > 0 && (
              <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
                <button
                  onClick={handleCopy}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-[#F4B5CD] rounded-lg transition text-[10px] flex items-center gap-1 cursor-pointer"
                  title="Скопировать в буфер обмена"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-[#F4B5CD] rounded-lg transition text-[10px] flex items-center gap-1 cursor-pointer"
                  title="Скачать как текстовый файл"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать .txt</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Warning info */}
        <div className="flex items-start gap-2 text-[10px] text-white/40 leading-relaxed font-light">
          <AlertCircle className="w-3.5 h-3.5 text-[#F4B5CD] shrink-0 mt-0.5" />
          <span>
            Отчет включает только уроки в статусе <strong className="text-white/60">«Был»</strong> или <strong className="text-white/60">«Прогул»</strong>, у которых снята галочка оплаты. Переносы и дополнительные занятия определяются автоматически на основе регулярного расписания.
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-[10px] uppercase tracking-wider font-extrabold transition cursor-pointer text-center"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
