"use client";

import React from 'react';

export type TimeRange = 'hourly' | 'daily' | 'weekly';

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  className?: string;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
  className = ""
}) => {
  const timeRanges: { value: TimeRange; label: string; description: string }[] = [
    { value: 'hourly', label: 'Day', description: 'Hourly data (00:00-23:00)' },
    { value: 'daily', label: 'Week', description: '7 days of data' },
    { value: 'weekly', label: 'Month', description: '30 days of data' }
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {timeRanges.map((range) => (
        <button
          key={range.value}
          onClick={() => onRangeChange(range.value)}
          className={`
            px-2 py-1 rounded text-xs font-medium transition-all duration-200
            flex items-center justify-center min-w-[60px] h-8
            ${selectedRange === range.value
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
            }
          `}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};