"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  strokeColor?: string;
  unit?: string;
}

export function LineChart({
  data,
  height = 200,
  strokeColor = "#10b981",
  unit = "%",
}: LineChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #e2e8f0)" opacity={0.5} />
          <XAxis 
            dataKey="label" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted, #64748b)', fontWeight: 600 }}
            tickFormatter={(value) => `${value}${unit}`}
          />
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
            itemStyle={{ color: strokeColor, fontWeight: 700 }}
            formatter={(value: any) => [`${value}${unit}`, "Attendance"]}
            labelStyle={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '4px' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={strokeColor} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            activeDot={{ r: 6, strokeWidth: 0, fill: strokeColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
