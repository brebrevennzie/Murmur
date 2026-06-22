import React, { useState } from 'react';
import { Student } from '../types';
import { X, Calendar, BookOpen, AlertCircle, CheckCircle, Maximize2, Minimize2 } from 'lucide-react';

interface ParentReportModalProps {
  student: Student;
  onClose: () => void;
}

export function ParentReportModal({ student, onClose }: ParentReportModalProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Statistics calculations
  const totalLessons = student.lessons.length;
  const attendedLessons = student.lessons.filter(l => l.status === 'attended');
  const countAttended = attendedLessons.length;
  
  const missedExcused = student.lessons.filter(l => l.status === 'missed_excused').length;
  const missedUnexcused = student.lessons.filter(l => l.status === 'missed_unexcused').length;
  const totalMissed = missedExcused + missedUnexcused;

  // Homework calculations (count only completed/partially completed ones)
  const lessonsWithHomework = student.lessons.filter(l => (l.homework || l.homeworkStatus) && l.status === 'attended');
  const totalHW = lessonsWithHomework.length;
  const hwCompleted = lessonsWithHomework.filter(l => l.homeworkStatus === 'completed').length;
  const hwPartially = lessonsWithHomework.filter(l => l.homeworkStatus === 'partially').length;

  // Check if there is KTP deviation (lag)
  const ktpLagCount = Math.max(0, student.lessons.filter(l => l.ktpStatus === 'deviated').length - student.lessons.filter(l => l.ktpStatus === 'caught_up').length);
  const hasKtpLag = ktpLagCount > 0;

  // Child progress calculations
  const mockCount = student.mockExams.length;
  const avgPct = mockCount > 0 
    ? Math.round(
        student.mockExams.reduce((acc, current) => acc + (current.score / current.maxScore), 0) / mockCount * 100
      )
    : null;

  const totalGaps = student.topicGaps ? student.topicGaps.length : 0;
  const masteredGaps = student.topicGaps ? student.topicGaps.filter(g => g.status === 'mastered').length : 0;
  const gapPercentage = totalGaps > 0 ? Math.round((masteredGaps / totalGaps) * 100) : null;

  const programTopicsCount = student.program ? student.program.topics.length : 0;
  const programCompletedCount = student.program ? student.program.topics.filter(t => t.status === 'completed').length : 0;
  const programProgressPct = programTopicsCount > 0 ? Math.round((programCompletedCount / programTopicsCount) * 100) : 0;

  const incompleteLessons = student.lessons.filter(l => 
    l.status === 'attended' && 
    (l.homeworkStatus === 'missed' || l.homeworkStatus === 'partially')
  );

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto backdrop-blur-md flex justify-center p-4 transition-all duration-300 ${
      isFullScreen ? 'bg-[#0b0c11]' : 'bg-black/75'
    } ${isFullScreen ? 'items-start pt-6 md:pt-12' : 'items-center'}`}>
      <div className={`bg-[#0d0f14]/85 text-[#ccd3de]/90 border border-white/5 shadow-2xl flex flex-col text-left animate-fadeIn backdrop-blur-xl ${
        isFullScreen 
          ? 'w-full max-w-4xl rounded-2xl p-8 overflow-visible min-h-[90vh]' 
          : 'w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-hidden'
      }`}>
        
        {/* Navigation & Actions of control panel */}
        <div className="flex justify-between items-center pb-4 mb-2 border-b border-white/5 shrink-0 select-none">
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-[#E8C5C8] font-light">Оформление отчета для родителей</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 px-3 border border-white/10 text-[#C3B4FC]/85 hover:text-white rounded-xl bg-white/[0.02] hover:bg-white/[0.06] active:scale-95 text-[9px] transition duration-200 flex items-center gap-1.5 cursor-pointer font-light uppercase tracking-wider font-sans"
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" strokeWidth={1.2} /> : <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.2} />}
              <span>{isFullScreen ? 'Свернуть' : 'На весь экран'}</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 px-3 border border-white/10 text-[#ccd3de]/60 hover:text-white rounded-xl bg-white/[0.02] hover:bg-white/[0.06] active:scale-95 text-[9px] transition duration-200 flex items-center gap-1.5 cursor-pointer font-light uppercase tracking-wider font-sans"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.2} />
              <span>Закрыть</span>
            </button>
          </div>
        </div>
 
        {/* Scrollable Stage Wrapper */}
        <div className="flex-grow overflow-y-auto pr-1 my-3 custom-scrollbar">
          
          {/* SCREENSHOT STAGE AREA (Slimmed down details, Thin elegant typography, Ultra rounded accents) */}
          <div className={`relative bg-[#0d0f14]/40 border border-white/5 rounded-2xl text-slate-300 shadow-3xl overflow-hidden transition-all duration-300 font-sans font-light tracking-wide ${
            isFullScreen ? 'p-8 md:p-10' : 'p-5 md:p-6'
          }`} id="patent-screenshot-container">
            
            {/* Soft Glowing Orbs in Background */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#F4C2D0]/5 rounded-full blur-3xl pointer-events-none select-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#C3B4FC]/5 rounded-full blur-3xl pointer-events-none select-none" />
   
            {/* Accent colored top line strip */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#F4C2D0] to-[#C3B4FC] opacity-40" />
   
            {/* Card Header information */}
            <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-5 relative z-10 select-none">
              <div className="flex items-center gap-4">
                <span className="text-4xl select-none bg-white/[0.02] p-2 rounded-2xl border border-white/5 leading-none shrink-0">{student.emoji}</span>
                <div>
                  <h1 className="text-base sm:text-lg font-sans font-light text-slate-100 tracking-wider leading-snug">{student.name}</h1>
                  <p className="text-[10px] text-[#F4C2D0]/60 font-sans tracking-widest uppercase mt-0.5">{student.subject} ({student.gradeClass})</p>
                  <p className="text-[9px] text-[#ccd3de]/40 mt-1 font-light">Цель курса: {student.goal}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[8px] uppercase tracking-[0.25em] font-light text-[#ccd3de]/35 block">Карта Успеваемости</span>
                <p className="text-[8px] text-[#ccd3de]/30 mt-1 font-mono">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
   
            {/* Statistics Numeric Matrix (3-column layout) */}
            <div className="grid grid-cols-3 gap-3 mb-5 relative z-10 select-none">
              <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-2.5 text-center">
                <p className="text-[8px] uppercase tracking-wider text-[#ccd3de]/40">Всего уроков</p>
                <p className="text-xl sm:text-2xl font-sans font-light text-slate-100 mt-1">{totalLessons}</p>
                <p className="text-[8px] text-[#ccd3de]/20 font-light mt-0.5">за все время</p>
              </div>
              <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-2.5 text-center">
                <p className="text-[8px] uppercase tracking-wider text-[#C3B4FC]/70">Посещено</p>
                <p className="text-xl sm:text-2xl font-sans font-light text-[#C3B4FC]/85 mt-1">{countAttended}</p>
                <p className="text-[8px] text-[#C3B4FC]/30 font-light mt-0.5">уроков пройдено</p>
              </div>
              <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-2.5 text-center">
                <p className="text-[8px] uppercase tracking-wider text-[#D4B2B6]">Пропущено</p>
                <p className="text-xl sm:text-2xl font-sans font-light text-[#D4B2B6] mt-1">{totalMissed}</p>
                <p className="text-[8px] text-[#D4B2B6]/40 font-light mt-0.5">{missedExcused} ув. / {missedUnexcused} неув.</p>
              </div>
            </div>
   
            {/* Details breakdown sections */}
            <div className="space-y-4 relative z-10">
              {/* Homework progress */}
              <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 flex flex-col justify-center">
                <h4 className="text-[10px] uppercase tracking-widest text-[#F4C2D0]/65 font-light flex items-center gap-1.5 mb-2.5 font-sans">
                  <BookOpen className="w-3.5 h-3.5" strokeWidth={1.2} />
                  Выполнение домашних заданий
                </h4>
                <p className="text-xs sm:text-sm font-light text-[#C3B4FC]/80 leading-normal">
                  Выполнено домашних работ: <strong className="text-slate-150 font-sans font-light text-sm sm:text-base">{hwCompleted + hwPartially} из {totalHW}</strong>
                </p>
  
                {incompleteLessons.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-2">
                    <p className="text-[9px] uppercase font-light text-[#D4B2B6] tracking-widest">Причины недовыполнения ДЗ:</p>
                    <div className="space-y-1.5">
                      {incompleteLessons.map((l) => (
                        <div key={l.id} className="text-[11px] bg-white/[0.01] border border-white/[0.04] rounded-xl p-2 flex flex-col gap-1 font-sans">
                          <div className="flex justify-between items-center text-[9px] text-[#ccd3de]/40">
                            <span>Урок {new Date(l.date).toLocaleDateString('ru-RU')}</span>
                            <span className={l.homeworkStatus === 'missed' ? 'text-[#D4B2B6] font-light uppercase text-[8px]' : 'text-[#C3B4FC]/70 font-light uppercase text-[8px]'}>
                              {l.homeworkStatus === 'missed' ? 'Не сдано' : 'Частично'}
                            </span>
                          </div>
                          {l.homework && (
                            <p className="text-[#ccd3de]/50 leading-tight">Задание: <span className="text-[#ccd3de]/65">{l.homework}</span></p>
                          )}
                          <p className="text-[#ccd3de]/70 leading-normal">
                            <span className="text-[#ccd3de]/40 font-light">Причина:</span>{' '}
                            <span className="text-[#D4B2B6] font-light italic">{l.homeworkReason || 'Причина не указана'}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
  
              {/* Progress Card */}
              <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5">
                <h4 className="text-[10px] uppercase tracking-widest text-[#F4C2D0]/65 font-light flex items-center gap-1.5 mb-3 font-sans">
                  📈 Усвоение программы и прогресс
                </h4>
                <div className="space-y-2.5">
                  {/* Mock progress graph */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#ccd3de]/60 font-light">Средний результат по пробникам:</span>
                      <span className="font-light text-slate-100">{avgPct !== null ? `${avgPct}%` : 'Тестовые пробники не проводились'}</span>
                    </div>
                    {avgPct !== null && (
                      <div className="w-full bg-white/[0.02] border border-white/5 rounded-full h-1 overflow-hidden">
                        <div className="bg-gradient-to-r from-[#C3B4FC]/50 to-[#C3B4FC] h-1 rounded-full" style={{ width: `${avgPct}%` }} />
                      </div>
                    )}
                  </div>
  
                  {/* Gap closures stats */}
                  <div className="space-y-1 pt-1.5 border-t border-white/[0.04]">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#ccd3de]/60 font-light">Ликвидировано закрытых пробелов:</span>
                      <span className="font-light text-slate-100">
                        {totalGaps > 0 ? `${masteredGaps} из ${totalGaps} тем (${gapPercentage}%)` : 'Все пробелы устранены!'}
                      </span>
                    </div>
                    {totalGaps > 0 && gapPercentage !== null && (
                      <div className="w-full bg-white/[0.02] border border-white/5 rounded-full h-1 overflow-hidden">
                        <div className="bg-gradient-to-r from-[#C3B4FC]/55 to-slate-400/70 h-1 rounded-full" style={{ width: `${gapPercentage}%` }} />
                      </div>
                    )}
                  </div>
  
                  {/* Program progression bar */}
                  {student.program && (
                    <div className="space-y-1 pt-1.5 border-t border-white/[0.04]">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#ccd3de]/60 font-light">Пройдено тем по календарному плану:</span>
                        <span className="font-light text-slate-100">{programCompletedCount} из {programTopicsCount} тем ({programProgressPct}%)</span>
                      </div>
                      <div className="w-full bg-white/[0.02] border border-white/5 rounded-full h-1 overflow-hidden">
                        <div className="bg-gradient-to-r from-[#F4C2D0]/60 to-[#C3B4FC]/70 h-1 rounded-full" style={{ width: `${programProgressPct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
  
              {/* KTP deviation (lag) */}
              <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 flex flex-col justify-center">
                <h4 className="text-[10px] uppercase tracking-widest text-[#F4C2D0]/65 font-light flex items-center gap-1.5 mb-2 font-sans">
                  <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.2} />
                  Отставание от программы (КТП)
                </h4>
                <p className={`text-xs font-light ${hasKtpLag ? 'text-[#D4B2B6]' : 'text-[#C3B4FC]/80'}`}>
                  {hasKtpLag ? (
                    <span>Отставание от КТП: <strong className="text-slate-100 text-xs sm:text-sm font-sans font-light">{ktpLagCount}</strong> {ktpLagCount === 1 ? 'занятие' : (ktpLagCount > 1 && ktpLagCount < 5) ? 'занятия' : 'занятий'}</span>
                  ) : (
                    <span>Идет ровно по КТП (отставаний нет)</span>
                  )}
                </p>
              </div>
  
              {/* KTP Program Progress and Lag alert info */}
              {student.program && (
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5">
                  <h4 className="text-[10px] uppercase tracking-widest text-[#F4C2D0]/65 font-light flex items-center gap-1.5 mb-2.5 font-sans">
                    <Calendar className="w-3.5 h-3.5 text-[#F4C2D0]/60" strokeWidth={1.2} />
                    Учебный план и КТП
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#ccd3de]/75 font-light">
                        Программа обучения: <strong className="text-slate-100 font-light">{student.program.name}</strong>
                      </p>
                      <p className="text-[9px] text-[#ccd3de]/40 mt-1 font-mono">
                        Пройдено тем по плану КТП: {student.program.topics.filter(t => t.status === 'completed').length} из {student.program.topics.length}
                      </p>
                    </div>
                    <div className="shrink-0 select-none">
                      {hasKtpLag ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#D4B2B6]/10 text-[#D4B2B6] border border-[#D4B2B6]/20 rounded-xl text-[9px] font-light uppercase tracking-wider font-sans">
                          <AlertCircle className="w-3 h-3" strokeWidth={1.2} />
                          Отставание от КТП (на {ktpLagCount} {ktpLagCount === 1 ? 'занятие' : (ktpLagCount > 1 && ktpLagCount < 5) ? 'занятия' : 'занятий'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#C3B4FC]/10 text-[#C3B4FC] border border-[#C3B4FC]/20 rounded-xl text-[9px] font-light uppercase tracking-wider font-sans">
                          <CheckCircle className="w-3 h-3 text-[#C3B4FC]" strokeWidth={1.2} />
                          Идет ровно по КТП
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
  
            {/* Footnote */}
            <div className="mt-5 pt-3.5 border-t border-white/[0.04] flex justify-between items-center text-[8px] text-[#ccd3de]/20 select-none font-sans uppercase tracking-widest font-light">
              <span>Система аналитики прогресса — Отчет успеваемости</span>
            </div>
  
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-2 pt-3 border-t border-white/5 flex justify-end shrink-0 select-none">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#C3B4FC]/10 hover:bg-[#C3B4FC]/15 active:scale-[0.98] border border-[#C3B4FC]/20 text-[#C3B4FC] text-[9px] font-light uppercase tracking-widest rounded-xl transition duration-200 cursor-pointer backdrop-blur-md shadow-md font-sans"
          >
            Всё готово
          </button>
        </div>

      </div>
    </div>
  );
}
