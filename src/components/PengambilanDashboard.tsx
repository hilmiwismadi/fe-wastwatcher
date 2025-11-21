"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Table as TableIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { TimeRange } from './TimeRangeSelector';
import { ToggleButton } from './ToggleButton';
import { ChartComponent } from './ChartComponent';
import { useApiTrashData } from '../hooks/useApiTrashData';
import { binSlugToIdMapping } from '../data/mockData';
import { getDefaultDateRange, combineDateAndTime, getTimeRangeDate } from '../utils/dateUtils';

// Interface for saved randomizations
interface SavedRandomization {
  id: string;
  title: string;
  timestamp: string;
  data: { time: string; fullTimestamp: string; weight: number; volume: number }[];
}

// Data generation function for Day view (10:00 to 15:00)
// Phase 1 (10:00-11:47): Minimal increment to 1.43g and 17.8%
// Phase 2 (11:47-12:58): Rapid lunch rush increase to 3.28g and 93.2%
const generateDayViewData = () => {
  const data: { time: string; fullTimestamp: string; weight: number; volume: number }[] = [];

  // Start values at 10:00
  const startWeight = 0.77; // grams
  const startVolume = 3; // percent

  // Phase 1 target at 11:47 (107 minutes from 10:00)
  const phase1Weight = 1.43; // grams at 11:47
  const phase1Volume = 17.8; // percent at 11:47

  // Final target at 12:58 (71 minutes from 11:47)
  const endWeight = 3.28; // grams
  const endVolume = 93.2; // percent

  let currentTime = new Date();
  currentTime.setHours(10, 0, 0, 0);

  let currentWeight = startWeight;
  let currentVolume = startVolume;

  // PHASE 1: 10:00 to 11:47 - Very slow increment (107 minutes)
  const phase1EndMinutes = 107; // 11:47 - 10:00 = 107 minutes
  const phase1WeightIncrease = phase1Weight - startWeight; // 0.66 grams
  const phase1VolumeIncrease = phase1Volume - startVolume; // 14.8%
  let elapsedMinutes = 0;

  while (elapsedMinutes < phase1EndMinutes) {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    data.push({
      time: timeStr,
      fullTimestamp: timeStr,
      weight: parseFloat(currentWeight.toFixed(2)),
      volume: parseFloat(currentVolume.toFixed(1))
    });

    // Random interval (3 to 7 minutes for very slow phase)
    const randomInterval = Math.floor(Math.random() * 5) + 3;
    const nextElapsedMinutes = Math.min(elapsedMinutes + randomInterval, phase1EndMinutes);

    // Very minimal increments during Phase 1
    const weightRange = (phase1WeightIncrease / phase1EndMinutes) * randomInterval;
    const volumeRange = (phase1VolumeIncrease / phase1EndMinutes) * randomInterval;

    const weightIncrement = weightRange * (0.7 + Math.random() * 0.6); // ±30% variation
    const volumeIncrement = volumeRange * (0.7 + Math.random() * 0.6);

    currentWeight = Math.min(currentWeight + weightIncrement, phase1Weight);
    currentVolume = Math.min(currentVolume + volumeIncrement, phase1Volume);

    elapsedMinutes = nextElapsedMinutes;
    currentTime.setMinutes(currentTime.getMinutes() + randomInterval);
  }

  // Ensure we have exactly 11:47 with correct values
  if (data[data.length - 1].time !== '11:47') {
    data.push({
      time: '11:47',
      fullTimestamp: '11:47',
      weight: phase1Weight,
      volume: phase1Volume
    });
  } else {
    data[data.length - 1] = {
      time: '11:47',
      fullTimestamp: '11:47',
      weight: phase1Weight,
      volume: phase1Volume
    };
  }

  // Reset for Phase 2
  currentTime.setHours(11, 47, 0, 0);
  currentWeight = phase1Weight;
  currentVolume = phase1Volume;

  // PHASE 2: 11:47 to 12:58 - LUNCH RUSH - Very rapid increase (71 minutes)
  // Special handling: sensor shake at 12:04 (72.2% volume), returns to normal at 12:10 (42.5%)
  const phase2EndMinutes = 71; // 12:58 - 11:47 = 71 minutes
  const phase2WeightIncrease = endWeight - phase1Weight; // 1.85 grams
  const phase2VolumeIncrease = endVolume - phase1Volume; // 75.4%

  // Key points for anomaly handling
  const shakeTime = 17; // 12:04 - 11:47 = 17 minutes
  const normalResumeTime = 23; // 12:10 - 11:47 = 23 minutes
  const shakeVolume = 72.2; // Anomaly spike
  const resumeVolume = 42.5; // Normal value at 12:10

  // Calculate what the weight should be at 12:04 and 12:10 (weight not affected by shake)
  const weightAt1204 = phase1Weight + (phase2WeightIncrease * (shakeTime / phase2EndMinutes));
  const weightAt1210 = phase1Weight + (phase2WeightIncrease * (normalResumeTime / phase2EndMinutes));

  elapsedMinutes = 0;

  while (elapsedMinutes < phase2EndMinutes) {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Don't add duplicate 11:47
    if (timeStr !== '11:47') {
      // Check for special anomaly times
      if (timeStr === '12:04') {
        // Sensor shake! Volume spikes to 72.2%
        data.push({
          time: timeStr,
          fullTimestamp: timeStr,
          weight: parseFloat(weightAt1204.toFixed(2)),
          volume: shakeVolume
        });
        currentWeight = weightAt1204;
        currentVolume = shakeVolume;
      } else if (timeStr === '12:10') {
        // Normal reading resumes at 42.5%
        data.push({
          time: timeStr,
          fullTimestamp: timeStr,
          weight: parseFloat(weightAt1210.toFixed(2)),
          volume: resumeVolume
        });
        currentWeight = weightAt1210;
        currentVolume = resumeVolume;
      } else {
        // Normal data point
        data.push({
          time: timeStr,
          fullTimestamp: timeStr,
          weight: parseFloat(currentWeight.toFixed(2)),
          volume: parseFloat(currentVolume.toFixed(1))
        });
      }
    }

    // Random interval (1 to 3 minutes for very fast lunch rush phase)
    const randomInterval = Math.floor(Math.random() * 3) + 1;
    const nextElapsedMinutes = Math.min(elapsedMinutes + randomInterval, phase2EndMinutes);

    // Skip normal increment calculation if we just set a special value
    if (currentTime.getHours() === 12 && currentTime.getMinutes() === 4) {
      // Just moved past 12:04 shake, don't increment normally
      elapsedMinutes = nextElapsedMinutes;
      currentTime.setMinutes(currentTime.getMinutes() + randomInterval);
      continue;
    } else if (currentTime.getHours() === 12 && currentTime.getMinutes() === 10) {
      // Just moved past 12:10 resume point, continue normally from here
      elapsedMinutes = nextElapsedMinutes;
      currentTime.setMinutes(currentTime.getMinutes() + randomInterval);
      continue;
    }

    // Much larger increments during Phase 2 (lunch rush!)
    const weightRange = (phase2WeightIncrease / phase2EndMinutes) * randomInterval;
    const volumeRange = (phase2VolumeIncrease / phase2EndMinutes) * randomInterval;

    const weightIncrement = weightRange * (0.95 + Math.random() * 0.1); // ±5% variation for consistency
    const volumeIncrement = volumeRange * (0.95 + Math.random() * 0.1);

    currentWeight = Math.min(currentWeight + weightIncrement, endWeight);
    currentVolume = Math.min(currentVolume + volumeIncrement, endVolume);

    elapsedMinutes = nextElapsedMinutes;
    currentTime.setMinutes(currentTime.getMinutes() + randomInterval);
  }

  // Add data point at exactly 12:58 with exact target values
  if (data[data.length - 1].time !== '12:58') {
    data.push({
      time: '12:58',
      fullTimestamp: '12:58',
      weight: endWeight,
      volume: endVolume
    });
  } else {
    data[data.length - 1] = {
      time: '12:58',
      fullTimestamp: '12:58',
      weight: endWeight,
      volume: endVolume
    };
  }

  // Continue with sparse data from 13:00 to 15:00 (stable values)
  currentTime = new Date();
  currentTime.setHours(13, 0, 0, 0);

  while (currentTime.getHours() < 15 || (currentTime.getHours() === 15 && currentTime.getMinutes() === 0)) {
    currentTime.setMinutes(currentTime.getMinutes() + 30); // Every 30 minutes

    if (currentTime.getHours() <= 15) {
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes();
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      // Small random variations after 12:58
      const weightVariation = (Math.random() - 0.5) * 0.05;
      const volumeVariation = (Math.random() - 0.5) * 0.3;

      data.push({
        time: timeStr,
        fullTimestamp: timeStr,
        weight: parseFloat(Math.max(endWeight + weightVariation, endWeight).toFixed(2)),
        volume: parseFloat(Math.max(endVolume + volumeVariation, endVolume).toFixed(1))
      });
    }
  }

  return data;
};

