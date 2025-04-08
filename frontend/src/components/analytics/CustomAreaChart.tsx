'use client';

import React, { useState } from 'react';
import { AreaChart, BarChart, LineChart, Color } from '@tremor/react';
import { Card } from '@/components/ui/card';

// Define vibrant colors for the charts with explicit hex values
const CHART_COLORS = [
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

interface CustomChartProps {
  data: any[];
  categories: string[];
  index: string;
  colors?: string[];
  valueFormatter: (value: number) => string;
  chartType: 'area' | 'line' | 'bar';
}

export function CustomAreaChart({
  data,
  categories,
  index,
  colors = CHART_COLORS,
  valueFormatter,
  chartType
}: CustomChartProps) {
  const [hoveredValue, setHoveredValue] = useState<any>(null);

  // Custom tooltip handler
  const handleValueChange = (v: any) => {
    setHoveredValue(v);
  };

  return (
    <div className="relative">
      {/* Main Chart */}
      <div className="w-full h-[350px]">
        {chartType === 'area' && (
          <AreaChart
            data={data}
            index={index}
            categories={categories}
            colors={colors}
            valueFormatter={valueFormatter}
            showLegend={true}
            showGridLines={true}
            showAnimation={true}
            curveType="monotone"
            animationDuration={1000}
            onValueChange={handleValueChange}
            className="h-[350px]"
            yAxisWidth={50}
            showYAxis={true}
            showTooltip={false}
          />
        )}
        
        {chartType === 'line' && (
          <LineChart
            data={data}
            index={index}
            categories={categories}
            colors={colors}
            valueFormatter={valueFormatter}
            showLegend={true}
            showGridLines={true}
            showAnimation={true}
            curveType="monotone"
            animationDuration={1000}
            onValueChange={handleValueChange}
            className="h-[350px]"
            yAxisWidth={50}
            showYAxis={true}
            showTooltip={false}
          />
        )}
        
        {chartType === 'bar' && (
          <BarChart
            data={data}
            index={index}
            categories={categories}
            colors={colors}
            valueFormatter={valueFormatter}
            showLegend={true}
            showGridLines={true}
            showAnimation={true}
            animationDuration={1000}
            onValueChange={handleValueChange}
            className="h-[350px]"
            yAxisWidth={50}
            showYAxis={true}
            showTooltip={false}
          />
        )}
      </div>
      
      {/* Custom Tooltip */}
      {hoveredValue && (
        <div 
          className="absolute pointer-events-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg p-3 z-50"
          style={{ 
            left: hoveredValue.eventX < window.innerWidth / 2 ? hoveredValue.eventX + 10 : hoveredValue.eventX - 200,
            top: hoveredValue.eventY < 200 ? hoveredValue.eventY + 10 : hoveredValue.eventY - 150,
            minWidth: '180px',
            maxWidth: '250px'
          }}
        >
          <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            {hoveredValue.formattedValue && hoveredValue.formattedValue.length > 0 
              ? hoveredValue.formattedValue[0].split(':')[0] 
              : hoveredValue.axisValue}
          </div>
          
          <div className="space-y-1.5">
            {categories.map((category, idx) => {
              // Find the value for this category
              const value = hoveredValue.payload && hoveredValue.payload[category];
              if (value === undefined) return null;
              
              return (
                <div key={category} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: colors[idx % colors.length] }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {valueFormatter(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
