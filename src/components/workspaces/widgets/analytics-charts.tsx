"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Helper Skeleton Component
export function ChartSkeleton() {
  return (
    <div className="flex h-[240px] w-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="flex items-end space-x-2 h-[150px]">
        <div className="h-[20%] w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-[60%] w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-[40%] w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-[80%] w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-[50%] w-full rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

// Helper Empty State Component
export function ChartEmptyState({ message = "No data available for this range." }: { message?: string }) {
  return (
    <div className="flex h-[240px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try selecting a different date range or category.</p>
    </div>
  );
}

// 1. AreaTrendChart
export interface AreaTrendChartProps {
  data: Array<{ label: string; value: number }>;
  title?: string;
  loading?: boolean;
}

export function AreaTrendChart({ data, title = "Trend", loading = false }: AreaTrendChartProps) {
  if (loading) return <ChartSkeleton />;
  if (!data || data.length === 0) return <ChartEmptyState />;

  return (
    <div className="flex flex-col h-full w-full" role="img" aria-label={`Area line chart showing ${title}`}>
      <span className="sr-only">
        {title} Data Table:
        <table>
          <thead>
            <tr>
              <th>Date/Label</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx}>
                <td>{item.label}</td>
                <td>{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </span>

      <div className="flex-1 w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--background, #ffffff)",
                borderColor: "var(--border, #e2e8f0)",
                borderRadius: "6px",
                fontSize: "12px"
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="rgb(59, 130, 246)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 2. ComparativeBarChart
export interface ComparativeBarChartProps {
  data: Array<{ category: string; value: number }>;
  title?: string;
  loading?: boolean;
}

export function ComparativeBarChart({ data, title = "Comparison", loading = false }: ComparativeBarChartProps) {
  if (loading) return <ChartSkeleton />;
  if (!data || data.length === 0) return <ChartEmptyState />;

  return (
    <div className="flex flex-col h-full w-full" role="img" aria-label={`Bar chart showing ${title}`}>
      <span className="sr-only">
        {title} Data Table:
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx}>
                <td>{item.category}</td>
                <td>{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </span>

      <div className="flex-1 w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
            <XAxis
              dataKey="category"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--background, #ffffff)",
                borderColor: "var(--border, #e2e8f0)",
                borderRadius: "6px",
                fontSize: "12px"
              }}
            />
            <Bar dataKey="value" fill="rgb(59, 130, 246)" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "rgb(59, 130, 246)" : "rgb(99, 102, 241)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 3. PerformanceRadarChart
export interface PerformanceRadarChartProps {
  data: Array<{ subject: string; score: number }>;
  title?: string;
  loading?: boolean;
}

export function PerformanceRadarChart({ data, title = "Radar", loading = false }: PerformanceRadarChartProps) {
  if (loading) return <ChartSkeleton />;
  if (!data || data.length === 0) return <ChartEmptyState />;

  return (
    <div className="flex flex-col h-full w-full" role="img" aria-label={`Radar chart showing ${title}`}>
      <span className="sr-only">
        {title} Data Table:
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx}>
                <td>{item.subject}</td>
                <td>{item.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </span>

      <div className="flex-1 w-full h-[240px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="var(--border, #e2e8f0)" />
            <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={10} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" fontSize={8} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="rgb(59, 130, 246)"
              fill="rgb(59, 130, 246)"
              fillOpacity={0.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 4. MetricGauge
export interface MetricGaugeProps {
  value: number; // 0 - 100
  title?: string;
  loading?: boolean;
}

export function MetricGauge({ value, title = "Percentage", loading = false }: MetricGaugeProps) {
  if (loading) return <ChartSkeleton />;

  const data = [
    { name: "value", value: value },
    { name: "remaining", value: 100 - value }
  ];

  const COLORS = ["rgb(59, 130, 246)", "#e2e8f0"];

  return (
    <div className="flex flex-col h-full w-full items-center justify-center" role="img" aria-label={`Gauge showing ${title} is ${value}%`}>
      <span className="sr-only">{title}: {value}%</span>

      <div className="relative w-full h-[180px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={85}
              paddingAngle={0}
              dataKey="value"
            >
              <Cell fill={COLORS[0]} />
              <Cell fill="var(--border, #e2e8f0)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-[60%] flex flex-col items-center">
          <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}%</span>
          <span className="text-xs text-slate-500 mt-0.5">{title}</span>
        </div>
      </div>
    </div>
  );
}
