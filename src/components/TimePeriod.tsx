import React, { useState } from 'react';
import { Calendar, ChevronDown } from "lucide-react";
import { TimeRangeSelector, TimeRange } from './TimeRangeSelector';

interface TimePeriodProps {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timeRange: TimeRange;
  onStartDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateChange: (date: string) => void;
  onEndTimeChange: (time: string) => void;
  onTimeRangeChange: (range: TimeRange) => void;
  onApply: () => void;
}

export const TimePeriod: React.FC<TimePeriodProps> = ({
  startDate,
  startTime,
  endDate,
  endTime,
  timeRange,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
  onTimeRangeChange,
  onApply,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format date and time for display
  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' ' + dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border relative overflow-hidden">
      {/* Mobile Minimalist View */}
      <div className="block sm:hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-gray-800">Time Period</h3>
              <p className="text-xs text-gray-600 truncate">
                {formatDateTime(startDate, startTime)} - {formatDateTime(endDate, endTime)}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`} />
        </button>
        
        {isExpanded && (
          <div className="p-3 pt-0 space-y-3 border-t">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-blue-800">Quick Range</label>
              <TimeRangeSelector
                selectedRange={timeRange}
                onRangeChange={onTimeRangeChange}
                className="justify-start"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-blue-800">Start</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-blue-800">End</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-2 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800"
                />
              </div>
            </div>

            <button
              onClick={() => {
                onApply();
                setIsExpanded(false);
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-md font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm text-sm"
            >
              Apply Time Period
            </button>
          </div>
        )}
      </div>

      {/* Desktop View with Improved Layout */}
      <div className="hidden sm:block p-3">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-3 gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1 flex-shrink-0">
              <Calendar className="w-3 h-3 text-blue-600" />
              Time Period
            </h3>
            <TimeRangeSelector
              selectedRange={timeRange}
              onRangeChange={onTimeRangeChange}
              className="justify-start"
            />
          </div>
          <button
            onClick={onApply}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-md font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm text-xs flex-shrink-0"
          >
            Apply
          </button>
        </div>

        <div className="space-y-2">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-blue-800">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800"
            />
          </div>

          {/* Start Time */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-blue-800">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-blue-800">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800"
            />
          </div>

          {/* End Time */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-blue-800">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800"
            />
          </div>
        </div>
      </div>
    </div>
  );
};