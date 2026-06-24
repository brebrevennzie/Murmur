import React, { useState } from 'react';
import { Student, Lesson } from '../types';
import { X, Calendar, BookOpen, AlertCircle, CheckCircle, Maximize2, Minimize2, Award } from 'lucide-react';

const getCheckedHomeworkForLesson = (lesson: Lesson, student: Student): string => {
  if (!student.lessons || student.lessons.length === 0) return '';
  const pastLessons = student.lessons
    .filter(p => p.status !== 'cancelled' && p.date < lesson.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  const previousLessonWithHw = pastLessons.find(p => p.homework && p.homework.trim());
  return previousLessonWithHw ? previousLessonWithHw.homework : '';
};

interface ParentReportModalProps {
  student: Student;
  onClose: () => void;
}

export function ParentReportModal({ student, onClose }: ParentReportModalProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [reportStyle, setReportStyle] = useState<'cosmic' | 'classic' | 'patsan'>('cosmic');

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

        {/* Style selection tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-3 mb-3 border-b border-white/5 select-none shrink-0">
          <span className="text-[10px] text-[#ccd3de]/50 uppercase tracking-wider font-mono">Выбор стиля отчета:</span>
          <div className="flex flex-wrap gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
            <button
              type="button"
              onClick={() => setReportStyle('cosmic')}
              className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-mono tracking-wider transition-all duration-200 cursor-pointer ${
                reportStyle === 'cosmic'
                  ? 'bg-gradient-to-r from-[#F4C2D0]/20 to-[#C3B4FC]/20 text-white border border-[#C3B4FC]/30 font-semibold'
                  : 'text-[#ccd3de]/60 hover:text-white border border-transparent'
              }`}
            >
              🌌 Космический
            </button>
            <button
              type="button"
              onClick={() => setReportStyle('classic')}
              className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-mono tracking-wider transition-all duration-200 cursor-pointer ${
                reportStyle === 'classic'
                  ? 'bg-white text-stone-950 border border-stone-300 font-semibold shadow-sm'
                  : 'text-[#ccd3de]/60 hover:text-white border border-transparent'
              }`}
            >
              📜 Строгий классический
            </button>
            <button
              type="button"
              onClick={() => setReportStyle('patsan')}
              className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-mono tracking-wider transition-all duration-200 cursor-pointer ${
                reportStyle === 'patsan'
                  ? 'bg-[#1e293b] text-[#94a3b8] border border-[#475569] font-semibold'
                  : 'text-[#ccd3de]/60 hover:text-white border border-transparent'
              }`}
            >
              👔 Стальной темный
            </button>
          </div>
        </div>
 
        {/* Scrollable Stage Wrapper */}
        <div className="flex-grow overflow-y-auto pr-1 my-3 custom-scrollbar">
          
          {/* SCREENSHOT STAGE AREA */}
          <div 
            className={`relative overflow-hidden transition-all duration-300 ${
              isFullScreen ? 'p-8 md:p-10' : 'p-5 md:p-6'
            } ${
              reportStyle === 'cosmic'
                ? 'bg-[#0d0f14]/40 border border-white/5 rounded-2xl text-slate-300 shadow-3xl font-sans font-light tracking-wide'
                : reportStyle === 'classic'
                  ? 'bg-[#fbfaf6] text-stone-800 border border-stone-200 rounded-xl shadow-md font-serif tracking-normal'
                  : 'bg-[#0f131a] text-slate-300 border border-[#2d3748] rounded-2xl shadow-3xl font-sans font-light tracking-wide'
            }`} 
            id="patent-screenshot-container"
          >
            
            {/* Background elements based on theme */}
            {reportStyle === 'cosmic' && (
              <>
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#F4C2D0]/5 rounded-full blur-3xl pointer-events-none select-none" />
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#C3B4FC]/5 rounded-full blur-3xl pointer-events-none select-none" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#F4C2D0] to-[#C3B4FC] opacity-40" />
              </>
            )}

            {reportStyle === 'classic' && (
              <>
                <div className="absolute top-0 left-0 right-0 h-1 bg-stone-300 opacity-80" />
                {/* Academic coat of arms icon watermarked */}
                <div className="absolute -top-12 -right-12 w-40 h-40 opacity-[0.02] border border-stone-400 rounded-full flex items-center justify-center font-sans tracking-widest text-[#000] rotate-12 select-none pointer-events-none text-[8px]">
                  OFFICIAL AUDIT REPORT WAKEUP ACADEMY
                </div>
              </>
            )}

            {reportStyle === 'patsan' && (
              <>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-600 opacity-60" />
                <div className="absolute top-2 right-3 text-[8px] text-slate-500 uppercase select-none font-mono tracking-widest">
                  СТАЛЬНОЙ ТЕМНЫЙ ДИЗАЙН
                </div>
              </>
            )}
   
            {/* Card Header information */}
            <div className={`flex justify-between items-start pb-4 mb-5 relative z-10 select-none ${
              reportStyle === 'cosmic'
                ? 'border-b border-white/5'
                : reportStyle === 'classic'
                  ? 'border-b border-stone-200'
                  : 'border-b border-slate-850'
            }`}>
              <div className="flex items-center gap-4">
                {reportStyle === 'cosmic' && (
                  <>
                    <span className="text-4xl select-none bg-white/[0.02] p-2 rounded-2xl border border-white/5 leading-none shrink-0">{student.emoji}</span>
                    <div>
                      <h1 className="text-base sm:text-lg font-sans font-light text-slate-100 tracking-wider leading-snug">{student.name}</h1>
                      <p className="text-[10px] text-[#F4C2D0]/60 font-sans tracking-widest uppercase mt-0.5">{student.subject} ({student.gradeClass})</p>
                      <p className="text-[9px] text-[#ccd3de]/40 mt-1 font-light">Цель курса: {student.goal}</p>
                    </div>
                  </>
                )}

                {reportStyle === 'classic' && (
                  <>
                    <div className="w-14 h-14 flex items-center justify-center bg-stone-50 border border-stone-200 rounded-full text-3xl shrink-0 leading-none shadow-sm select-none">
                      {student.emoji}
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-serif font-medium text-stone-900 tracking-normal leading-tight">{student.name}</h1>
                      <p className="text-[10px] text-stone-500 font-sans tracking-widest uppercase mt-0.5">{student.subject} ({student.gradeClass})</p>
                      <p className="text-[9px] text-stone-400 mt-1 font-sans italic">Цель курса: {student.goal}</p>
                    </div>
                  </>
                )}

                {reportStyle === 'patsan' && (
                  <>
                    <div className="text-3xl p-2 border border-slate-700 bg-slate-900 rounded-xl shrink-0 leading-none">
                      {student.emoji}
                    </div>
                    <div>
                      <h1 className="text-base sm:text-lg font-sans font-medium text-slate-100 tracking-wider leading-snug">{student.name}</h1>
                      <p className="text-[10px] text-slate-400 font-sans tracking-widest uppercase mt-0.5">{student.subject} ({student.gradeClass})</p>
                      <p className="text-[9px] text-slate-500 mt-1 font-light">Цель курса: {student.goal}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="text-right shrink-0">
                {reportStyle === 'cosmic' && (
                  <>
                    <span className="text-[8px] uppercase tracking-[0.25em] font-light text-[#ccd3de]/35 block">Карта Успеваемости</span>
                    <p className="text-[8px] text-[#ccd3de]/30 mt-1 font-mono">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </>
                )}
                {reportStyle === 'classic' && (
                  <>
                    <span className="text-[8px] uppercase tracking-[0.2em] font-light text-stone-500 block">Карта Успеваемости</span>
                    <p className="text-[8px] text-stone-400 mt-1 font-sans">Дата: {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </>
                )}
                {reportStyle === 'patsan' && (
                  <>
                    <span className="text-[8px] uppercase tracking-[0.2em] font-light text-slate-500 block">Карта Успеваемости</span>
                    <p className="text-[8px] text-slate-500 mt-1 font-mono">{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </>
                )}
              </div>
            </div>
    
            {/* Statistics Numeric Matrix (3-column layout) */}
            <div className="grid grid-cols-3 gap-3 mb-5 relative z-10 select-none">
              {reportStyle === 'cosmic' && (
                <>
                  <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-wider text-[#ccd3de]/40 font-sans">Всего уроков</p>
                    <p className="text-xl sm:text-2xl font-sans font-light text-slate-100 mt-1">{totalLessons}</p>
                    <p className="text-[8px] text-[#ccd3de]/20 font-light mt-0.5 font-sans">за все время</p>
                  </div>
                  <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-wider text-[#C3B4FC]/70 font-sans">Посещено</p>
                    <p className="text-xl sm:text-2xl font-sans font-light text-[#C3B4FC]/85 mt-1">{countAttended}</p>
                    <p className="text-[8px] text-[#C3B4FC]/30 font-light mt-0.5 font-sans">уроков пройдено</p>
                  </div>
                  <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-wider text-[#D4B2B6] font-sans">Пропущено</p>
                    <p className="text-xl sm:text-2xl font-sans font-light text-[#D4B2B6] mt-1">{totalMissed}</p>
                    <p className="text-[8px] text-[#D4B2B6]/40 font-light mt-0.5 font-sans">{missedExcused} ув. / {missedUnexcused} неув.</p>
                  </div>
                </>
              )}

              {reportStyle === 'classic' && (
                <>
                  <div className="bg-stone-50/40 border border-stone-200 rounded-xl p-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-wider text-stone-500 font-sans">Всего уроков</p>
                    <p className="text-xl sm:text-2xl font-serif text-stone-800 mt-1">{totalLessons}</p>
                    <p className="text-[8px] text-stone-400 font-light mt-0.5 font-sans">по учебному плану</p>
                  </div>
                  <div className="bg-stone-50/40 border border-stone-200 rounded-xl p-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-wider text-stone-500 font-sans">Посещено</p>
                    <p className="text-xl sm:text-2xl font-serif text-stone-800 mt-1">{countAttended}</p>
                    <p className="text-[8px] text-stone-400 font-light mt-0.5 font-sans">занятий пройдено</p>
                  </div>
                  <div className="bg-stone-50/40 border border-stone-200 rounded-xl p-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-wider text-stone-500 font-sans">Пропущено</p>
                    <p className="text-xl sm:text-2xl font-serif text-stone-800 mt-1">{totalMissed}</p>
                    <p className="text-[8px] text-stone-400 font-light mt-0.5 font-sans">{missedExcused} ув. / {missedUnexcused} неув.</p>
                  </div>
                </>
              )}

              {reportStyle === 'patsan' && (
                <>
                  <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-wider text-slate-400 font-sans">Всего уроков</p>
                    <p className="text-xl sm:text-2xl font-sans font-light text-slate-100 mt-1">{totalLessons}</p>
                    <p className="text-[8px] text-slate-500 font-light mt-0.5 font-sans">по учебному плану</p>
                  </div>
                  <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-wider text-blue-400/80 font-sans">Посещено</p>
                    <p className="text-xl sm:text-2xl font-sans font-light text-blue-350 mt-1">{countAttended}</p>
                    <p className="text-[8px] text-slate-500 font-light mt-0.5 font-sans">занятий пройдено</p>
                  </div>
                  <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-wider text-slate-400 font-sans">Пропущено</p>
                    <p className="text-xl sm:text-2xl font-sans font-light text-slate-350 mt-1">{totalMissed}</p>
                    <p className="text-[8px] text-slate-500 font-light mt-0.5 font-sans">{missedExcused} ув. / {missedUnexcused} неув.</p>
                  </div>
                </>
              )}
            </div>
    
            {/* Details breakdown sections */}
            <div className="space-y-4 relative z-10">
              
              {/* Homework progress */}
              <div className={`p-4 flex flex-col justify-center ${
                reportStyle === 'cosmic'
                  ? 'bg-white/[0.01] border border-white/[0.04] rounded-xl'
                  : reportStyle === 'classic'
                    ? 'bg-[#fbfaf6] border border-stone-200 rounded-xl text-stone-800 font-sans'
                    : 'bg-slate-900/30 border border-slate-800 rounded-xl text-slate-300 font-sans'
              }`}>
                {reportStyle === 'cosmic' && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-[#F4C2D0]/65 font-light flex items-center gap-1.5 mb-2.5 font-sans">
                      <BookOpen className="w-3.5 h-3.5" strokeWidth={1.2} />
                      Выполнение домашних заданий
                    </h4>
                    <p className="text-xs sm:text-sm font-light text-[#C3B4FC]/80 leading-normal">
                      Выполнено домашних работ: <strong className="text-slate-150 font-sans font-light text-sm sm:text-base">{hwCompleted + hwPartially} из {totalHW}</strong>
                    </p>
                  </>
                )}

                {reportStyle === 'classic' && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-stone-500 font-medium flex items-center gap-1.5 mb-2.5 font-sans">
                      <BookOpen className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.2} />
                      Выполнение домашних заданий
                    </h4>
                    <p className="text-xs sm:text-sm font-light text-stone-700 leading-normal">
                      Сдано домашних работ: <strong className="text-stone-900 font-sans font-medium text-sm sm:text-base">{hwCompleted + hwPartially} из {totalHW}</strong>
                    </p>
                  </>
                )}

                {reportStyle === 'patsan' && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-medium flex items-center gap-1.5 mb-2.5 font-sans">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.2} />
                      Выполнение домашних заданий
                    </h4>
                    <p className="text-xs sm:text-sm font-light text-slate-300 leading-normal">
                      Сдано домашних работ: <strong className="text-slate-100 font-sans font-medium text-sm sm:text-base">{hwCompleted + hwPartially} из {totalHW}</strong>
                    </p>
                  </>
                )}
  
                {incompleteLessons.length > 0 && (
                  <div className={`mt-3 pt-3 border-t space-y-2 ${
                    reportStyle === 'cosmic'
                      ? 'border-white/[0.04]'
                      : reportStyle === 'classic'
                        ? 'border-stone-200'
                        : 'border-slate-800/60'
                  }`}>
                    <p className={`text-[9px] uppercase tracking-widest font-bold ${
                      reportStyle === 'cosmic'
                        ? 'text-[#D4B2B6]'
                        : reportStyle === 'classic'
                          ? 'text-stone-700 font-sans'
                          : 'text-slate-400 font-sans'
                    }`}>
                      {reportStyle === 'cosmic' && "Причины недовыполнения ДЗ:"}
                      {reportStyle === 'classic' && "Сведения о невыполненных домашних работах:"}
                      {reportStyle === 'patsan' && "Сведения о невыполненных домашних работах:"}
                    </p>
                    <div className="space-y-1.5">
                      {incompleteLessons.map((l) => (
                        <div 
                          key={l.id} 
                          className={`p-2 flex flex-col gap-1 ${
                            reportStyle === 'cosmic'
                              ? 'text-[11px] bg-white/[0.01] border border-white/[0.04] rounded-xl font-sans'
                              : reportStyle === 'classic'
                                ? 'text-[11px] bg-stone-50 border border-stone-200 rounded-xl font-sans text-stone-700'
                                : 'text-[11px] bg-slate-900/10 border border-slate-800/60 rounded-xl font-sans text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[9px]">
                            {reportStyle === 'cosmic' && (
                              <>
                                <span className="text-[#ccd3de]/50">Урок {new Date(l.date).toLocaleDateString('ru-RU')}</span>
                                <span className={l.homeworkStatus === 'missed' ? 'text-[#D4B2B6] font-light uppercase text-[8px]' : 'text-[#C3B4FC]/70 font-light uppercase text-[8px]'}>
                                  {l.homeworkStatus === 'missed' ? 'Не сдано' : 'Частично'}
                                </span>
                              </>
                            )}

                            {reportStyle === 'classic' && (
                              <>
                                <span className="text-stone-500">Задание от {new Date(l.date).toLocaleDateString('ru-RU')}</span>
                                <span className={`font-sans font-medium uppercase text-[8px] ${l.homeworkStatus === 'missed' ? 'text-stone-400' : 'text-stone-600'}`}>
                                  {l.homeworkStatus === 'missed' ? 'Не сдано' : 'Частично'}
                                </span>
                              </>
                            )}

                            {reportStyle === 'patsan' && (
                              <>
                                <span className="text-slate-500">Задание от {new Date(l.date).toLocaleDateString('ru-RU')}</span>
                                <span className={`font-sans font-medium uppercase text-[8px] ${l.homeworkStatus === 'missed' ? 'text-slate-400' : 'text-blue-400'}`}>
                                  {l.homeworkStatus === 'missed' ? 'Не сдано' : 'Частично'}
                                </span>
                              </>
                            )}
                          </div>
                          {(() => {
                            const missedHw = getCheckedHomeworkForLesson(l, student) || l.homework;
                            if (!missedHw) return null;
                            return (
                              <p className="text-[10px] leading-tight">
                                {reportStyle === 'cosmic' && <>Задание: <span className="text-[#ccd3de]/65">{missedHw}</span></>}
                                {reportStyle === 'classic' && <>Материал задания: <span className="text-stone-600 font-medium">«{missedHw}»</span></>}
                                {reportStyle === 'patsan' && <>Материал задания: <span className="text-slate-400 font-medium">«{missedHw}»</span></>}
                              </p>
                            );
                          })()}
                          <p className="text-[11px] leading-normal">
                            {reportStyle === 'cosmic' && (
                              <>
                                <span className="text-[#ccd3de]/40 font-light">Причина:</span>{' '}
                                <span className="text-[#D4B2B6] font-light italic">{l.homeworkReason || 'Причина не указана'}</span>
                              </>
                            )}
                            {reportStyle === 'classic' && (
                              <>
                                <span className="text-stone-500 font-light">Причина невыполнения:</span>{' '}
                                <span className="text-stone-600 font-medium italic">{l.homeworkReason || 'Не указана'}</span>
                              </>
                            )}
                            {reportStyle === 'patsan' && (
                              <>
                                <span className="text-slate-500 font-light">Причина невыполнения:</span>{' '}
                                <span className="text-slate-400 font-medium italic">{l.homeworkReason || 'Не указана'}</span>
                              </>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
  
              {/* Progress Card */}
              <div className={`p-4 ${
                reportStyle === 'cosmic'
                  ? 'bg-white/[0.01] border border-white/[0.04] rounded-xl'
                  : reportStyle === 'classic'
                    ? 'bg-[#fbfaf6] border border-stone-200 rounded-xl text-stone-800 font-sans'
                    : 'bg-slate-900/30 border border-slate-800 rounded-xl text-slate-300 font-sans'
              }`}>
                {reportStyle === 'cosmic' && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-[#F4C2D0]/65 font-light flex items-center gap-1.5 mb-3 font-sans">
                      📈 Усвоение программы и прогресс
                    </h4>
                  </>
                )}

                {reportStyle === 'classic' && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-stone-500 font-medium flex items-center gap-1.5 mb-3 font-sans">
                      📈 Усвоение программы и прогресс
                    </h4>
                  </>
                )}

                {reportStyle === 'patsan' && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-medium flex items-center gap-1.5 mb-3 font-sans">
                      📈 Усвоение программы и прогресс
                    </h4>
                  </>
                )}

                <div className="space-y-3">
                  {/* Mock progress graph */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      {reportStyle === 'cosmic' && (
                        <>
                          <span className="text-[#ccd3de]/60 font-light">Средний результат по пробникам:</span>
                          <span className="font-light text-slate-100">{avgPct !== null ? `${avgPct}%` : 'Тестовые пробники не проводились'}</span>
                        </>
                      )}
                      {reportStyle === 'classic' && (
                        <>
                          <span className="text-stone-600 font-light">Средний результат по пробникам:</span>
                          <span className="font-medium text-stone-800">{avgPct !== null ? `${avgPct}%` : 'Тестовые пробники не проводились'}</span>
                        </>
                      )}
                      {reportStyle === 'patsan' && (
                        <>
                          <span className="text-slate-400 font-light">Средний результат по пробникам:</span>
                          <span className="font-medium text-slate-100">{avgPct !== null ? `${avgPct}%` : 'Тестовые пробники не проводились'}</span>
                        </>
                      )}
                    </div>
                    {avgPct !== null && (
                      <div className={`w-full h-1.5 overflow-hidden rounded-full ${
                        reportStyle === 'cosmic'
                          ? 'bg-white/[0.02] border border-white/5'
                          : reportStyle === 'classic'
                            ? 'bg-stone-200/50 border border-stone-300/30'
                            : 'bg-slate-950 border border-slate-800'
                      }`}>
                        <div 
                          className={`h-full rounded-full ${
                            reportStyle === 'cosmic'
                              ? 'bg-gradient-to-r from-[#C3B4FC]/50 to-[#C3B4FC]'
                              : reportStyle === 'classic'
                                ? 'bg-stone-400'
                                : 'bg-blue-500'
                          }`} 
                          style={{ width: `${avgPct}%` }} 
                        />
                      </div>
                    )}
                  </div>
  
                  {/* Gap closures stats */}
                  <div className={`space-y-1 pt-1.5 border-t ${
                    reportStyle === 'cosmic'
                      ? 'border-white/[0.04]'
                      : reportStyle === 'classic'
                        ? 'border-stone-200'
                        : 'border-slate-800/60'
                  }`}>
                    <div className="flex justify-between items-center text-[11px]">
                      {reportStyle === 'cosmic' && (
                        <>
                          <span className="text-[#ccd3de]/60 font-light">Ликвидировано закрытых пробелов:</span>
                          <span className="font-light text-slate-100">
                            {totalGaps > 0 ? `${masteredGaps} из ${totalGaps} тем (${gapPercentage}%)` : 'Все пробелы устранены!'}
                          </span>
                        </>
                      )}
                      {reportStyle === 'classic' && (
                        <>
                          <span className="text-stone-600 font-light">Ликвидировано пробелов в знаниях:</span>
                          <span className="font-medium text-stone-800">
                            {totalGaps > 0 ? `${masteredGaps} из ${totalGaps} тем (${gapPercentage}%)` : 'Все пробелы устранены!'}
                          </span>
                        </>
                      )}
                      {reportStyle === 'patsan' && (
                        <>
                          <span className="text-slate-400 font-light">Ликвидировано пробелов в знаниях:</span>
                          <span className="font-medium text-slate-100">
                            {totalGaps > 0 ? `${masteredGaps} из ${totalGaps} тем (${gapPercentage}%)` : 'Все пробелы успешно устранены'}
                          </span>
                        </>
                      )}
                    </div>
                    {totalGaps > 0 && gapPercentage !== null && (
                      <div className={`w-full h-1.5 overflow-hidden rounded-full ${
                        reportStyle === 'cosmic'
                          ? 'bg-white/[0.02] border border-white/5'
                          : reportStyle === 'classic'
                            ? 'bg-stone-200/50 border border-stone-300/30'
                            : 'bg-slate-950 border border-slate-800'
                      }`}>
                        <div 
                          className={`h-full rounded-full ${
                            reportStyle === 'cosmic'
                              ? 'bg-gradient-to-r from-[#C3B4FC]/55 to-slate-400/70'
                              : reportStyle === 'classic'
                                ? 'bg-stone-400'
                                : 'bg-slate-600'
                          }`} 
                          style={{ width: `${gapPercentage}%` }} 
                        />
                      </div>
                    )}
                  </div>
  
                  {/* Program progression bar */}
                  {student.program && (
                    <div className={`space-y-1 pt-1.5 border-t ${
                      reportStyle === 'cosmic'
                        ? 'border-white/[0.04]'
                        : reportStyle === 'classic'
                          ? 'border-stone-200'
                          : 'border-slate-800/60'
                    }`}>
                      <div className="flex justify-between items-center text-[11px]">
                        {reportStyle === 'cosmic' && (
                          <>
                            <span className="text-[#ccd3de]/60 font-light">Пройдено тем по календарному плану:</span>
                            <span className="font-light text-slate-100">{programCompletedCount} из {programTopicsCount} тем ({programProgressPct}%)</span>
                          </>
                        )}
                        {reportStyle === 'classic' && (
                          <>
                            <span className="text-stone-600 font-light">Освоение разделов учебной программы:</span>
                            <span className="font-medium text-stone-800">{programCompletedCount} из {programTopicsCount} тем ({programProgressPct}%)</span>
                          </>
                        )}
                        {reportStyle === 'patsan' && (
                          <>
                            <span className="text-slate-400 font-light">Освоение разделов учебной программы:</span>
                            <span className="font-medium text-slate-100">{programCompletedCount} из {programTopicsCount} тем ({programProgressPct}%)</span>
                          </>
                        )}
                      </div>
                      <div className={`w-full h-1.5 overflow-hidden rounded-full ${
                        reportStyle === 'cosmic'
                          ? 'bg-white/[0.02] border border-white/5'
                          : reportStyle === 'classic'
                            ? 'bg-stone-200/50 border border-stone-300/30'
                            : 'bg-slate-950 border border-slate-800'
                      }`}>
                        <div 
                          className={`h-full rounded-full ${
                            reportStyle === 'cosmic'
                              ? 'bg-gradient-to-r from-[#F4C2D0]/60 to-[#C3B4FC]/70'
                              : reportStyle === 'classic'
                                ? 'bg-stone-400'
                                : 'bg-slate-500'
                          }`} 
                          style={{ width: `${programProgressPct}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
  
              {/* KTP deviation (lag) & Plan info */}
              <div className={`p-4 flex flex-col justify-center ${
                reportStyle === 'cosmic'
                  ? 'bg-white/[0.01] border border-white/[0.04] rounded-xl'
                  : reportStyle === 'classic'
                    ? 'bg-[#fbfaf6] border border-stone-200 rounded-xl text-stone-800 font-sans'
                    : 'bg-slate-900/30 border border-slate-800 rounded-xl text-slate-300 font-sans'
              }`}>
                {reportStyle === 'cosmic' && (
                  <>
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
                  </>
                )}

                {reportStyle === 'classic' && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-stone-500 font-medium flex items-center gap-1.5 mb-2 font-sans">
                      <AlertCircle className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.2} />
                      Календарно-тематический график (КТП)
                    </h4>
                    <p className="text-xs font-light text-stone-700">
                      {hasKtpLag ? (
                        <span>Выявлено отставание от КТП: <strong className="text-stone-900 text-xs sm:text-sm font-sans font-medium">{ktpLagCount} {ktpLagCount === 1 ? 'занятие' : (ktpLagCount > 1 && ktpLagCount < 5) ? 'занятия' : 'занятий'}</strong></span>
                      ) : (
                        <span>Обучение проходит в полном соответствии с графиком КТП</span>
                      )}
                    </p>
                  </>
                )}

                {reportStyle === 'patsan' && (
                  <>
                    <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-medium flex items-center gap-1.5 mb-2 font-sans">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.2} />
                      Календарно-тематический график (КТП)
                    </h4>
                    <p className="text-xs font-light text-slate-300">
                      {hasKtpLag ? (
                        <span>Выявлено отставание от КТП: <strong className="text-slate-100 text-xs sm:text-sm font-sans font-medium">{ktpLagCount} {ktpLagCount === 1 ? 'занятие' : (ktpLagCount > 1 && ktpLagCount < 5) ? 'занятия' : 'занятий'}</strong></span>
                      ) : (
                        <span>Обучение проходит в полном соответствии с графиком КТП</span>
                      )}
                    </p>
                  </>
                )}
              </div>
  
              {/* KTP Program Details if present */}
              {student.program && (
                <div className={`p-4 ${
                  reportStyle === 'cosmic'
                    ? 'bg-white/[0.01] border border-white/[0.04] rounded-xl'
                    : reportStyle === 'classic'
                      ? 'bg-[#fbfaf6] border border-stone-200 rounded-xl font-sans text-stone-800'
                      : 'bg-slate-900/30 border border-slate-800 rounded-xl font-sans'
                }`}>
                  <h4 className={`text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 mb-3 ${
                    reportStyle === 'cosmic'
                      ? 'text-[#F4C2D0]/65 font-sans'
                      : reportStyle === 'classic'
                        ? 'text-stone-550 font-sans'
                        : 'text-slate-400 font-sans'
                  }`}>
                    <Calendar className="w-3.5 h-3.5" strokeWidth={1.2} />
                    {reportStyle === 'cosmic' && "Учебный план и КТП"}
                    {reportStyle === 'classic' && "Календарно-тематический план"}
                    {reportStyle === 'patsan' && "Календарно-тематический план"}
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#ccd3de]/75">
                        {reportStyle === 'cosmic' && (
                          <>Программа обучения: <strong className="text-slate-100 font-light">{student.program.name}</strong></>
                        )}
                        {reportStyle === 'classic' && (
                          <>Программа обучения: <strong className="text-stone-800 font-medium">«{student.program.name}»</strong></>
                        )}
                        {reportStyle === 'patsan' && (
                          <>Программа обучения: <strong className="text-slate-100 font-medium">«{student.program.name}»</strong></>
                        )}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        {reportStyle === 'cosmic' && `Пройдено тем по плану КТП: ${student.program.topics.filter(t => t.status === 'completed').length} из ${student.program.topics.length}`}
                        {reportStyle === 'classic' && `Пройдено тем по плану КТП: ${student.program.topics.filter(t => t.status === 'completed').length} из ${student.program.topics.length}`}
                        {reportStyle === 'patsan' && `Пройдено тем по плану КТП: ${student.program.topics.filter(t => t.status === 'completed').length} из ${student.program.topics.length}`}
                      </p>
                    </div>
                    <div className="shrink-0 select-none">
                      {hasKtpLag ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[9px] font-bold uppercase tracking-wider rounded-xl ${
                          reportStyle === 'cosmic'
                            ? 'bg-[#D4B2B6]/10 text-[#D4B2B6] border-[#D4B2B6]/20'
                            : reportStyle === 'classic'
                              ? 'bg-stone-100 text-stone-600 border-stone-200 font-sans'
                              : 'bg-slate-950 text-slate-400 border-slate-800 font-sans'
                        }`}>
                          <AlertCircle className="w-3 h-3" strokeWidth={1.2} />
                          {reportStyle === 'cosmic' && `Отставание КТП (${ktpLagCount} у.)`}
                          {reportStyle === 'classic' && `Отставание КТП (${ktpLagCount} зан.)`}
                          {reportStyle === 'patsan' && `Отставание КТП (${ktpLagCount} зан.)`}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[9px] font-bold uppercase tracking-wider rounded-xl ${
                          reportStyle === 'cosmic'
                            ? 'bg-[#C3B4FC]/10 text-[#C3B4FC] border-[#C3B4FC]/20'
                            : reportStyle === 'classic'
                              ? 'bg-stone-50 text-stone-600 border-stone-200/50 font-sans'
                              : 'bg-slate-950 text-blue-450 border-blue-900/30 font-sans'
                        }`}>
                          <CheckCircle className="w-3 h-3 text-blue-400" strokeWidth={1.2} />
                          {reportStyle === 'cosmic' && "Идет ровно по КТП"}
                          {reportStyle === 'classic' && "СООТВЕТСТВУЕТ ГРАФИКУ"}
                          {reportStyle === 'patsan' && "Соответствует графику"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
   
            {/* Footnote */}
            <div className={`mt-5 pt-3.5 border-t flex justify-between items-center text-[8px] select-none uppercase tracking-widest font-bold ${
              reportStyle === 'cosmic'
                ? 'border-white/[0.04] text-[#ccd3de]/20'
                : reportStyle === 'classic'
                  ? 'border-stone-200 text-stone-400 font-sans'
                  : 'border-[#2d3748] text-slate-500 font-sans'
            }`}>
              {reportStyle === 'cosmic' && <span>Система аналитики прогресса — Отчет успеваемости</span>}
              {reportStyle === 'classic' && <span>ИНФОРМАЦИОННЫЙ ОТЧЕТ УСПЕВАЕМОСТИ УЧАЩЕГОСЯ — КЛАССИЧЕСКИЙ ДИЗАЙН</span>}
              {reportStyle === 'patsan' && <span>ИНФОРМАЦИОННЫЙ ОТЧЕТ УСПЕВАЕМОСТИ УЧАЩЕГОСЯ — СТАЛЬНОЙ ТЕМНЫЙ ДИЗАЙН</span>}
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
