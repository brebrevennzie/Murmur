import React from 'react';
import { Student } from '../types';
import { BookOpen, Calendar, CircleDot, DollarSign, Award } from 'lucide-react';

interface StudentCardProps {
  student: Student;
  onSelect: () => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, onSelect }) => {
  // Compute average mock score
  const mockCount = student.mockExams.length;
  const avgPct = mockCount > 0 
    ? Math.round(
        student.mockExams.reduce((acc, current) => acc + (current.score / current.maxScore), 0) / mockCount * 100
      )
    : null;

  // Find latest mock score
  const latestMock = mockCount > 0 
    ? student.mockExams[mockCount - 1] 
    : null;

  return (
    <div 
      onClick={onSelect}
      className="group relative bg-[#12131a] hover:bg-[#171922] border border-white/5 hover:border-[#F4B5CD]/35 p-6 rounded-2xl transition-all duration-300 cursor-pointer hover:shadow-2xl flex flex-col justify-between"
    >
      {/* Top Banner Cover Indicator */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl" 
        style={{ background: student.coverColor }}
      />

      <div className="space-y-4">
        {/* Header Info */}
        <div className="flex justify-between items-start pt-1 gap-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{student.emoji}</span>
            <div>
              <h3 className="font-serif text-white text-lg group-hover:text-dusty-rose transition-colors duration-300">
                {student.name}
              </h3>
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-[0.1em] mt-0.5">
                {student.gradeClass} • {student.subject}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 select-none">
            {student.balanceLessons < 0 ? (
              <span className="px-2 py-1 text-[9px] uppercase tracking-wider font-extrabold bg-rose-500/10 border border-rose-500/25 text-rose-450 rounded-xl">
                Долг: {student.balanceLessons} зан.
              </span>
            ) : student.balanceLessons === 0 ? (
              <span className="px-2 py-1 text-[9px] uppercase tracking-wider font-extrabold bg-lavender/10 border border-lavender/25 text-lavender rounded-xl">
                0 занятий
              </span>
            ) : (
              <span className="px-2 py-1 text-[9px] uppercase tracking-wider font-extrabold bg-lavender/15 border border-lavender/25 text-lavender rounded-xl">
                Баланс: {student.balanceLessons} зан.
              </span>
            )}
          </div>


        </div>

        {/* Main Goal and Subject Description */}
        <div className="space-y-2.5 pt-2 border-t border-white/5">
          {/* Goal */}
          <div className="flex items-start gap-2.5 text-xs text-white/70">
            <CircleDot className="w-4 h-4 text-[#F4B5CD] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <span className="text-white/40 uppercase text-[9px] tracking-wider">Цель:</span> {student.goal}
            </span>
          </div>

          {/* Schedule */}
          <div className="flex items-center gap-2.5 text-xs text-white/60">
            <Calendar className="w-4 h-4 text-white/20 shrink-0" />
            <span>
              <span className="text-white/40 uppercase text-[9px] tracking-wider">График:</span> {student.schedule.join(', ') || 'Не назначено'}
            </span>
          </div>

          {/* Average / Latest score indicator */}
          {avgPct !== null ? (
            <div className="flex items-center gap-2.5 text-xs text-white/70 border-t border-white/5 pt-3 mt-1">
              <Award className="w-4 h-4 text-dusty-rose shrink-0" />
              <div className="flex justify-between w-full items-center">
                <span className="text-white/40 uppercase text-[9px] tracking-wider">Успеваемость:</span>
                <span className="font-serif text-white font-medium text-sm">
                  {avgPct}% {latestMock && `(${latestMock.score}/${latestMock.maxScore})`}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs text-white/40 border-t border-white/5 pt-3 mt-1 font-serif">
              <BookOpen className="w-3.5 h-3.5 text-white/20" />
              <span>Пробники еще не проводились</span>
            </div>
          )}
        </div>
      </div>

      {/* Background elegant link arrow */}
      <div className="absolute bottom-5 right-5 text-white/10 group-hover:text-[#F4B5CD] transition-all duration-350 transform group-hover:translate-x-1 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </div>
  );
};
