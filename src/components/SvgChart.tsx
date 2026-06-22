import React, { useState } from 'react';

interface ChartPoint {
  id: string;
  label: string;  // e.g. "Пробный №1" or date
  value: number;  // e.g. 42
  maxScore: number; // e.g. 100
  notes?: string;
}

interface SvgChartProps {
  points: ChartPoint[];
}

export const SvgChart: React.FC<SvgChartProps> = ({ points }) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center border border-dashed border-gray-200 rounded-lg text-gray-400 font-sans text-sm">
        Нет данных для построения графика прогресса
      </div>
    );
  }

  // Chart dimensions & margins
  const width = 600;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  // Compute graph bounds
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  // Score mapping (percentage or actual depending on points. Standardizing 0 - 100 on graph)
  const maxVal = 100;
  const minVal = 0;

  // X coords: Space out points equally
  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft + graphWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * graphWidth;
  };

  // Y coords: Higher values are closer to top (0px is top in SVG)
  const getY = (val: number) => {
    const ratio = val / maxVal;
    return paddingTop + graphHeight * (1 - ratio);
  };

  // Generate SVG coordinates path
  const svgPoints = points.map((p, i) => ({
    x: getX(i),
    y: getY((p.value / p.maxScore) * 100), // convert to standard percentage for uniform graphing
    exactValue: p.value,
    exactMax: p.maxScore,
    name: p.label,
    original: p
  }));

  // Build connection path (Bezier smooth or standard straight lines)
  // Let's build a smooth SVG line path or simple path:
  let linePath = '';
  let areaPath = '';

  if (svgPoints.length > 0) {
    // Generate straight line path
    linePath = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
    for (let i = 1; i < svgPoints.length; i++) {
      linePath += ` L ${svgPoints[i].x} ${svgPoints[i].y}`;
    }

    // Generate closed area path for gradient filling
    areaPath = `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${paddingTop + graphHeight} L ${svgPoints[0].x} ${paddingTop + graphHeight} Z`;
  }

  // Grid levels (0%, 25%, 50%, 75%, 100%)
  const yLevels = [0, 25, 50, 75, 100];

  return (
    <div className="relative bg-gradient-to-br from-[#F4B5CD]/[0.03] via-white/[0.01] to-white/[0.01] backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-serif text-blush-mist text-sm font-semibold">
          Динамика результатов пробников (%)
        </h4>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#F4B5CD] inline-block"></span>
          <span>Относительный балл</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none min-w-[500px]">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F4B5CD" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F4B5CD" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y scale labels */}
          {yLevels.map((level) => {
            const yPos = getY(level);
            return (
              <g key={level} className="opacity-60">
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={width - paddingRight}
                  y2={yPos}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 3}
                  textAnchor="end"
                  className="fill-white/30 font-mono text-[9px]"
                >
                  {level}%
                </text>
              </g>
            );
          })}

          {/* Area under the curve */}
          {svgPoints.length > 0 && (
            <path
              d={areaPath}
              fill="url(#chartGradient)"
            />
          )}

          {/* Core line path */}
          {svgPoints.length > 0 && (
            <path
              d={linePath}
              fill="none"
              stroke="#F4B5CD"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data point markers */}
          {svgPoints.map((pt, idx) => (
            <g key={idx}>
              {/* Highlight background circle on hover */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint === idx ? 11 : 6}
                className="fill-[#F4B5CD]/10 transition-all duration-150 ease-out cursor-pointer"
                onMouseEnter={() => setHoveredPoint(idx)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {/* Foreground circle */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint === idx ? 5 : 3.5}
                className="fill-black stroke-[#F4B5CD] stroke-[1.5] transition-all duration-150 ease-out pointer-events-none"
              />
            </g>
          ))}

          {/* X axis labels (Dates / Titles) */}
          {svgPoints.map((pt, idx) => {
            const labelY = height - paddingBottom + 16;
            const displayLabel = pt.name.length > 15 ? pt.name.slice(0, 13) + '...' : pt.name;
            return (
              <text
                key={idx}
                x={pt.x}
                y={labelY}
                textAnchor="middle"
                className="fill-white/40 font-sans text-[9px] uppercase tracking-wider"
                transform={`rotate(5 ${pt.x} ${labelY})`}
              >
                {displayLabel}
              </text>
            );
          })}
        </svg>

        {/* Tooltip Overlay */}
        {hoveredPoint !== null && (
          <div 
            className="absolute z-10 bg-[#0D0D0D] border border-white/10 rounded-xl p-3 shadow-2xl text-xs font-sans max-w-[220px]"
            style={{
              left: `${Math.min(getX(hoveredPoint) / 6, 80)}%`,
              top: `${Math.max(getY((points[hoveredPoint].value / points[hoveredPoint].maxScore) * 100) - 80, 10)}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="font-serif text-blush-mist truncate font-semibold">{points[hoveredPoint].label}</p>
            <div className="flex justify-between items-center mt-1.5 border-t border-white/5 pt-1.5 gap-4">
              <span className="text-white/40 text-[10px] uppercase">Результат:</span>
              <span className="font-mono font-bold text-white">
                {points[hoveredPoint].value} / {points[hoveredPoint].maxScore}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-white/50">
              <span className="text-white/40 uppercase text-[9px]">Доля верного:</span>
              <span className="font-mono font-bold text-blush-mist">
                {Math.round((points[hoveredPoint].value / points[hoveredPoint].maxScore) * 100)}%
              </span>
            </div>
            {points[hoveredPoint].notes && (
              <p className="mt-1.5 text-[10px] text-white/60 border-t border-white/5 pt-1.5 line-clamp-2 leading-relaxed">
                "{points[hoveredPoint].notes}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
