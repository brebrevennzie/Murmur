import React, { useState, useRef } from 'react';
import { Student, MockExam } from '../types';
import { X, Award, CheckCircle2, Upload, FileText, Sparkles, RefreshCw, Eye } from 'lucide-react';

interface PassMockModalProps {
  student: Student;
  onClose: () => void;
  onSave: (mock: MockExam) => void;
}

export const PassMockModal: React.FC<PassMockModalProps> = ({ student, onClose, onSave }) => {
  const [name, setName] = useState(`Пробный (${student.mockExams.length + 1})`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [gapsString, setGapsString] = useState('');
  const [wrongTasksString, setWrongTasksString] = useState('');
  const [notes, setNotes] = useState('');

  // Screenshot Upload States
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local deterministic parser (No-AI)
  const parseFilenameData = (filename: string) => {
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
    
    let detectedScore = '';
    let detectedMaxScore = '100';
    let detectedWrongTasks: string[] = [];
    let detectedName = '';

    // Match "score / max" e.g. "85/100", "24/32", "24 из 32"
    const slashMatch = nameWithoutExt.match(/(\d+)\s*[\/|изиз]\s*(\d+)/i);
    if (slashMatch) {
      detectedScore = slashMatch[1];
      detectedMaxScore = slashMatch[2];
    } else {
      // Look for score followed by words like "б", "балл", "балла", "баллов"
      const scoreMatch = nameWithoutExt.match(/(\d+)\s*(?:б|балл|балла|баллов|points|pts|marks)\b/i);
      if (scoreMatch) {
        detectedScore = scoreMatch[1];
      } else {
        // Find general numbers in filename
        const allNumbers = nameWithoutExt.match(/\b\d+\b/g);
        if (allNumbers && allNumbers.length > 0) {
          detectedScore = allNumbers[0];
          if (allNumbers.length > 1) {
            detectedMaxScore = allNumbers[1];
          }
        }
      }
    }

    // Look for wrong tasks / mistakes
    // e.g., "ошибки 2, 5, 14" or "ошибки в 2 5 14" or "tasks 2,3,4" or "errors: 2 4"
    const errorSectionMatch = nameWithoutExt.match(/(?:ошибки|ошибка|задания|номера|errors|tasks|wrong|mistakes|errs)\s*([^a-zA-Zа-яА-Я]*)/i);
    if (errorSectionMatch) {
      const numbersText = errorSectionMatch[1];
      const numbers = numbersText.match(/\b\d+\b/g);
      if (numbers) {
        detectedWrongTasks = numbers;
      }
    } else {
      // Fallback: search for numbers after the score if any
      const allNumbers = nameWithoutExt.match(/\b\d+\b/g);
      if (allNumbers && allNumbers.length > 2) {
        detectedWrongTasks = allNumbers.slice(2);
      }
    }

    // Try to parse Variant/Name
    const variantMatch = nameWithoutExt.match(/(вариант\s*\d+|пробник\s*\d+|тест\s*\d+|fipi\s*\d+|огэ\s*\d+|егэ\s*\d+|майский|апрельский|мартовский|демо)/i);
    if (variantMatch) {
      detectedName = variantMatch[1].charAt(0).toUpperCase() + variantMatch[1].slice(1);
    } else {
      detectedName = `Вариант из ${nameWithoutExt.substring(0, 15)}`;
    }

    return {
      score: detectedScore,
      maxScore: detectedMaxScore,
      wrongTasks: detectedWrongTasks,
      name: detectedName
    };
  };

  const handleFileChange = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      
      // Start OCR Simulation
      setIsScanning(true);
      setScanSuccess(false);
      
      setTimeout(() => {
        setIsScanning(false);
        setScanSuccess(true);
        
        // Deterministically parse the filename
        const parsed = parseFilenameData(file.name);
        if (parsed.name) setName(parsed.name);
        if (parsed.score) setScore(parsed.score);
        if (parsed.maxScore) setMaxScore(parsed.maxScore);
        if (parsed.wrongTasks.length > 0) {
          setWrongTasksString(parsed.wrongTasks.join(', '));
          // Auto fill some sample gaps corresponding to the errors
          const sampleGaps = parsed.wrongTasks.map(t => `Задание ${t}`).slice(0, 3);
          setGapsString(sampleGaps.join(', '));
        } else {
          // If no errors parsed in filename, prefill some default text
          setWrongTasksString('');
          setGapsString('');
        }
      }, 1200);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !score || !maxScore) return;

    const mock: MockExam = {
      id: 'mock-' + Date.now(),
      name: name,
      date: date,
      score: Number(score),
      maxScore: Number(maxScore),
      gaps: gapsString.split(',').map(g => g.trim()).filter(Boolean),
      wrongTasks: wrongTasksString.split(',').map(t => t.trim()).filter(Boolean),
      notes: notes || undefined
    };

    onSave(mock);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/95 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#0c0d12]/95 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-scaleUp my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#12131a]/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F4B5CD]/10 border border-[#F4B5CD]/20 flex items-center justify-center text-lg shrink-0">
              📝
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F4B5CD] tracking-widest uppercase">
                Внести пробник: {student.name}
              </h3>
              <p className="text-[10px] text-white/40">Локальный разбор скриншота без ИИ + ручной ввод</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 rounded-lg text-white/40 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Outer Split Layout - PC side-by-side, Mobile column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/5 overflow-y-auto max-h-[calc(100vh-140px)]">
          
          {/* Left Column: Drag & Drop Screen + OCR Detector Visuals */}
          <div className="lg:col-span-5 p-6 space-y-4 bg-black/30">
            <div className="space-y-1">
              <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-white/50">Загрузка скриншота результатов</h4>
              <p className="text-[10px] text-white/30 leading-relaxed">
                Назовите файл, указав балл и ошибки (напр. <code className="text-[#F4B5CD]/85 bg-white/5 px-1 py-0.5 rounded font-mono text-[9px]">Вариант 5 балл 24 ошибки 3 5 12.png</code>) для автозаполнения!
              </p>
            </div>

            {/* Drag Zone */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden group ${
                isDragging 
                  ? 'border-[#F4B5CD] bg-[#F4B5CD]/5' 
                  : imageSrc 
                    ? 'border-white/10 bg-white/[0.01] hover:border-white/20' 
                    : 'border-white/10 hover:border-[#F4B5CD]/35 bg-white/[0.01] hover:bg-[#F4B5CD]/[0.02]'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                accept="image/*"
                className="hidden" 
              />

              {imageSrc ? (
                <div className="w-full relative group">
                  {/* Image Reference Card */}
                  <img 
                    src={imageSrc} 
                    alt="Скриншот пробника" 
                    className="max-h-48 mx-auto object-contain rounded-lg border border-white/10 shadow-lg" 
                  />
                  
                  {/* Scanning Laser Overlay Animation */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-sky-500/10 flex flex-col items-center justify-center backdrop-blur-xs animate-pulse">
                      <div className="absolute left-0 right-0 h-0.5 bg-sky-400 shadow-[0_0_10px_#38bdf8] animate-scan" />
                      <div className="bg-black/80 px-3 py-1.5 rounded-xl border border-sky-500/30 flex items-center gap-2 text-sky-300 text-[10px] font-bold font-mono">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>ЛОКАЛЬНАЯ ОЦИФРОВКА...</span>
                      </div>
                    </div>
                  )}

                  {/* Highlight zones if success */}
                  {scanSuccess && !isScanning && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Highlight Score Box */}
                      <div className="absolute top-1/4 left-1/3 border-2 border-emerald-500/80 bg-emerald-500/10 px-1 py-0.5 rounded text-[8px] font-mono text-emerald-300 font-bold shadow-[0_0_5px_rgba(16,185,129,0.5)]">
                        Detected: {score || '??'} / {maxScore}
                      </div>
                      {/* Highlight Errors Box */}
                      <div className="absolute bottom-1/4 right-1/4 border-2 border-rose-500/80 bg-rose-500/10 px-1 py-0.5 rounded text-[8px] font-mono text-rose-300 font-bold shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                        Errors: {wrongTasksString || 'None'}
                      </div>
                    </div>
                  )}

                  {/* Overlays on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold text-white bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      Выбрать другой скрин
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/5 flex items-center justify-center mx-auto group-hover:border-[#F4B5CD]/30 group-hover:bg-[#F4B5CD]/5 transition">
                    <Upload className="w-5 h-5 text-white/40 group-hover:text-[#F4B5CD]" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-white/70 font-semibold">Перетащите скриншот сюда</p>
                    <p className="text-[10px] text-white/40">или нажмите для выбора файла</p>
                  </div>
                </div>
              )}
            </div>

            {/* Scanner Status Messages */}
            {imageSrc && (
              <div className="bg-[#12131a] border border-white/5 p-3 rounded-xl flex items-start gap-2.5">
                <div className="w-7 h-7 rounded bg-[#F4B5CD]/10 border border-[#F4B5CD]/20 flex items-center justify-center shrink-0 text-sm">
                  ⚡
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono font-bold text-[#F4B5CD] uppercase tracking-wider block">СТАТУС СКАНЕРА ФАЙЛА</span>
                  <p className="text-[10px] text-white/60 leading-relaxed">
                    {isScanning ? (
                      'Распознаем текст имени и размечаем области...'
                    ) : scanSuccess ? (
                      <span>
                        Данные извлечены! <strong className="text-emerald-400">Балл: {score || '0'}</strong>, <strong className="text-rose-400">Ошибки: {wrongTasksString || 'нет'}</strong>. Проверьте и сохраните.
                      </span>
                    ) : (
                      'Снимок загружен. Используйте имя файла для мгновенной оцифровки!'
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Form Fields */}
          <div className="lg:col-span-7 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">
                    Название варианта
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Вариант ФИПИ Май ОГЭ"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">
                    Дата проведения
                  </label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5 font-mono">
                      Балл
                    </label>
                    <input 
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 78"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none font-mono rounded-xl text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5 font-mono">
                      Максимум
                    </label>
                    <input 
                      type="number"
                      required
                      min="1"
                      placeholder="100"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none font-mono rounded-xl text-center"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">
                    Задания с ошибками (через запятую)
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. 3, 5, 12, 14, 18"
                    value={wrongTasksString}
                    onChange={(e) => setWrongTasksString(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">
                    Пробелы / Темы ошибок
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Тригонометрия, Текстовая задача"
                    value={gapsString}
                    onChange={(e) => setGapsString(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-white/45 mb-1.5">
                    Комментарий / Анализ ошибок
                  </label>
                  <textarea 
                    placeholder="Например: Вычислительные ошибки во 2-й части, не хватило времени."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full text-xs px-3.5 py-2.5 border border-white/10 bg-white/5 text-white focus:border-[#F4B5CD] focus:outline-none rounded-xl resize-none"
                  />
                </div>
              </div>

              {/* Footer Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-4 py-2 border border-white/10 text-[10px] tracking-widest uppercase font-bold text-white/60 hover:bg-white/5 transition rounded-xl cursor-pointer"
                >
                  Отменить
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#F4B5CD]/15 hover:bg-[#F4B5CD]/30 border border-[#F4B5CD]/20 text-[#F4B5CD] text-[10px] tracking-widest uppercase font-bold transition rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Сохранить результаты</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