const PengambilanDashboard: React.FC = () => {
  const router = useRouter();

  // Track if component is mounted to prevent hydration issues
  const [isMounted, setIsMounted] = useState(false);

  // Use kantinlt1 as default bin for demonstration
  const binSlug = 'kantinlt1';
  const trashbinid = binSlugToIdMapping[binSlug.toLowerCase()];

  // State for saved randomizations
  const [savedRandomizations, setSavedRandomizations] = useState<SavedRandomization[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');

  // Memoize the current generated data so it doesn't regenerate on every render
  const [currentDataKey, setCurrentDataKey] = useState(0);
  const currentGeneratedData = useMemo(() => generateDayViewData(), [currentDataKey]);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize with default date range
  const defaultRange = getDefaultDateRange();

  // State management
  const [timeRange, setTimeRange] = useState<TimeRange>('hourly'); // Default to Day view
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

  // Get current values for Day view
  const getCurrentValues = () => {
    if (timeRange === 'hourly') {
      const latestData = currentGeneratedData[currentGeneratedData.length - 1];
      return {
        weight: latestData.weight.toFixed(2),
        volume: latestData.volume.toFixed(1)
      };
    }
    return currentSpecific.anorganic;
  };

  // Get Anorganic chart data
  const getAnorganicChartData = () => {
    // Use generated data for Day view (hourly timeRange)
    if (timeRange === 'hourly') {
      return currentGeneratedData.map((item) => ({
        time: item.time,
        fullTimestamp: item.fullTimestamp,
        value: anorganicToggle === "weight" ? item.weight : item.volume
      }));
    }

    // Use API data for other time ranges
    if (!anorganicAnalytics?.length) return [];

    return anorganicAnalytics.map((item: any) => {
      const timestamp = item.time_interval || item.analysis_date;
      const date = new Date(timestamp);

      let fullTimestamp;
      if (timeRange === 'fiveMinute' && item.wib_time_display) {
        fullTimestamp = item.wib_time_display;
      } else if (timeRange === 'fiveMinute') {
        fullTimestamp = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
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

  // Handler to save current randomization
  const handleSaveRandomization = () => {
    setSaveDialogOpen(true);
  };

  // Handler to confirm save with title
  const handleConfirmSave = () => {
    if (!saveTitle.trim()) {
      alert('Please enter a title for this randomization');
      return;
    }

    const newRandomization: SavedRandomization = {
      id: Date.now().toString(),
      title: saveTitle.trim(),
      timestamp: new Date().toLocaleString(),
      data: [...currentGeneratedData]
    };

    setSavedRandomizations(prev => [...prev, newRandomization]);
    setSaveTitle('');
    setSaveDialogOpen(false);
    alert('Randomization saved successfully!');
  };

  // Handler to generate new randomization
  const handleNewRandomization = () => {
    setCurrentDataKey(prev => prev + 1);
  };

  // Handler to delete saved randomization
  const handleDeleteRandomization = (id: string) => {
    if (confirm('Are you sure you want to delete this randomization?')) {
      setSavedRandomizations(prev => prev.filter(r => r.id !== id));
    }
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
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewRandomization}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
                New Random
              </button>
              <button
                onClick={handleSaveRandomization}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Data
              </button>
              <button
                onClick={() => setShowTable(!showTable)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-sm"
              >
                <TableIcon className="w-4 h-4" />
                {showTable ? 'Hide' : 'Show'} Table ({savedRandomizations.length})
              </button>
            </div>
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
              size="normal"
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
                <p className="text-2xl font-bold text-yellow-600">{getCurrentValues().weight}</p>
                <p className="text-sm text-gray-600">grams</p>
              </div>
              <div className="text-center bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-gray-800 mb-2">Volume</p>
                <p className="text-2xl font-bold text-yellow-600">{getCurrentValues().volume}%</p>
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

        {/* Saved Randomizations Table */}
        {showTable && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Saved Randomizations</h3>
            {savedRandomizations.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No saved randomizations yet. Click "Save Data" to save the current data.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="text-left p-3 font-semibold text-gray-700">Title</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Timestamp</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Data Points</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Final Weight</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Final Volume</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedRandomizations.map((randomization, index) => {
                      const lastData = randomization.data[randomization.data.length - 1];
                      return (
                        <tr key={randomization.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                          <td className="p-3 font-medium text-gray-800">{randomization.title}</td>
                          <td className="p-3 text-gray-600 text-sm">{randomization.timestamp}</td>
                          <td className="p-3 text-center text-gray-700">{randomization.data.length} points</td>
                          <td className="p-3 text-center font-semibold text-green-600">{lastData.weight.toFixed(2)}g</td>
                          <td className="p-3 text-center font-semibold text-blue-600">{lastData.volume.toFixed(1)}%</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteRandomization(randomization.id)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Save Dialog Modal */}
        {saveDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Save Randomization</h3>
              <p className="text-gray-600 mb-4">Enter a title for this randomization:</p>
              <input
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="e.g., Morning Session - Nov 19"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmSave();
                  }
                }}
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setSaveDialogOpen(false);
                    setSaveTitle('');
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PengambilanDashboard;
