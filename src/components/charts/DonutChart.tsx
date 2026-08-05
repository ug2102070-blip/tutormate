"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerText?: string;
  centerSubtext?: string;
}

export function DonutChart({
  data,
  size = 140,
  centerText,
  centerSubtext,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400">
        No distribution data available yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center w-full">
      {/* SVG Donut */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--color-surface, #ffffff)', 
                borderRadius: '12px',
                border: '1px solid var(--color-border, #e2e8f0)',
                boxShadow: 'var(--shadow-card, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06))',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text, #0f172a)'
              }}
              itemStyle={{ fontWeight: 700 }}
              formatter={(value: any, name: any, props: any) => {
                const percent = Math.round((Number(value) / total) * 100);
                return [`${value} (${percent}%)`, name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>
            {centerText ?? total}
          </span>
          {centerSubtext && (
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              {centerSubtext}
            </span>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-2 shrink-0">
        {data.map((item, idx) => {
          if (item.value === 0) return null;
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={idx} className="flex items-center gap-2.5 text-xs font-semibold">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{ background: item.color }}
              />
              <span style={{ color: "var(--color-text-secondary)" }}>{item.label}:</span>
              <span className="font-bold ml-auto" style={{ color: "var(--color-text)" }}>
                {item.value} <span className="text-slate-400 font-medium">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
