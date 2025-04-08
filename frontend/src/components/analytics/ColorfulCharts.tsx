'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Define vibrant colors for charts
const COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#d946ef', // fuchsia
  '#22c55e', // green
  '#f97316'  // orange
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{entry.name}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface ChartProps {
  data: any[];
  categories: string[];
  xAxisKey: string;
  valueFormatter?: (value: number) => string;
}

export function ColorfulAreaChart({ data, categories, xAxisKey }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          {categories.map((category, index) => (
            <linearGradient key={category} id={`color-${category}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.2}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey={xAxisKey} 
          tick={{ fill: '#6b7280' }} 
          tickLine={{ stroke: '#9ca3af' }}
        />
        <YAxis 
          tick={{ fill: '#6b7280' }} 
          tickLine={{ stroke: '#9ca3af' }}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {categories.map((category, index) => (
          <Area
            key={category}
            type="monotone"
            dataKey={category}
            stroke={COLORS[index % COLORS.length]}
            fillOpacity={1}
            fill={`url(#color-${category})`}
            activeDot={{ r: 8 }}
            animationDuration={1000}
            isAnimationActive={true}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ColorfulLineChart({ data, categories, xAxisKey }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey={xAxisKey} 
          tick={{ fill: '#6b7280' }} 
          tickLine={{ stroke: '#9ca3af' }}
        />
        <YAxis 
          tick={{ fill: '#6b7280' }} 
          tickLine={{ stroke: '#9ca3af' }}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {categories.map((category, index) => (
          <Line
            key={category}
            type="monotone"
            dataKey={category}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            activeDot={{ r: 8 }}
            dot={{ r: 4, fill: COLORS[index % COLORS.length] }}
            animationDuration={1000}
            isAnimationActive={true}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ColorfulBarChart({ data, categories, xAxisKey }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey={xAxisKey} 
          tick={{ fill: '#6b7280' }} 
          tickLine={{ stroke: '#9ca3af' }}
        />
        <YAxis 
          tick={{ fill: '#6b7280' }} 
          tickLine={{ stroke: '#9ca3af' }}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {categories.map((category, index) => (
          <Bar
            key={category}
            dataKey={category}
            fill={COLORS[index % COLORS.length]}
            animationDuration={1000}
            isAnimationActive={true}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ColorfulPieChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          animationDuration={1000}
          isAnimationActive={true}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => value.toLocaleString()} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ColorfulVerticalBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fill: '#6b7280' }} />
        <YAxis 
          dataKey="name" 
          type="category" 
          tick={{ fill: '#6b7280' }} 
          width={100}
        />
        <Tooltip formatter={(value) => value.toLocaleString()} />
        <Bar 
          dataKey="value" 
          fill="#06b6d4" 
          animationDuration={1000}
          isAnimationActive={true}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
