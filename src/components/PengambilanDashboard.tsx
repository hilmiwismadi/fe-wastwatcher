"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { TimeRange } from './TimeRangeSelector';
import { ToggleButton } from './ToggleButton';
import { ChartComponent } from './ChartComponent';
import { useApiTrashData } from '../hooks/useApiTrashData';
import { binSlugToIdMapping } from '../data/mockData';
import { getDefaultDateRange, combineDateAndTime, getTimeRangeDate } from '../utils/dateUtils';

const PengambilanDashboard: React.FC = () => {
  const router = useRouter();

  // Track if component is mounted to prevent hydration issues
  const [isMounted, setIsMounted] = useState(false);

  // Use kantinlt1 as default bin for demonstration
  const binSlug = 'kantinlt1';
  const trashbinid = binSlugToIdMapping[binSlug.toLowerCase()];

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize with default date range
  const defaultRange = getDefaultDateRange();

  // State management
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [hourlyOffset, setHourlyOffset] = useState(0);

  // UI State (what user sees in the form)
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [startTime, setStartTime] = useState(defaultRange.startTime);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [endTime, setEndTime] = useState(defaultRange.endTime);

  // Applied State (what actually gets sent to API)
  const [appliedStartDate, setAppliedStartDate] = useState(defaultRange.startDate);
  const [appliedStartTime, setAppliedStartTime] = useState(defaultRange.startTime);
  const [appliedEndDate, setAppliedEndDate] = useState(defaultRange.endDate);
  const [appliedEndTime, setAppliedEndTime] = useState(defaultRange.endTime);

  // Helper function to calculate time range
  const getChartTimeRange = () => {
    if (timeRange !== 'fiveMinute') {
      // For non-hourly views, all charts use the same range
      return {
        startDate: combineDateAndTime(appliedStartDate, appliedStartTime),
        endDate: combineDateAndTime(appliedEndDate, appliedEndTime)
      };
    }

    // For hourly view, calculate based on offset
    const offset = hourlyOffset;
    const baseRange = getTimeRangeDate('fiveMinute');

    const newDateTime = new Date(baseRange.startDate);
    newDateTime.setHours(newDateTime.getHours() + offset, 0, 0, 0);

    const newEndDateTime = new Date(newDateTime);
    newEndDateTime.setMinutes(59, 59, 999);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formatTime = (date: Date) => {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    return {
      startDate: `${formatDate(newDateTime)} ${formatTime(newDateTime)}:00`,
      endDate: `${formatDate(newEndDateTime)} ${formatTime(newEndDateTime)}:59`
    };
  };

  // Create API date range parameters
  const chartRange = getChartTimeRange();
  const apiStartDate = chartRange.startDate;
  const apiEndDate = chartRange.endDate;

  // Fetch data using custom hook
  const {
    loading,
    error,
    anorganicToggle,
    setAnorganicToggle,
    anorganicAnalytics,
    currentSpecific
  } = useApiTrashData(apiStartDate, apiEndDate, timeRange, trashbinid);

  // Get Anorganic chart data
  const getAnorganicChartData = () => {
    if (!anorganicAnalytics?.length) return [];

    return anorganicAnalytics.map((item: any) => {
      const timestamp = item.time_interval || item.analysis_date;
      const date = new Date(timestamp);

      let fullTimestamp;
      if (timeRange === 'fiveMinute' && item.wib_time_display) {
        fullTimestamp = item.wib_time_display;
      } else if (timeRange === 'fiveMinute') {
        fullTimestamp = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
      } else if (timeRange === 'hourly') {
        const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
        fullTimestamp = `${String(wibDate.getUTCHours()).padStart(2, '0')}:${String(wibDate.getUTCMinutes()).padStart(2, '0')}`;
      } else {
        fullTimestamp = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      const formatTimestamp = (item: Record<string, unknown>): string => {
        const timestamp = (item.time_interval || item.analysis_date) as string;
        if (!timestamp) return '';
        const date = new Date(timestamp);

        if (timeRange === 'fiveMinute') {
          if (item.wib_time_display) {
            return item.wib_time_display as string;
          }
          const minutes = date.getUTCMinutes();
          const hours = date.getUTCHours();
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        } else if (timeRange === 'hourly') {
          const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
          return wibDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC'
          });
        } else if (timeRange === 'daily') {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      };

      return {
        time: formatTimestamp(item),
        fullTimestamp,
        value: anorganicToggle === "weight" ? item.avg_weight : item.avg_volume
      };
    });
  };

  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
    setHourlyOffset(0);
    const newRange = getTimeRangeDate(newTimeRange);

    // Update UI state with new range
    setStartDate(newRange.startDate);
    setStartTime(newRange.startTime);
    setEndDate(newRange.endDate);
    setEndTime(newRange.endTime);

    // Auto-apply the new range
    setAppliedStartDate(newRange.startDate);
    setAppliedStartTime(newRange.startTime);
    setAppliedEndDate(newRange.endDate);
    setAppliedEndTime(newRange.endTime);
  };

  const handlePreviousHour = () => {
    if (timeRange !== 'fiveMinute') return;
    setHourlyOffset(prev => prev - 1);
  };

  const handleNextHour = () => {
    if (timeRange !== 'fiveMinute') return;
    setHourlyOffset(prev => prev + 1);
  };

  const getChartTimeDisplay = () => {
    const range = getChartTimeRange();
    const startTime = range.startDate.split(' ')[1]?.substring(0, 5) || '00:00';
    const endTime = range.endDate.split(' ')[1]?.substring(0, 5) || '00:59';
    return { startTime, endTime };
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Pengambilan - Anorganic Monitoring</h1>
          </div>
        </div>

        {/* Anorganic Chart Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-yellow-600">Anorganic Waste</h3>
              {timeRange === 'fiveMinute' && (
                <span className="text-sm text-gray-600 font-semibold bg-gray-50 px-3 py-1 rounded">
                  {getChartTimeDisplay().startTime} - {getChartTimeDisplay().endTime}
                </span>
              )}
            </div>
            <ToggleButton
              value={anorganicToggle}
              onChange={setAnorganicToggle}
              size="medium"
              colorTheme="yellow"
            />
          </div>

          <div className="space-y-4">
            {/* Chart */}
            <div>
              <ChartComponent
                data={getAnorganicChartData()}
                bgColor="bg-gradient-to-br from-yellow-500 to-yellow-600"
                height={300}
                yAxisDomain={anorganicToggle === "volume" ? [0, 100] : undefined}
                valueUnit={anorganicToggle === "volume" ? "%" : undefined}
                xAxisInterval={timeRange === 'fiveMinute' ? 4 : undefined}
              />

              {timeRange === 'fiveMinute' && (
                <div className="flex justify-center items-center gap-4 mt-4">
                  {/* Left Arrow */}
                  <button
                    onClick={handlePreviousHour}
                    className="bg-white hover:bg-gray-50 shadow-sm rounded-full p-2 transition-all hover:scale-110 border border-gray-200"
                    aria-label="Previous hour"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>

                  {/* Right Arrow */}
                  <button
                    onClick={handleNextHour}
                    className="bg-white hover:bg-gray-50 shadow-sm rounded-full p-2 transition-all hover:scale-110 border border-gray-200"
                    aria-label="Next hour"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            {/* Current Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-gray-800 mb-2">Weight</p>
                <p className="text-2xl font-bold text-yellow-600">{currentSpecific.anorganic.weight}</p>
                <p className="text-sm text-gray-600">grams</p>
              </div>
              <div className="text-center bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-gray-800 mb-2">Volume</p>
                <p className="text-2xl font-bold text-yellow-600">{currentSpecific.anorganic.volume}%</p>
                <p className="text-sm text-gray-600">capacity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Time Range</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleTimeRangeChange('fiveMinute')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'fiveMinute'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hour
            </button>
            <button
              onClick={() => handleTimeRangeChange('hourly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'hourly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => handleTimeRangeChange('daily')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'daily'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => handleTimeRangeChange('weekly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'weekly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PengambilanDashboard;
