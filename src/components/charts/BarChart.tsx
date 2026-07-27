"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
  unit?: string;
}

export function BarChart({
  data,
  height = 180,
  barColor = "var(--color-primary, #6366f1)",
  unit = "৳",
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full flex flex-col justify-between" style={{ height }}>
      <div className="flex-1 flex items-end gap-2 sm:gap-4 pt-4 px-2 pb-2">
        {data.map((item, idx) => {
          const heightPercent = Math.max(8, Math.round((item.value / maxValue) * 100));

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative"
            >
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 bg-slate-900 text-white text-[10px] rounded font-semibold whitespace-nowrap z-10 pointer-events-none shadow-md">
                {unit}{item.value.toLocaleString()}
              </div>

              {/* Bar container */}
              <div className="w-full max-w-[36px] bg-slate-100 dark:bg-slate-800/60 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                <div
                  className="w-full rounded-t-lg transition-all duration-500 ease-out"
                  style={{
                    height: `${heightPercent}%`,
                    background: barColor,
                    boxShadow: "0 -2px 10px rgba(99, 102, 241, 0.2)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X Axis Labels */}
      <div className="flex items-center gap-2 sm:gap-4 px-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="flex-1 text-center text-[10px] sm:text-xs font-semibold truncate"
            style={{ color: "var(--color-text-muted)" }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
