import React, { useState, useEffect } from 'react';
import { Droplet, Plus, Minus, RotateCcw, Sparkles } from 'lucide-react';

export const WaterTracker: React.FC = () => {
  const [ml, setMl] = useState<number>(() => {
    const saved = localStorage.getItem('water_ml');
    if (saved) return Number(saved);
    return 0;
  });

  const target = 2000; // 2 Liters target
  const percentage = Math.min(100, Math.round((ml / target) * 100));

  useEffect(() => {
    localStorage.setItem('water_ml', ml.toString());
  }, [ml]);

  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('water_ml');
      if (saved) {
        setMl(Number(saved));
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('app_cloud_synced', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('app_cloud_synced', handleSync);
    };
  }, []);

  const addWater = (amount: number) => {
    setMl(prev => Math.max(0, prev + amount));
  };

  const resetWater = () => {
    if (window.confirm('Сбросить прогресс воды на сегодня?')) {
      setMl(0);
    }
  };

  // Dynamic Mascot Face Expressions based on hydration level
  const getMascotEyesAndFace = () => {
    if (ml === 0) {
      return {
        // Sleepy eyes: closed lines
        eyes: (
          <g>
            <path d="M 30,42 Q 38,47 42,42" stroke="#E5E7EB" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.8" />
            <path d="M 58,42 Q 66,47 70,42" stroke="#E5E7EB" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.8" />
          </g>
        ),
        face: (
          <g>
            <path d="M 46,56 Q 50,50 54,56" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
            <circle cx="50" cy="64" r="3.5" fill="#F4B5CD" opacity="0.6" />
          </g>
        )
      };
    }
    if (percentage < 30) {
      return {
        // Curiously open wide eyes
        eyes: (
          <g>
            <circle cx="36" cy="42" r="5" fill="#F4B5CD" />
            <circle cx="38" cy="40" r="1.5" fill="white" />
            <circle cx="64" cy="42" r="5" fill="#F4B5CD" />
            <circle cx="66" cy="40" r="1.5" fill="white" />
          </g>
        ),
        face: (
          <path d="M 45,55 Q 50,60 55,55" stroke="#F4B5CD" strokeWidth="3" strokeLinecap="round" fill="none" />
        )
      };
    }
    if (percentage < 65) {
      return {
        // Happy squinting eyes
        eyes: (
          <g>
            <path d="M 30,44 L 40,38 L 30,34" stroke="#F4B5CD" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M 70,44 L 60,38 L 70,34" stroke="#F4B5CD" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        ),
        face: (
          <path d="M 44,53 Q 50,62 56,53" stroke="#F4B5CD" strokeWidth="3" strokeLinecap="round" fill="none" />
        )
      };
    }
    if (percentage < 100) {
      return {
        // Star eyes (represented elegantly with crossed lines/polygons)
        eyes: (
          <g>
            {/* Left Star */}
            <path d="M 35,32 L 37,38 L 43,38 L 38,41 L 40,47 L 35,43 L 30,47 L 32,41 L 27,38 L 33,38 Z" fill="#FBBF24" />
            {/* Right Star */}
            <path d="M 65,32 L 67,38 L 73,38 L 68,41 L 70,47 L 65,43 L 60,47 L 62,41 L 57,38 L 63,38 Z" fill="#FBBF24" />
          </g>
        ),
        face: (
          <g>
            <path d="M 42,52 Q 50,64 58,52" stroke="#F4B5CD" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Cute happy tongue */}
            <path d="M 47,56 Q 50,61 53,56 Z" fill="#F4B5CD" />
          </g>
        )
      };
    }
    // 100% or more - Cool sunglasses dragon!
    return {
      // Cool retro sunglasses
      eyes: (
        <g>
          {/* Black glasses frame */}
          <rect x="22" y="35" width="24" height="11" rx="2" fill="#11131a" stroke="#FBBF24" strokeWidth="1.5" />
          <rect x="54" y="35" width="24" height="11" rx="2" fill="#11131a" stroke="#FBBF24" strokeWidth="1.5" />
          <line x1="46" y1="40" x2="54" y2="40" stroke="#FBBF24" strokeWidth="2.5" />
          {/* Cool shine reflections on glasses */}
          <line x1="26" y1="38" x2="31" y2="43" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="58" y1="38" x2="63" y2="43" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ),
      face: (
        <path d="M 45,54 Q 53,54 55,52" stroke="#F4B5CD" strokeWidth="3" strokeLinecap="round" fill="none" />
      )
    };
  };

  const mascot = getMascotEyesAndFace();

  return (
    <div className="bg-[#12131a]/95 border border-white/5 rounded-2xl p-2.5 flex flex-col gap-1.5 relative overflow-hidden shadow-lg select-none max-w-full">
      {/* Tiny spark animation for 100% */}
      {percentage >= 100 && (
        <div className="absolute top-1 right-2 pointer-events-none opacity-50 animate-pulse">
          <Sparkles className="w-2.5 h-2.5 text-[#FBBF24]" />
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1">
          <Droplet className="w-3 h-3 text-[#F4B5CD]" />
          <span className="text-[9px] font-sans uppercase text-white/40 tracking-wider font-extrabold">
            Вода
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono font-bold text-white/90">
            {ml}/{target} мл
          </span>
          <button 
            onClick={resetWater}
            title="Сбросить"
            className="p-0.5 hover:bg-white/5 rounded text-white/20 hover:text-[#F4B5CD] transition cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Extremely compact layout: dragon SVG and visual tracker aligned in a row */}
      <div className="flex items-center gap-2">
        {/* Dragon Custom Mascot SVG */}
        <div className="w-8 h-8 shrink-0 bg-white/[0.02] rounded-lg border border-white/5 flex items-center justify-center p-0.5 relative">
          <svg viewBox="0 0 100 100" className="w-7 h-7 select-none">
            <defs>
              <linearGradient id="dragonPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F4B5CD" />
                <stop offset="60%" stopColor="#de7199" />
                <stop offset="100%" stopColor="#832d4e" />
              </linearGradient>
            </defs>

            {/* Dragon horns */}
            <path d="M 25,25 L 14,8 L 32,18 Z" fill="#C3B4FC" opacity="0.9" />
            <path d="M 75,25 L 86,8 L 68,18 Z" fill="#C3B4FC" opacity="0.9" />

            {/* Droplet Head Body */}
            <path d="M 50,15 C 20,40 20,85 50,85 C 80,85 80,40 50,15 Z" fill="url(#dragonPinkGrad)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

            {/* Dragon Wings */}
            <path d="M 22,50 C 4,52 6,68 20,62 Z" fill="#C3B4FC" opacity="0.4" />
            <path d="M 78,50 C 96,52 94,68 80,62 Z" fill="#C3B4FC" opacity="0.4" />

            {/* Cute Rosy cheeks */}
            <circle cx="28" cy="54" r="5" fill="#de7199" opacity="0.6" />
            <circle cx="72" cy="54" r="5" fill="#de7199" opacity="0.6" />

            {/* State Dynamic facial expressions */}
            {mascot.eyes}
            {mascot.face}
          </svg>
        </div>

        {/* Minimal Progress Bar & Buttons Side-by-side */}
        <div className="flex-1 flex flex-col gap-1">
          {/* Slim Progress Line */}
          <div className="relative h-1.5 bg-white/5 rounded-full border border-white/5 overflow-hidden">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#de7199] to-[#F4B5CD] rounded-full transition-all duration-500 ease-out shadow-[0_0_6px_rgba(244,181,205,0.3)]"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Quick Buttons Row */}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => addWater(250)}
              className="h-6 bg-[#F4B5CD]/5 hover:bg-[#F4B5CD]/12 active:scale-95 border border-[#F4B5CD]/10 text-[#F4B5CD] rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer text-[8px] font-mono font-bold"
            >
              +250мл
            </button>

            <button
              type="button"
              onClick={() => addWater(300)}
              className="h-6 bg-[#C3B4FC]/5 hover:bg-[#C3B4FC]/12 active:scale-95 border border-[#C3B4FC]/10 text-[#C3B4FC] rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer text-[8px] font-mono font-bold"
            >
              +300мл
            </button>

            <button
              type="button"
              onClick={() => addWater(-250)}
              className="h-6 bg-white/[0.01] hover:bg-white/[0.04] active:scale-95 border border-white/5 text-white/30 hover:text-white/60 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer text-[8px] font-sans font-semibold"
            >
              -250мл
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
