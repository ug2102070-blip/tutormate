"use client";

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  strokeColor?: string;
  unit?: string;
}

export function LineChart({
  data,
  height = 180,
  strokeColor = "#10b981",
  unit = "%",
}: LineChartProps) {
  if (!data || data.length === 0) return null;

  const maxValue = 100;
  const padding = 20;
  const chartWidth = 300;
  const chartHeight = height - 40;

  const points = data.map((d, index) => {
    const x = padding + (index * (chartWidth - 2 * padding)) / Math.max(1, data.length - 1);
    const y = chartHeight - (d.value / maxValue) * (chartHeight - padding);
    return { x, y, value: d.value, label: d.label };
  });

  const pathD = points.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ""
  );

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <div className="w-full flex flex-col justify-between" style={{ height }}>
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill="url(#lineGrad)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill="var(--color-surface, #ffffff)"
                stroke={strokeColor}
                strokeWidth="2.5"
                className="transition-transform group-hover:scale-125"
              />
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill="var(--color-text, #0f172a)"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {pt.value}{unit}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* X Labels */}
      <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        {data.map((item, idx) => (
          <span
            key={idx}
            className="text-[10px] sm:text-xs font-semibold"
            style={{ color: "var(--color-text-muted)" }}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
