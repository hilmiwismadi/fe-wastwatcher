import React, { useState } from 'react';
import { Calendar, ChevronDown } from "lucide-react";

interface TimePeriodProps {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  onStartDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateChange: (date: string) => void;
  onEndTimeChange: (time: string) => void;
  onApply: () => void;
}

export const TimePeriod: React.FC<TimePeriodProps> = ({
  startDate,
  startTime,
  endDate,
  endTime,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
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
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-3 gap-2">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1 flex-shrink-0">
            <Calendar className="w-3 h-3 text-blue-600" />
            Time Period
          </h3>
          <button
            onClick={onApply}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-md font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm text-xs xl:flex-shrink-0"
          >
            Apply
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Start */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-blue-800">Start</label>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="xl:col-span-2 w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800 min-w-0"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                className="xl:col-span-1 w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800 min-w-0"
              />
            </div>
          </div>

          {/* End */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-blue-800">End</label>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="xl:col-span-2 w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800 min-w-0"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
                className="xl:col-span-1 w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-blue-800 min-w-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};