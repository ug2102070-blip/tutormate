"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
  unit?: string;
}

export function BarChart({
  data,
  height = 200,
  barColor = "#6366f1",
  unit = "৳",
}: BarChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
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
            tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
          />
          <Tooltip 
            cursor={{ fill: 'var(--color-bg-secondary, #f1f5f9)', opacity: 0.4 }}
            contentStyle={{ 
              backgroundColor: 'var(--color-surface, #ffffff)', 
              borderRadius: '12px',
              border: '1px solid var(--color-border, #e2e8f0)',
              boxShadow: 'var(--shadow-card, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06))',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text, #0f172a)'
            }}
            itemStyle={{ color: barColor, fontWeight: 700 }}
            formatter={(value: any) => [`${unit}${value.toLocaleString()}`, "Revenue"]}
            labelStyle={{ color: 'var(--color-text-muted, #64748b)', marginBottom: '4px' }}
          />
          <Bar 
            dataKey="value" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={barColor} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
