"use client";

import React, { useState, useRef, useEffect } from "react";
import { AlertCircle, ArrowLeft, Download, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { TimePeriod } from './TimePeriod';
import { TimeRange } from './TimeRangeSelector';
import { ToggleButton } from './ToggleButton';
import { ChartComponent } from './ChartComponent';
import { BarChart } from './BarChart';
import { TouchCarousel } from './TouchCarousel';
import { useApiTrashData } from '../hooks/useApiTrashData';
import { binSlugToIdMapping } from '../data/mockData';
import { getRealTimeDefaultDateRange, combineDateAndTime, getRealTimeRangeDate } from '../utils/dateUtils';
import { apiService, Device } from '../services/api';

// Optimized: Conditional logging for development only
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};
const devWarn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};
const devError = (...args: any[]) => {
  if (isDev) console.error(...args);
};

interface RealDataDashboardProps {
  binSlug?: string; // URL slug for the bin (e.g., "kantinlt1")
}

// STEP 3: Map bin slug to location name for sensor readings
const binSlugToLocationMapping: Record<string, string> = {
  'kantinlt1': 'KantinSGLC',
  'baratlt1': 'all', // Fetch all sensor readings for baratlt1
  // Add more mappings as needed
};

// STEP 3: Define sensor reading interface
interface SensorReading {
  id: number;
  location: string;
  bin_type: string;
  sensor_top_left: string;
  sensor_top_right: string;
  sensor_bottom_left: string;
  sensor_bottom_right: string;
  average_distance: string;
  weight: string;
  timestamp: string;
  created_at: string;
}

// Sensor validation constants
const SENSOR_ERROR_THRESHOLD = 2000; // cm - readings >= 2000 are considered errors
const SENSOR_MIN_VALID = 0; // cm - minimum valid reading
const SENSOR_MAX_VALID = 100; // cm - maximum reasonable reading for 60cm bin

// Helper function to validate sensor readings
const isValidSensorReading = (reading: number): boolean => {
  return !isNaN(reading) &&
         reading >= SENSOR_MIN_VALID &&
         reading < SENSOR_ERROR_THRESHOLD;
};

// Helper function to calculate volume percentage from 4 sensor readings with error handling
const calculateVolumePercentage = (topLeft: number, topRight: number, bottomLeft: number, bottomRight: number): number => {
  const BIN_HEIGHT = 60; // cm
  const readings = [topLeft, topRight, bottomLeft, bottomRight];
  const validReadings = readings.filter(isValidSensorReading);

  // If all sensors are errors, return 0%
  if (validReadings.length === 0) return 0;

  // Calculate average using only valid sensors
  const avgDistance = validReadings.reduce((sum, val) => sum + val, 0) / validReadings.length;
  const fillHeight = BIN_HEIGHT - avgDistance;
  const percentage = (fillHeight / BIN_HEIGHT) * 100;

  return Math.max(0, Math.min(100, percentage));
};

const RealDataDashboard: React.FC<RealDataDashboardProps> = ({ binSlug = 'kantinlt1' }) => {
  const router = useRouter();

  // Track if component is mounted to prevent hydration issues
  const [isMounted, setIsMounted] = useState(false);

  // Get trashbinid from slug for API calls
  const trashbinid = binSlugToIdMapping[binSlug.toLowerCase()];

  // STEP 3: State for sensor readings
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [sensorDataLoading, setSensorDataLoading] = useState(false);
  const [sensorDataOffset, setSensorDataOffset] = useState(0);
  const [hasMoreSensorData, setHasMoreSensorData] = useState(true);

  // State for anorganic sensor readings (separate from organic)
  const [anorganicSensorReadings, setAnorganicSensorReadings] = useState<SensorReading[]>([]);
  const [anorganicSensorDataLoading, setAnorganicSensorDataLoading] = useState(false);
  const [anorganicSensorDataOffset, setAnorganicSensorDataOffset] = useState(0);
  const [hasMoreAnorganicSensorData, setHasMoreAnorganicSensorData] = useState(true);

  // State for bin data (fetched dynamically)
  const [trashBinName, setTrashBinName] = React.useState<string>('Loading...');
  const [batteryPercentage, setBatteryPercentage] = React.useState<number>(0);
  const [condition, setCondition] = React.useState<string>('Loading...');

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch bin and device data on mount
  React.useEffect(() => {
    const fetchBinData = async () => {
      if (!trashbinid) {
        setTrashBinName('Unknown Bin');
        setCondition('Unknown');
        return;
      }

      try {
        // Fetch bin details and devices in parallel
        const [binResponse, devicesResponse] = await Promise.all([
          apiService.getTrashBinById(trashbinid),
          apiService.getDevicesByTrashBinId(trashbinid)
        ]);

        if (binResponse.success && binResponse.data) {
          setTrashBinName(binResponse.data.name);
        }

        if (devicesResponse.success && devicesResponse.data && devicesResponse.data.length > 0) {
          // Calculate average battery from all devices
          const devices = devicesResponse.data;
          const batteriesWithValues = devices
            .map(d => d.battery_percentage)
            .filter((b): b is number => b !== undefined && b !== null);

          if (batteriesWithValues.length > 0) {
            const avgBattery = batteriesWithValues.reduce((sum, b) => sum + b, 0) / batteriesWithValues.length;
            setBatteryPercentage(Math.round(avgBattery));
          }

          // Determine condition based on fill status (use highest fill percentage device)
          const maxFillDevice = devices.reduce((max, device) => {
            const currentFill = device.average_volume_percentage || 0;
            const maxFill = max.average_volume_percentage || 0;
            return currentFill > maxFill ? device : max;
          }, devices[0]);

          if (maxFillDevice.fill_status) {
            const statusMap: Record<string, string> = {
              'full': 'Penuh',
              'high': 'Hampir Penuh',
              'medium': 'Menengah',
              'low': 'Rendah',
              'empty': 'Kosong'
            };
            setCondition(statusMap[maxFillDevice.fill_status] || 'Normal');
          } else {
            setCondition('Normal');
          }
        }
      } catch (error) {
        devError('Error fetching bin data:', error);
        setTrashBinName('Error loading bin');
        setCondition('Unknown');
      }
    };

    fetchBinData();
  }, [trashbinid, binSlug]);

  // STEP 3: Fetch sensor readings from backend with pagination
  const fetchSensorReadings = React.useCallback(async (offset = 0, append = false) => {
    const location = binSlugToLocationMapping[binSlug.toLowerCase()];
    if (!location) {
      devWarn('No location mapping found for binSlug:', binSlug);
      return;
    }

    setSensorDataLoading(true);
    try {
      // ====================================
      // API URL CONFIGURATION
      // ====================================
      // UNCOMMENT ONE OF THE FOLLOWING:

      // LOCAL BACKEND (default)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // RAILWAY PRODUCTION
      // const API_URL = 'https://web-production-99408.up.railway.app';

      // ====================================

      // Fetch sensor readings with pagination (1000 records at a time)
      const response = await fetch(`${API_URL}/api/sensors/readings/${location}?binType=organic&limit=1000&offset=${offset}`);

      if (!response.ok) {
        throw new Error('Failed to fetch sensor readings');
      }

      const data = await response.json();

      if (data.success && data.data) {
        devLog(`Fetched sensor readings: ${data.data.length} records (offset: ${offset})`);

        // Backend returns data in reverse chronological order (newest first)
        // Reverse it so latest is at the end for consistency
        const sortedReadings = [...data.data].reverse();

        if (append) {
          // Append to existing data
          setSensorReadings(prev => [...sortedReadings, ...prev]);
        } else {
          // Replace existing data
          setSensorReadings(sortedReadings);
        }

        // Check if there's more data
        setHasMoreSensorData(data.data.length === 1000);
        setSensorDataOffset(offset + data.data.length);

        devLog(`First reading: ID ${sortedReadings[0]?.id}, timestamp: ${sortedReadings[0]?.timestamp}`);
        devLog(`Last reading: ID ${sortedReadings[sortedReadings.length - 1]?.id}, timestamp: ${sortedReadings[sortedReadings.length - 1]?.timestamp}`);
      } else {
        devWarn('No sensor readings found');
        if (!append) {
          setSensorReadings([]);
        }
        setHasMoreSensorData(false);
      }
    } catch (error) {
      devError('Error fetching sensor readings:', error);
      if (!append) {
        setSensorReadings([]);
      }
      setHasMoreSensorData(false);
    } finally {
      setSensorDataLoading(false);
    }
  }, [binSlug]);

  // STEP 3.1: Fetch anorganic sensor readings from backend with pagination
  const fetchAnorganicSensorReadings = React.useCallback(async (offset = 0, append = false) => {
    const location = binSlugToLocationMapping[binSlug.toLowerCase()];
    if (!location) {
      devWarn('No location mapping found for binSlug:', binSlug);
      return;
    }

    setAnorganicSensorDataLoading(true);
    try {
      // LOCAL BACKEND (default)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // Fetch anorganic sensor readings with pagination (1000 records at a time)
      const response = await fetch(`${API_URL}/api/sensors/readings/${location}?binType=anorganic&limit=1000&offset=${offset}`);

      if (!response.ok) {
        throw new Error('Failed to fetch anorganic sensor readings');
      }

      const data = await response.json();

      if (data.success && data.data) {
        devLog(`Fetched anorganic sensor readings: ${data.data.length} records (offset: ${offset})`);

        // Backend returns data in reverse chronological order (newest first)
        // Reverse it so latest is at the end for consistency
        const sortedReadings = [...data.data].reverse();

        if (append) {
          // Append to existing data
          setAnorganicSensorReadings(prev => [...sortedReadings, ...prev]);
        } else {
          // Replace existing data
          setAnorganicSensorReadings(sortedReadings);
        }

        // Check if there's more data
        setHasMoreAnorganicSensorData(data.data.length === 1000);
        setAnorganicSensorDataOffset(offset + data.data.length);

        devLog(`First anorganic reading: ID ${sortedReadings[0]?.id}, timestamp: ${sortedReadings[0]?.timestamp}`);
        devLog(`Last anorganic reading: ID ${sortedReadings[sortedReadings.length - 1]?.id}, timestamp: ${sortedReadings[sortedReadings.length - 1]?.timestamp}`);
      } else {
        devWarn('No anorganic sensor readings found');
        if (!append) {
          setAnorganicSensorReadings([]);
        }
        setHasMoreAnorganicSensorData(false);
      }
    } catch (error) {
      devError('Error fetching anorganic sensor readings:', error);
      if (!append) {
        setAnorganicSensorReadings([]);
      }
      setHasMoreAnorganicSensorData(false);
    } finally {
      setAnorganicSensorDataLoading(false);
    }
  }, [binSlug]);

  // Initial fetch on mount
  React.useEffect(() => {
    fetchSensorReadings(0, false);
  }, [fetchSensorReadings]);

  // Initial fetch for anorganic on mount
  React.useEffect(() => {
    fetchAnorganicSensorReadings(0, false);
  }, [fetchAnorganicSensorReadings]);

  // Initialize with real-time date range for real sensor data
  // Default time range is 'minute' (Hourly view), so use that for initial range
  const defaultRange = getRealTimeRangeDate('minute');

  // State management
  const [currentBinIndex, setCurrentBinIndex] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('minute');

  // Independent hour offsets for each chart
  const [hourlyOffsets, setHourlyOffsets] = useState({
    total: 0,
    residue: 0,
    organic: 0,
    anorganic: 0
  });

  // Optimized: Batch date range state updates with useReducer
  const dateRangeReducer = (state: Record<string, string>, action: { type: string; payload?: Record<string, string> }) => {
    switch (action.type) {
      case 'SET_UI_DATES':
        return { ...state, ...action.payload };
      case 'SET_APPLIED_DATES':
        return {
          ...state,
          appliedStartDate: action.payload.startDate,
          appliedStartTime: action.payload.startTime,
          appliedEndDate: action.payload.endDate,
          appliedEndTime: action.payload.endTime
        };
      case 'SET_ALL_DATES':
        return { ...state, ...action.payload };
      default:
        return state;
    }
  };

  const [dateRangeState, dispatchDateRange] = React.useReducer(dateRangeReducer, {
    startDate: defaultRange.startDate,
    startTime: defaultRange.startTime,
    endDate: defaultRange.endDate,
    endTime: defaultRange.endTime,
    appliedStartDate: defaultRange.startDate,
    appliedStartTime: defaultRange.startTime,
    appliedEndDate: defaultRange.endDate,
    appliedEndTime: defaultRange.endTime,
  });

  // Destructure for backwards compatibility
  const { startDate, startTime, endDate, endTime, appliedStartDate, appliedStartTime, appliedEndDate, appliedEndTime } = dateRangeState;

  // Wrapper functions for backwards compatibility
  const setStartDate = (val: string) => dispatchDateRange({ type: 'SET_UI_DATES', payload: { startDate: val } });
  const setStartTime = (val: string) => dispatchDateRange({ type: 'SET_UI_DATES', payload: { startTime: val } });
  const setEndDate = (val: string) => dispatchDateRange({ type: 'SET_UI_DATES', payload: { endDate: val } });
  const setEndTime = (val: string) => dispatchDateRange({ type: 'SET_UI_DATES', payload: { endTime: val } });
  const setAppliedStartDate = (val: string) => dispatchDateRange({ type: 'SET_APPLIED_DATES', payload: { startDate: val, startTime: appliedStartTime, endDate: appliedEndDate, endTime: appliedEndTime } });
  const setAppliedStartTime = (val: string) => dispatchDateRange({ type: 'SET_APPLIED_DATES', payload: { startDate: appliedStartDate, startTime: val, endDate: appliedEndDate, endTime: appliedEndTime } });
  const setAppliedEndDate = (val: string) => dispatchDateRange({ type: 'SET_APPLIED_DATES', payload: { startDate: appliedStartDate, startTime: appliedStartTime, endDate: val, endTime: appliedEndTime } });
  const setAppliedEndTime = (val: string) => dispatchDateRange({ type: 'SET_APPLIED_DATES', payload: { startDate: appliedStartDate, startTime: appliedStartTime, endDate: appliedEndDate, endTime: val } });

  // Auto-sync endDate and endTime based on startDate and startTime for all time ranges
  React.useEffect(() => {
    const startDateObj = new Date(startDate);

    switch (timeRange) {
      case 'minute': // Hourly view (minute intervals)
        // Same day, end time = start hour :59
        if (startDate !== endDate) {
          setEndDate(startDate);
        }
        const [hoursMinute] = startTime.split(':');
        const expectedEndTimeMinute = `${hoursMinute}:59`;
        if (endTime !== expectedEndTimeMinute) {
          setEndTime(expectedEndTimeMinute);
        }
        break;

      case 'fiveMinute': // 5-min intervals view
        // Same day, end time = start hour :59
        if (startDate !== endDate) {
          setEndDate(startDate);
        }
        const [hours] = startTime.split(':');
        const expectedEndTime = `${hours}:59`;
        if (endTime !== expectedEndTime) {
          setEndTime(expectedEndTime);
        }
        break;

      case 'hourly': // Day view
        // Same day, 00:00 to 23:59
        if (startDate !== endDate) {
          setEndDate(startDate);
        }
        break;

      case 'daily': // Week view
        // 7 days from start date
        const weekEndDate = new Date(startDateObj);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        const weekEndStr = weekEndDate.toISOString().split('T')[0];
        if (endDate !== weekEndStr) {
          setEndDate(weekEndStr);
        }
        break;

      case 'weekly': // Month view
        // 30 days from start date
        const monthEndDate = new Date(startDateObj);
        monthEndDate.setDate(monthEndDate.getDate() + 29);
        const monthEndStr = monthEndDate.toISOString().split('T')[0];
        if (endDate !== monthEndStr) {
          setEndDate(monthEndStr);
        }
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, startTime, timeRange]);

  // Helper function to calculate time range for a specific chart
  const getChartTimeRange = (chartType: 'total' | 'residue' | 'organic' | 'anorganic') => {
    // All charts now use the same applied date range
    return {
      startDate: combineDateAndTime(appliedStartDate, appliedStartTime),
      endDate: combineDateAndTime(appliedEndDate, appliedEndTime)
    };
  };

  // Create API date range parameters from applied state (for Total chart)
  const totalRange = getChartTimeRange('total');
  const apiStartDate = totalRange.startDate;
  const apiEndDate = totalRange.endDate;

  // Custom hook for Total chart data (main data source)
  const mainHookData = useApiTrashData(apiStartDate, apiEndDate, timeRange, trashbinid);

  // Separate hooks for category charts (for independent navigation in Hourly view)
  const residueRange = getChartTimeRange('residue');
  const organicRange = getChartTimeRange('organic');
  const anorganicRange = getChartTimeRange('anorganic');

  const residueData = useApiTrashData(residueRange.startDate, residueRange.endDate, timeRange, trashbinid);
  const organicData = useApiTrashData(organicRange.startDate, organicRange.endDate, timeRange, trashbinid);
  const anorganicData = useApiTrashData(anorganicRange.startDate, anorganicRange.endDate, timeRange, trashbinid);

  // Destructure the data from hooks
  const {
    loading,
    error,
    compositionToggle,
    setCompositionToggle,
    totalToggle,
    setTotalToggle,
    residueToggle,
    setResidueToggle,
    organicToggle,
    setOrganicToggle,
    anorganicToggle,
    setAnorganicToggle,
    selectedSlice,
    setSelectedSlice,
    currentTotals,
    currentSpecific,
  } = mainHookData;

  // STEP 1: Define chart data getter function (will be memoized below)
  const getOrganicChartDataWithToggle = React.useCallback(() => {
    // STEP 3: Process sensor readings for chart
    if (!sensorReadings || sensorReadings.length === 0) {
      devLog('[Organic Chart] No sensor readings available');
      return [];
    }

    devLog(`[Organic Chart] Processing ${sensorReadings.length} sensor readings`);

    // Helper: Intra-day accumulated memory calculation
    // Calculates total waste generated in a day accounting for pickups
    const calculateIntraDayAccumulation = (
      dayReadings: Array<{ timestamp: Date; weight: number; volume: number; id: number }>,
      metric: 'weight' | 'volume'
    ): number => {
      if (dayReadings.length === 0) return 0;
      if (dayReadings.length === 1) return 0; // Only one reading, no generation

      // Sort by timestamp
      const sorted = [...dayReadings].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Detection thresholds
      const WEIGHT_THRESHOLD = 0.5; // kg
      const VOLUME_THRESHOLD = 5; // percent

      const threshold = metric === 'weight' ? WEIGHT_THRESHOLD : VOLUME_THRESHOLD;
      const values = sorted.map(r => metric === 'weight' ? r.weight : r.volume);

      // Initialize cumulative array
      const B: number[] = new Array(values.length);
      B[0] = values[0];

      // Apply accumulated memory algorithm
      for (let i = 1; i < values.length; i++) {
        const A_current = values[i];
        const A_prev = values[i - 1];

        if (A_current >= A_prev - threshold) {
          // Normal accumulation - no pickup detected
          B[i] = B[i - 1] + (A_current - A_prev);
        } else {
          // Pickup detected! (drastic decrease)
          B[i] = B[i - 1] + A_current;
          devLog(`  [Intra-Day] Pickup detected at ${sorted[i].timestamp.toISOString()}: ${A_prev.toFixed(2)} → ${A_current.toFixed(2)}`);
        }
      }

      // Total waste generated this day
      const totalWaste = B[B.length - 1] - B[0];
      return Math.max(0, totalWaste); // Ensure non-negative
    };

    // Process readings (using global calculateVolumePercentage with error handling)
    const processedData = sensorReadings.map(reading => {
      const timestamp = new Date(reading.timestamp);
      const weight = parseFloat(reading.weight);

      // Parse 4 individual sensor readings
      const sensorTL = parseFloat(reading.sensor_top_left);
      const sensorTR = parseFloat(reading.sensor_top_right);
      const sensorBL = parseFloat(reading.sensor_bottom_left);
      const sensorBR = parseFloat(reading.sensor_bottom_right);

      // Calculate volume from 4 sensors (global function handles errors >= 2000)
      const volume = calculateVolumePercentage(sensorTL, sensorTR, sensorBL, sensorBR);

      return {
        id: reading.id,
        timestamp,
        timestampString: reading.timestamp, // Keep original string for debugging
        weight: isNaN(weight) ? 0 : weight,
        volume,
        sensors: {
          topLeft: sensorTL,
          topRight: sensorTR,
          bottomLeft: sensorBL,
          bottomRight: sensorBR
        }
      };
    });

    // Sort by timestamp (oldest first)
    processedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (processedData.length > 0) {
      const first = processedData[0];
      const last = processedData[processedData.length - 1];
      devLog(`[Organic Chart] First reading: ID ${first.id}, ${first.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
      devLog(`[Organic Chart] Last reading: ID ${last.id}, ${last.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
    }

    let chartData: { time: string; fullTimestamp: string; value: number }[] = [];

    if (timeRange === 'minute') {
      // HOURLY VIEW: Show data from current hour with 60 minute intervals (XX:00-XX:59)
      const [startYear, startMonth, startDay] = appliedStartDate.split('-').map(Number);
      const [startHourInput, startMinuteInput] = appliedStartTime.split(':').map(Number);
      const [endYear, endMonth, endDay] = appliedEndDate.split('-').map(Number);
      const [endHourInput, endMinuteInput] = appliedEndTime.split(':').map(Number);

      // Create UTC dates by subtracting 7 hours from Jakarta time
      const startDateTimeUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, startHourInput - 7, startMinuteInput));
      const endDateTimeUTC = new Date(Date.UTC(endYear, endMonth - 1, endDay, endHourInput - 7, endMinuteInput));

      devLog(`[Organic Chart Hourly View] Time Period Selection - Start: ${startDateTimeUTC.toISOString()}, End: ${endDateTimeUTC.toISOString()}`);

      // Group by minute, select latest reading per minute
      const groupByMinute: Record<string, typeof processedData[0]> = {};

      processedData.forEach(item => {
        const intervalKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });

        if (!groupByMinute[intervalKey] || item.timestamp > groupByMinute[intervalKey].timestamp) {
          groupByMinute[intervalKey] = item;
        }
      });

      // Filter data based on Time Period picker selection (compare in UTC)
      const filteredData = Object.values(groupByMinute).filter(item => {
        return item.timestamp >= startDateTimeUTC && item.timestamp <= endDateTimeUTC;
      });

      devLog(`[Organic Chart Hourly View] Filtered ${filteredData.length} data points within Time Period range`);

      // Create a map of existing data by minute
      const dataByMinute = new Map<string, typeof processedData[0]>();
      filteredData.forEach(item => {
        const jakartaTimeStr = item.timestamp.toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });
        const key = jakartaTimeStr;

        if (!dataByMinute.has(key) || item.timestamp > dataByMinute.get(key)!.timestamp) {
          dataByMinute.set(key, item);
        }
      });

      // Generate all 60 minutes for the hour (0-59)
      const targetHour = startHourInput;
      chartData = [];

      for (let minute = 0; minute < 60; minute++) {
        const key = `${String(targetHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const data = dataByMinute.get(key);

        if (data) {
          // Has data for this minute
          chartData.push({
            time: data.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Jakarta'
            }),
            fullTimestamp: `${data.timestamp.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: 'Asia/Jakarta'
            })} ${data.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
              timeZone: 'Asia/Jakarta'
            })} (ID #${data.id})`,
            value: organicToggle === "weight" ? data.weight : data.volume
          });
        } else {
          // No data for this minute, create placeholder with value 0
          chartData.push({
            time: `${String(targetHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            fullTimestamp: `${appliedStartDate} ${String(targetHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (No data)`,
            value: 0
          });
        }
      }

      devLog(`[Organic Chart Hourly View] Generated ${chartData.length} data points with 1-minute intervals`);

    } else if (timeRange === 'hourly') {
      // DAY VIEW: Show data from Time Period picker range with 15-minute intervals
      // Parse the applied start/end dates as Asia/Jakarta timezone and convert to UTC for filtering

      // The input dates are in format "2025-11-19" and times "00:00", "23:59"
      // We treat these as Asia/Jakarta time (UTC+7) and need to convert to UTC for comparison
      const [startYear, startMonth, startDay] = appliedStartDate.split('-').map(Number);
      const [startHourInput, startMinuteInput] = appliedStartTime.split(':').map(Number);
      const [endYear, endMonth, endDay] = appliedEndDate.split('-').map(Number);
      const [endHourInput, endMinuteInput] = appliedEndTime.split(':').map(Number);

      // Create UTC dates by subtracting 7 hours from Jakarta time
      // Jakarta 00:00 = UTC 17:00 (previous day)
      const startDateTimeUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, startHourInput - 7, startMinuteInput));
      const endDateTimeUTC = new Date(Date.UTC(endYear, endMonth - 1, endDay, endHourInput - 7, endMinuteInput));

      // Also keep the original Jakarta time for display purposes
      const startDateTime = new Date(Date.UTC(startYear, startMonth - 1, startDay, startHourInput, startMinuteInput));
      const endDateTime = new Date(Date.UTC(endYear, endMonth - 1, endDay, endHourInput, endMinuteInput));

      devLog(`[Organic Chart Day View] Time Period Selection - Start: ${startDateTimeUTC.toISOString()}, End: ${endDateTimeUTC.toISOString()}`);

      // Group by 15-minute intervals, select latest reading per interval
      const groupBy15Min: Record<string, typeof processedData[0]> = {};

      processedData.forEach(item => {
        // Use Asia/Jakarta timezone consistently
        const jakartaTimeStr = item.timestamp.toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });
        const [, minuteStr] = jakartaTimeStr.split(':');
        const minute = parseInt(minuteStr, 10);

        // Round down to nearest 15-minute interval
        const roundedMinute = Math.floor(minute / 15) * 15;

        const intervalKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        }) + `:${String(roundedMinute).padStart(2, '0')}`;

        if (!groupBy15Min[intervalKey] || item.timestamp > groupBy15Min[intervalKey].timestamp) {
          groupBy15Min[intervalKey] = item;
        }
      });

      // Filter data based on Time Period picker selection (compare in UTC)
      const filteredData = Object.values(groupBy15Min).filter(item => {
        return item.timestamp >= startDateTimeUTC && item.timestamp <= endDateTimeUTC;
      });

      devLog(`[Organic Chart Day View] Filtered ${filteredData.length} data points within Time Period range`);

      // Create a map of existing data by hour and 15-minute interval using Asia/Jakarta timezone
      const dataByInterval = new Map<string, typeof processedData[0]>();
      filteredData.forEach(item => {
        // Use Asia/Jakarta timezone to extract hour and minute consistently
        const jakartaTimeStr = item.timestamp.toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });
        const [hourStr, minuteStr] = jakartaTimeStr.split(':');
        const minute = parseInt(minuteStr, 10);
        const roundedMinute = Math.floor(minute / 15) * 15;
        const key = `${hourStr}:${String(roundedMinute).padStart(2, '0')}`;

        if (!dataByInterval.has(key) || item.timestamp > dataByInterval.get(key)!.timestamp) {
          dataByInterval.set(key, item);
        }
      });

      // Generate all 15-minute intervals for 24 hours (96 intervals: 24 hours * 4)
      // Use Jakarta timezone to extract the hour values from the applied times
      const startHour = startHourInput; // Use the input hour directly (already in Jakarta time)
      const endHour = endHourInput;

      // Create a date object for display purposes using Jakarta date
      const targetDate = new Date(`${appliedStartDate}T00:00:00`);
      targetDate.setHours(0, 0, 0, 0);

      chartData = [];

      for (let hour = startHour; hour <= endHour; hour++) {
        for (const minute of [0, 15, 30, 45]) {
          const key = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const data = dataByInterval.get(key);

          if (data) {
            // Has data for this interval
            chartData.push({
              time: data.timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta'
              }),
              fullTimestamp: `${data.timestamp.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'Asia/Jakarta'
              })} ${data.timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta'
              })} (ID #${data.id})`,
              value: organicToggle === "weight" ? data.weight : data.volume
            });
          } else {
            // No data for this interval, create placeholder with value 0
            const placeholderDate = new Date(targetDate);
            placeholderDate.setHours(hour, minute, 0, 0);

            chartData.push({
              time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
              fullTimestamp: `${targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'Asia/Jakarta'
              })} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (No data)`,
              value: 0
            });
          }
        }
      }

      devLog(`[Organic Chart Day View] Generated ${chartData.length} data points with 15-minute intervals`);

    } else if (timeRange === 'daily') {
      // WEEK VIEW: Show data from Time Period picker range with DAILY AGGREGATION
      // Uses accumulated memory logic to handle intra-day pickups
      const startDateTime = new Date(`${appliedStartDate}T${appliedStartTime}`);
      const endDateTime = new Date(`${appliedEndDate}T${appliedEndTime}`);

      devLog(`[Organic Chart Week View] Time Period Selection - Start: ${startDateTime.toISOString()}, End: ${endDateTime.toISOString()}`);

      // Group ALL readings by date (YYYY-MM-DD)
      const readingsByDate: Record<string, typeof processedData> = {};

      processedData.forEach(item => {
        const dateKey = item.timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Jakarta'
        });

        if (!readingsByDate[dateKey]) {
          readingsByDate[dateKey] = [];
        }
        readingsByDate[dateKey].push(item);
      });

      devLog(`[Organic Chart Week View] Grouped into ${Object.keys(readingsByDate).length} days`);

      // Calculate daily totals using accumulated memory logic
      const dailyTotals: Array<{ date: string; timestamp: Date; totalWaste: number }> = [];

      Object.entries(readingsByDate).forEach(([dateKey, dayReadings]) => {
        // Check if this date is within our range
        const firstReading = dayReadings[0];
        if (firstReading.timestamp < startDateTime || firstReading.timestamp > endDateTime) {
          return; // Skip dates outside range
        }

        // Apply intra-day accumulated memory algorithm
        const metric = organicToggle === "weight" ? "weight" : "volume";
        const totalWaste = calculateIntraDayAccumulation(dayReadings, metric);

        dailyTotals.push({
          date: dateKey,
          timestamp: firstReading.timestamp,
          totalWaste
        });

        devLog(`  [Week View] ${dateKey}: ${dayReadings.length} readings → ${totalWaste.toFixed(2)} ${metric} generated`);
      });

      // Sort by date
      dailyTotals.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      devLog(`[Organic Chart Week View] Generated ${dailyTotals.length} daily data points`);

      // Convert to chart format
      chartData = dailyTotals.map(day => ({
        time: day.timestamp.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        }),
        fullTimestamp: `${day.date} - Total: ${day.totalWaste.toFixed(2)} ${organicToggle === "weight" ? "kg" : "%"}`,
        value: day.totalWaste
      }));

    } else if (timeRange === 'weekly') {
      // MONTH VIEW: Show data from Time Period picker range with DAILY AGGREGATION
      // Uses accumulated memory logic to handle intra-day pickups
      const startDateTime = new Date(`${appliedStartDate}T${appliedStartTime}`);
      const endDateTime = new Date(`${appliedEndDate}T${appliedEndTime}`);

      devLog(`[Organic Chart Month View] Time Period Selection - Start: ${startDateTime.toISOString()}, End: ${endDateTime.toISOString()}`);

      // Group ALL readings by date (YYYY-MM-DD)
      const readingsByDate: Record<string, typeof processedData> = {};

      processedData.forEach(item => {
        const dateKey = item.timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Jakarta'
        });

        if (!readingsByDate[dateKey]) {
          readingsByDate[dateKey] = [];
        }
        readingsByDate[dateKey].push(item);
      });

      devLog(`[Organic Chart Month View] Grouped into ${Object.keys(readingsByDate).length} days`);

      // Calculate daily totals using accumulated memory logic
      const dailyTotals: Array<{ date: string; timestamp: Date; totalWaste: number }> = [];

      Object.entries(readingsByDate).forEach(([dateKey, dayReadings]) => {
        // Check if this date is within our range
        const firstReading = dayReadings[0];
        if (firstReading.timestamp < startDateTime || firstReading.timestamp > endDateTime) {
          return; // Skip dates outside range
        }

        // Apply intra-day accumulated memory algorithm
        const metric = organicToggle === "weight" ? "weight" : "volume";
        const totalWaste = calculateIntraDayAccumulation(dayReadings, metric);

        dailyTotals.push({
          date: dateKey,
          timestamp: firstReading.timestamp,
          totalWaste
        });

        devLog(`  [Month View] ${dateKey}: ${dayReadings.length} readings → ${totalWaste.toFixed(2)} ${metric} generated`);
      });

      // Sort by date
      dailyTotals.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      devLog(`[Organic Chart Month View] Generated ${dailyTotals.length} daily data points`);

      // Convert to chart format
      chartData = dailyTotals.map(day => ({
        time: day.timestamp.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        }),
        fullTimestamp: `${day.date} - Total: ${day.totalWaste.toFixed(2)} ${organicToggle === "weight" ? "kg" : "%"}`,
        value: day.totalWaste
      }));
    }

    return chartData;
  }, [sensorReadings, appliedStartDate, appliedEndDate, appliedStartTime, appliedEndTime, organicToggle, timeRange]);

  // Memoized chart data calculations
  const organicChartData = React.useMemo(() => {
    return getOrganicChartDataWithToggle();
  }, [getOrganicChartDataWithToggle]);

  // Total Monitoring - Sum of all bin types (Residue + Organic + Anorganic)
  // Total Monitoring has its own independent toggle for Weight/Volume
  const totalChartData = React.useMemo(() => {
    // For now, only Organic has sensor data
    // Total = Residue + Organic + Anorganic (when sensors are available)

    // We need to recalculate from sensor readings using totalToggle (not organicToggle)
    if (!sensorReadings || sensorReadings.length === 0) {
      return [];
    }

    // Process readings (using global calculateVolumePercentage with error handling)
    const processedData = sensorReadings.map(reading => {
      const timestamp = new Date(reading.timestamp);
      const weight = parseFloat(reading.weight);
      const sensorTL = parseFloat(reading.sensor_top_left);
      const sensorTR = parseFloat(reading.sensor_top_right);
      const sensorBL = parseFloat(reading.sensor_bottom_left);
      const sensorBR = parseFloat(reading.sensor_bottom_right);
      const volume = calculateVolumePercentage(sensorTL, sensorTR, sensorBL, sensorBR);

      return {
        id: reading.id,
        timestamp,
        weight: isNaN(weight) ? 0 : weight,
        volume
      };
    });

    // Sort by timestamp
    processedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply same time range filtering and grouping logic based on timeRange
    const startDateTime = new Date(`${appliedStartDate}T${appliedStartTime}`);
    const endDateTime = new Date(`${appliedEndDate}T${appliedEndTime}`);

    let chartData: { time: string; fullTimestamp: string; value: number }[] = [];

    if (timeRange === 'minute') {
      // HOURLY VIEW - Combine Organic + Anorganic by minute
      // Process anorganic sensor readings too (with error handling)
      const anorganicProcessedData = anorganicSensorReadings.map(reading => {
        const timestamp = new Date(reading.timestamp);
        const weight = parseFloat(reading.weight);
        const sensorTL = parseFloat(reading.sensor_top_left);
        const sensorTR = parseFloat(reading.sensor_top_right);
        const sensorBL = parseFloat(reading.sensor_bottom_left);
        const sensorBR = parseFloat(reading.sensor_bottom_right);
        const volume = calculateVolumePercentage(sensorTL, sensorTR, sensorBL, sensorBR);

        return {
          id: reading.id,
          timestamp,
          weight: isNaN(weight) ? 0 : weight,
          volume
        };
      });

      const [startYear, startMonth, startDay] = appliedStartDate.split('-').map(Number);
      const [startHourInput, startMinuteInput] = appliedStartTime.split(':').map(Number);
      const [endYear, endMonth, endDay] = appliedEndDate.split('-').map(Number);
      const [endHourInput, endMinuteInput] = appliedEndTime.split(':').map(Number);

      const startDateTimeUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, startHourInput - 7, startMinuteInput));
      const endDateTimeUTC = new Date(Date.UTC(endYear, endMonth - 1, endDay, endHourInput - 7, endMinuteInput));

      // Group organic by minute
      const organicByMinute = new Map<string, typeof processedData[0]>();
      processedData.forEach(item => {
        if (item.timestamp >= startDateTimeUTC && item.timestamp <= endDateTimeUTC) {
          const key = item.timestamp.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jakarta'
          });
          if (!organicByMinute.has(key) || item.timestamp > organicByMinute.get(key)!.timestamp) {
            organicByMinute.set(key, item);
          }
        }
      });

      // Group anorganic by minute
      const anorganicByMinute = new Map<string, typeof anorganicProcessedData[0]>();
      anorganicProcessedData.forEach(item => {
        if (item.timestamp >= startDateTimeUTC && item.timestamp <= endDateTimeUTC) {
          const key = item.timestamp.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jakarta'
          });
          if (!anorganicByMinute.has(key) || item.timestamp > anorganicByMinute.get(key)!.timestamp) {
            anorganicByMinute.set(key, item);
          }
        }
      });

      // Generate 60 data points - sum of organic + anorganic for each minute
      const targetHour = startHourInput;
      chartData = [];

      for (let minute = 0; minute < 60; minute++) {
        const key = `${String(targetHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const organicData = organicByMinute.get(key);
        const anorganicData = anorganicByMinute.get(key);

        const organicValue = organicData ? (totalToggle === "weight" ? organicData.weight : organicData.volume) : 0;
        const anorganicValue = anorganicData ? (totalToggle === "weight" ? anorganicData.weight : anorganicData.volume) : 0;
        // For volume, calculate average to keep max at 100%. For weight, sum the values.
        const totalValue = totalToggle === "volume" ? (organicValue + anorganicValue) / 2 : organicValue + anorganicValue;

        chartData.push({
          time: key,
          fullTimestamp: `${appliedStartDate} ${key} - Organic: ${organicValue.toFixed(2)}, Anorganic: ${anorganicValue.toFixed(2)}`,
          value: totalValue
        });
      }

    } else if (timeRange === 'hourly') {
      // DAY VIEW - 15-minute intervals - Sum Organic + Anorganic
      const anorganicProcessedData = anorganicSensorReadings.map(reading => {
        const timestamp = new Date(reading.timestamp);
        const weight = parseFloat(reading.weight);
        const sensorTL = parseFloat(reading.sensor_top_left);
        const sensorTR = parseFloat(reading.sensor_top_right);
        const sensorBL = parseFloat(reading.sensor_bottom_left);
        const sensorBR = parseFloat(reading.sensor_bottom_right);
        const volume = (!isNaN(sensorTL) && !isNaN(sensorTR) && !isNaN(sensorBL) && !isNaN(sensorBR))
          ? calculateVolumePercentage(sensorTL, sensorTR, sensorBL, sensorBR)
          : 0;

        return {
          id: reading.id,
          timestamp,
          weight: isNaN(weight) ? 0 : weight,
          volume
        };
      });

      // Group organic by 15 minutes
      const organicGroupBy15Min: Record<string, typeof processedData[0]> = {};
      processedData.forEach(item => {
        const jakartaTimeStr = item.timestamp.toLocaleString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        });
        const [, minuteStr] = jakartaTimeStr.split(':');
        const minute = parseInt(minuteStr, 10);
        const roundedMinute = Math.floor(minute / 15) * 15;
        const intervalKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        }) + `:${String(roundedMinute).padStart(2, '0')}`;

        if (!organicGroupBy15Min[intervalKey] || item.timestamp > organicGroupBy15Min[intervalKey].timestamp) {
          organicGroupBy15Min[intervalKey] = item;
        }
      });

      // Group anorganic by 15 minutes
      const anorganicGroupBy15Min: Record<string, typeof anorganicProcessedData[0]> = {};
      anorganicProcessedData.forEach(item => {
        const jakartaTimeStr = item.timestamp.toLocaleString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        });
        const [, minuteStr] = jakartaTimeStr.split(':');
        const minute = parseInt(minuteStr, 10);
        const roundedMinute = Math.floor(minute / 15) * 15;
        const intervalKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        }) + `:${String(roundedMinute).padStart(2, '0')}`;

        if (!anorganicGroupBy15Min[intervalKey] || item.timestamp > anorganicGroupBy15Min[intervalKey].timestamp) {
          anorganicGroupBy15Min[intervalKey] = item;
        }
      });

      const organicFilteredData = Object.values(organicGroupBy15Min).filter(item => item.timestamp >= startDateTime && item.timestamp <= endDateTime);
      const anorganicFilteredData = Object.values(anorganicGroupBy15Min).filter(item => item.timestamp >= startDateTime && item.timestamp <= endDateTime);

      const organicDataByInterval = new Map<string, typeof processedData[0]>();
      organicFilteredData.forEach(item => {
        const jakartaTimeStr = item.timestamp.toLocaleString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        });
        const [hourStr, minuteStr] = jakartaTimeStr.split(':');
        const minute = parseInt(minuteStr, 10);
        const roundedMinute = Math.floor(minute / 15) * 15;
        const key = `${hourStr}:${String(roundedMinute).padStart(2, '0')}`;
        if (!organicDataByInterval.has(key) || item.timestamp > organicDataByInterval.get(key)!.timestamp) {
          organicDataByInterval.set(key, item);
        }
      });

      const anorganicDataByInterval = new Map<string, typeof anorganicProcessedData[0]>();
      anorganicFilteredData.forEach(item => {
        const jakartaTimeStr = item.timestamp.toLocaleString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        });
        const [hourStr, minuteStr] = jakartaTimeStr.split(':');
        const minute = parseInt(minuteStr, 10);
        const roundedMinute = Math.floor(minute / 15) * 15;
        const key = `${hourStr}:${String(roundedMinute).padStart(2, '0')}`;
        if (!anorganicDataByInterval.has(key) || item.timestamp > anorganicDataByInterval.get(key)!.timestamp) {
          anorganicDataByInterval.set(key, item);
        }
      });

      // Parse hour values from applied time inputs (already in Jakarta time)
      const [startHourInput, startMinuteInput] = appliedStartTime.split(':').map(Number);
      const [endHourInput, endMinuteInput] = appliedEndTime.split(':').map(Number);
      const startHour = startHourInput;
      const endHour = endHourInput;

      // Create a date object for display purposes using Jakarta date
      const targetDate = new Date(`${appliedStartDate}T00:00:00`);
      targetDate.setHours(0, 0, 0, 0);

      for (let hour = startHour; hour <= endHour; hour++) {
        for (const minute of [0, 15, 30, 45]) {
          const key = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const organicData = organicDataByInterval.get(key);
          const anorganicData = anorganicDataByInterval.get(key);

          const organicValue = organicData ? (totalToggle === "weight" ? organicData.weight : organicData.volume) : 0;
          const anorganicValue = anorganicData ? (totalToggle === "weight" ? anorganicData.weight : anorganicData.volume) : 0;
          // For volume, calculate average to keep max at 100%. For weight, sum the values.
          const totalValue = totalToggle === "volume" ? (organicValue + anorganicValue) / 2 : organicValue + anorganicValue;

          if (organicData || anorganicData) {
            const timestamp = organicData ? organicData.timestamp : anorganicData!.timestamp;
            chartData.push({
              time: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }),
              fullTimestamp: `${timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' })} ${timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })} - Organic: ${organicValue.toFixed(2)}, Anorganic: ${anorganicValue.toFixed(2)}`,
              value: totalValue
            });
          } else {
            const placeholderDate = new Date(targetDate);
            placeholderDate.setHours(hour, minute, 0, 0);
            chartData.push({
              time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
              fullTimestamp: `${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' })} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (No data)`,
              value: 0
            });
          }
        }
      }

    } else if (timeRange === 'daily') {
      // WEEK VIEW - Hourly intervals - Sum Organic + Anorganic
      const anorganicProcessedData = anorganicSensorReadings.map(reading => {
        const timestamp = new Date(reading.timestamp);
        const weight = parseFloat(reading.weight);
        const sensorTL = parseFloat(reading.sensor_top_left);
        const sensorTR = parseFloat(reading.sensor_top_right);
        const sensorBL = parseFloat(reading.sensor_bottom_left);
        const sensorBR = parseFloat(reading.sensor_bottom_right);
        const volume = (!isNaN(sensorTL) && !isNaN(sensorTR) && !isNaN(sensorBL) && !isNaN(sensorBR))
          ? calculateVolumePercentage(sensorTL, sensorTR, sensorBL, sensorBR)
          : 0;

        return {
          id: reading.id,
          timestamp,
          weight: isNaN(weight) ? 0 : weight,
          volume
        };
      });

      // Group organic by hour
      const organicGroupByHour: Record<string, typeof processedData[0]> = {};
      processedData.forEach(item => {
        const hourKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        });
        if (!organicGroupByHour[hourKey] || item.timestamp > organicGroupByHour[hourKey].timestamp) {
          organicGroupByHour[hourKey] = item;
        }
      });

      // Group anorganic by hour
      const anorganicGroupByHour: Record<string, typeof anorganicProcessedData[0]> = {};
      anorganicProcessedData.forEach(item => {
        const hourKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        });
        if (!anorganicGroupByHour[hourKey] || item.timestamp > anorganicGroupByHour[hourKey].timestamp) {
          anorganicGroupByHour[hourKey] = item;
        }
      });

      const organicHourData = Object.values(organicGroupByHour).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const anorganicHourData = Object.values(anorganicGroupByHour).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const organicFilteredData = organicHourData.filter(item => item.timestamp >= startDateTime && item.timestamp <= endDateTime);
      const anorganicFilteredData = anorganicHourData.filter(item => item.timestamp >= startDateTime && item.timestamp <= endDateTime);

      // Create a map to combine organic and anorganic data by hour key
      const combinedByHour = new Map<string, { organic?: typeof processedData[0], anorganic?: typeof anorganicProcessedData[0] }>();

      organicFilteredData.forEach(item => {
        const hourKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        });
        combinedByHour.set(hourKey, { ...combinedByHour.get(hourKey), organic: item });
      });

      anorganicFilteredData.forEach(item => {
        const hourKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        });
        combinedByHour.set(hourKey, { ...combinedByHour.get(hourKey), anorganic: item });
      });

      chartData = Array.from(combinedByHour.values()).map(({ organic, anorganic }) => {
        const item = organic || anorganic!;
        const organicValue = organic ? (totalToggle === "weight" ? organic.weight : organic.volume) : 0;
        const anorganicValue = anorganic ? (totalToggle === "weight" ? anorganic.weight : anorganic.volume) : 0;
        // For volume, calculate average to keep max at 100%. For weight, sum the values.
        const totalValue = totalToggle === "volume" ? (organicValue + anorganicValue) / 2 : organicValue + anorganicValue;

        return {
          time: item.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' }) + ' ' + item.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }) + ':00',
          fullTimestamp: `${item.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' })} ${item.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })} - Organic: ${organicValue.toFixed(2)}, Anorganic: ${anorganicValue.toFixed(2)}`,
          value: totalValue
        };
      });

    } else if (timeRange === 'weekly') {
      // MONTH VIEW - Daily intervals - Sum Organic + Anorganic
      const anorganicProcessedData = anorganicSensorReadings.map(reading => {
        const timestamp = new Date(reading.timestamp);
        const weight = parseFloat(reading.weight);
        const sensorTL = parseFloat(reading.sensor_top_left);
        const sensorTR = parseFloat(reading.sensor_top_right);
        const sensorBL = parseFloat(reading.sensor_bottom_left);
        const sensorBR = parseFloat(reading.sensor_bottom_right);
        const volume = (!isNaN(sensorTL) && !isNaN(sensorTR) && !isNaN(sensorBL) && !isNaN(sensorBR))
          ? calculateVolumePercentage(sensorTL, sensorTR, sensorBL, sensorBR)
          : 0;

        return {
          id: reading.id,
          timestamp,
          weight: isNaN(weight) ? 0 : weight,
          volume
        };
      });

      // Group organic by day
      const organicGroupByDay: Record<string, typeof processedData[0]> = {};
      processedData.forEach(item => {
        const dayKey = item.timestamp.toLocaleDateString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Jakarta'
        });
        if (!organicGroupByDay[dayKey] || item.timestamp > organicGroupByDay[dayKey].timestamp) {
          organicGroupByDay[dayKey] = item;
        }
      });

      // Group anorganic by day
      const anorganicGroupByDay: Record<string, typeof anorganicProcessedData[0]> = {};
      anorganicProcessedData.forEach(item => {
        const dayKey = item.timestamp.toLocaleDateString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Jakarta'
        });
        if (!anorganicGroupByDay[dayKey] || item.timestamp > anorganicGroupByDay[dayKey].timestamp) {
          anorganicGroupByDay[dayKey] = item;
        }
      });

      const organicDayData = Object.values(organicGroupByDay).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const anorganicDayData = Object.values(anorganicGroupByDay).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const organicFilteredData = organicDayData.filter(item => item.timestamp >= startDateTime && item.timestamp <= endDateTime);
      const anorganicFilteredData = anorganicDayData.filter(item => item.timestamp >= startDateTime && item.timestamp <= endDateTime);

      // Create a map to combine organic and anorganic data by day key
      const combinedByDay = new Map<string, { organic?: typeof processedData[0], anorganic?: typeof anorganicProcessedData[0] }>();

      organicFilteredData.forEach(item => {
        const dayKey = item.timestamp.toLocaleDateString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Jakarta'
        });
        combinedByDay.set(dayKey, { ...combinedByDay.get(dayKey), organic: item });
      });

      anorganicFilteredData.forEach(item => {
        const dayKey = item.timestamp.toLocaleDateString('en-US', {
          year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Jakarta'
        });
        combinedByDay.set(dayKey, { ...combinedByDay.get(dayKey), anorganic: item });
      });

      chartData = Array.from(combinedByDay.values()).map(({ organic, anorganic }) => {
        const item = organic || anorganic!;
        const organicValue = organic ? (totalToggle === "weight" ? organic.weight : organic.volume) : 0;
        const anorganicValue = anorganic ? (totalToggle === "weight" ? anorganic.weight : anorganic.volume) : 0;
        // For volume, calculate average to keep max at 100%. For weight, sum the values.
        const totalValue = totalToggle === "volume" ? (organicValue + anorganicValue) / 2 : organicValue + anorganicValue;

        return {
          time: item.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' }),
          fullTimestamp: `${item.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' })} ${item.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })} - Organic: ${organicValue.toFixed(2)}, Anorganic: ${anorganicValue.toFixed(2)}`,
          value: totalValue
        };
      });
    }

    return chartData;
  }, [sensorReadings, anorganicSensorReadings, appliedStartDate, appliedEndDate, appliedStartTime, appliedEndTime, totalToggle, timeRange]);

  const getTotalChartData = () => totalChartData;

  const getVolumeBarData = () => [];
  const getDonutData = () => [];

  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
    // Reset all hour offsets when changing time range
    setHourlyOffsets({ total: 0, residue: 0, organic: 0, anorganic: 0 });
    const newRange = getRealTimeRangeDate(newTimeRange);

    // Update both UI state and applied state with new range using a single dispatch
    dispatchDateRange({
      type: 'SET_UI_DATES',
      payload: {
        startDate: newRange.startDate,
        startTime: newRange.startTime,
        endDate: newRange.endDate,
        endTime: newRange.endTime
      }
    });

    dispatchDateRange({
      type: 'SET_APPLIED_DATES',
      payload: {
        startDate: newRange.startDate,
        startTime: newRange.startTime,
        endDate: newRange.endDate,
        endTime: newRange.endTime
      }
    });

    devLog("Time range changed to:", newTimeRange, newRange);
  };

  // Optimized: Memoize navigation functions
  const handlePreviousPeriod = React.useCallback((_chartType: 'total' | 'residue' | 'organic' | 'anorganic') => {
    // Calculate new date range based on time range type
    const currentStart = new Date(`${appliedStartDate}T${appliedStartTime}`);
    const currentEnd = new Date(`${appliedEndDate}T${appliedEndTime}`);

    switch (timeRange) {
      case 'minute': // Hourly view - go back 1 hour
        currentStart.setHours(currentStart.getHours() - 1);
        currentEnd.setHours(currentEnd.getHours() - 1);
        break;

      case 'fiveMinute': // 5-min view - go back 1 hour
        currentStart.setHours(currentStart.getHours() - 1);
        currentEnd.setHours(currentEnd.getHours() - 1);
        break;

      case 'hourly': // Day view - go back 1 day
        currentStart.setDate(currentStart.getDate() - 1);
        currentEnd.setDate(currentEnd.getDate() - 1);
        break;

      case 'daily': // Week view - go back 7 days
        currentStart.setDate(currentStart.getDate() - 7);
        currentEnd.setDate(currentEnd.getDate() - 7);
        break;

      case 'weekly': // Month view - go back 30 days
        currentStart.setDate(currentStart.getDate() - 30);
        currentEnd.setDate(currentEnd.getDate() - 30);
        break;
    }

    // Update applied dates (this will trigger chart refresh)
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

    // Optimized: Batch all state updates into one dispatch
    dispatchDateRange({
      type: 'SET_ALL_DATES',
      payload: {
        startDate: formatDate(currentStart),
        startTime: formatTime(currentStart),
        endDate: formatDate(currentEnd),
        endTime: formatTime(currentEnd),
        appliedStartDate: formatDate(currentStart),
        appliedStartTime: formatTime(currentStart),
        appliedEndDate: formatDate(currentEnd),
        appliedEndTime: formatTime(currentEnd),
      }
    });

    devLog(`[Navigation] Previous period: ${formatDate(currentStart)} ${formatTime(currentStart)} to ${formatDate(currentEnd)} ${formatTime(currentEnd)}`);
  }, [appliedStartDate, appliedStartTime, appliedEndDate, appliedEndTime, timeRange, dispatchDateRange]);

  const handleNextPeriod = React.useCallback((_chartType: 'total' | 'residue' | 'organic' | 'anorganic') => {
    // Calculate new date range based on time range type
    const currentStart = new Date(`${appliedStartDate}T${appliedStartTime}`);
    const currentEnd = new Date(`${appliedEndDate}T${appliedEndTime}`);

    switch (timeRange) {
      case 'minute': // Hourly view - go forward 1 hour
        currentStart.setHours(currentStart.getHours() + 1);
        currentEnd.setHours(currentEnd.getHours() + 1);
        break;

      case 'fiveMinute': // 5-min view - go forward 1 hour
        currentStart.setHours(currentStart.getHours() + 1);
        currentEnd.setHours(currentEnd.getHours() + 1);
        break;

      case 'hourly': // Day view - go forward 1 day
        currentStart.setDate(currentStart.getDate() + 1);
        currentEnd.setDate(currentEnd.getDate() + 1);
        break;

      case 'daily': // Week view - go forward 7 days
        currentStart.setDate(currentStart.getDate() + 7);
        currentEnd.setDate(currentEnd.getDate() + 7);
        break;

      case 'weekly': // Month view - go forward 30 days
        currentStart.setDate(currentStart.getDate() + 30);
        currentEnd.setDate(currentEnd.getDate() + 30);
        break;
    }

    // Update applied dates (this will trigger chart refresh)
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

    // Optimized: Batch all state updates into one dispatch
    dispatchDateRange({
      type: 'SET_ALL_DATES',
      payload: {
        startDate: formatDate(currentStart),
        startTime: formatTime(currentStart),
        endDate: formatDate(currentEnd),
        endTime: formatTime(currentEnd),
        appliedStartDate: formatDate(currentStart),
        appliedStartTime: formatTime(currentStart),
        appliedEndDate: formatDate(currentEnd),
        appliedEndTime: formatTime(currentEnd),
      }
    });

    devLog(`[Navigation] Next period: ${formatDate(currentStart)} ${formatTime(currentStart)} to ${formatDate(currentEnd)} ${formatTime(currentEnd)}`);
  }, [appliedStartDate, appliedStartTime, appliedEndDate, appliedEndTime, timeRange, dispatchDateRange]);

  // Get formatted time display for a chart
  const getChartTimeDisplay = (chartType: 'total' | 'residue' | 'organic' | 'anorganic') => {
    const range = getChartTimeRange(chartType);
    const startDateTime = new Date(range.startDate);
    const endDateTime = new Date(range.endDate);

    // Format based on time range type
    switch (timeRange) {
      case 'minute': // Hourly view - show hour range (XX:00 - XX:59)
        return { startTime: range.startTime, endTime: range.endTime };

      case 'fiveMinute': // 5-min view - show hour range
        return { startTime: range.startTime, endTime: range.endTime };

      case 'hourly': // Day view - show full date
        const dayStr = startDateTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        });
        return { startTime: `${dayStr} 00:00`, endTime: '23:59' };

      case 'daily': // Week view - show date range
        const weekStart = startDateTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        });
        const weekEnd = endDateTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        });
        return { startTime: weekStart, endTime: weekEnd };

      case 'weekly': // Month view - show date range
        const monthStart = startDateTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        });
        const monthEnd = endDateTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        });
        return { startTime: monthStart, endTime: monthEnd };

      default:
        const defaultStart = range.startDate.split(' ')[1]?.substring(0, 5) || '00:00';
        const defaultEnd = range.endDate.split(' ')[1]?.substring(0, 5) || '00:59';
        return { startTime: defaultStart, endTime: defaultEnd };
    }
  };

  const handleApplyDateRange = () => {
    // Apply the UI state to the applied state, which will trigger API re-fetch
    setAppliedStartDate(startDate);
    setAppliedStartTime(startTime);
    setAppliedEndDate(endDate);
    setAppliedEndTime(endTime);

    devLog("Date range applied:", {
      startDate,
      startTime,
      endDate,
      endTime
    });
  };

  // Export dropdown state
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = () => {
    setShowExportDropdown(!showExportDropdown);
  };

  const generateCSV = (data: Record<string, unknown>[], devices: Device[]) => {
    // CSV headers
    const headers = ['Date', 'Time', 'Category', 'Device ID', 'Weight (kg)', 'Volume (%)', 'Fill Level', 'Collection Events'];

    // Helper function to determine fill level
    const getFillLevel = (volume: number): string => {
      if (volume >= 90) return 'Overflowing';
      if (volume >= 75) return 'Full';
      if (volume >= 50) return 'High';
      if (volume >= 25) return 'Medium';
      if (volume >= 10) return 'Low';
      return 'Empty';
    };

    // Helper function to detect collection events (significant volume drop)
    const detectCollection = (currentVolume: number, prevVolume: number): string => {
      if (prevVolume - currentVolume > 30) {
        return 'Yes';
      }
      return 'No';
    };

    // Create a map of deviceId to category
    const deviceCategoryMap = new Map<string, string>();
    devices.forEach(device => {
      deviceCategoryMap.set(device.deviceid, device.category);
    });

    // CSV rows
    const rows: string[][] = [];
    const prevVolumeByDevice = new Map<string, number>();

    data.forEach((item) => {
      // Get timestamp from various possible fields
      const timestamp = (item.time_interval || item.analysis_date || item.timestamp || '') as string;

      // Parse timestamp to separate date and time
      let date = '';
      let time = '';

      if (timestamp) {
        // Handle ISO format (2025-11-01T14:30:00) or SQL format (2025-11-01 14:30:00)
        const dateObj = new Date(timestamp);

        if (!isNaN(dateObj.getTime())) {
          // Valid date object - keep in UTC to match database timezone
          const isoString = dateObj.toISOString(); // e.g., "2025-10-05T17:00:00.000Z"
          date = isoString.split('T')[0]; // YYYY-MM-DD
          time = isoString.split('T')[1].split('.')[0]; // HH:MM:SS (remove milliseconds and Z)
        } else {
          // If parsing fails, try to split manually
          if (timestamp.includes('T')) {
            [date, time] = timestamp.split('T');
            time = time.split('.')[0]; // Remove milliseconds if present
          } else if (timestamp.includes(' ')) {
            [date, time] = timestamp.split(' ');
          } else {
            date = timestamp;
            time = '00:00:00';
          }
        }
      }

      const deviceId = (item.deviceid || '-') as string;
      const category = (item.category || deviceCategoryMap.get(deviceId) || 'All') as string;
      const weight = parseFloat((item.avg_weight || item.weight_kg || '0') as string).toFixed(2);
      const volume = parseFloat((item.avg_volume || item.fill_percentage || '0') as string);
      const fillLevel = getFillLevel(volume);

      // Check for collection event
      const prevVolume = prevVolumeByDevice.get(deviceId) || volume;
      const collectionEvent = detectCollection(volume, prevVolume);
      prevVolumeByDevice.set(deviceId, volume);

      rows.push([
        date,
        time,
        category,
        deviceId,
        weight,
        volume.toFixed(2),
        fillLevel,
        collectionEvent
      ]);
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    // Add UTF-8 BOM for better Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPeriod = async (period: 'weekly' | 'monthly' | 'yearly', category: string = 'all') => {
    setShowExportDropdown(false);
    setIsExporting(true);
    setExportStatus('Downloading the CSV...');

    try {
      // Determine days based on period
      const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      setExportStatus('Fetching device information...');
      // Fetch devices for this bin to get category information
      let devices: Device[] = [];
      let targetDeviceId: string | undefined;

      if (trashbinid) {
        const devicesResponse = await apiService.getDevicesByTrashBinId(trashbinid);
        if (devicesResponse.success && devicesResponse.data) {
          devices = devicesResponse.data;

          // Get device ID for specific category if not 'all'
          if (category !== 'all') {
            const targetDevice = devices.find(d =>
              d.category === category ||
              (category === 'Anorganic' && (d.category === 'Inorganic' || d.category === 'Anorganic'))
            );
            targetDeviceId = targetDevice?.deviceid;

            if (!targetDeviceId) {
              setExportStatus(`No ${category} device found`);
              setTimeout(() => {
                setIsExporting(false);
                setExportStatus('');
              }, 3000);
              return;
            }
          }
        }
      }

      // Prepare category parameter for API
      const categoryParam = category === 'all' ? undefined : category;

      setExportStatus('Fetching analytics data...');
      // For yearly exports, use daily data to avoid timeout
      // For weekly/monthly, use hourly data for more detail
      let response;

      if (category === 'all') {
        // Get all categories data
        if (period === 'yearly') {
          response = trashbinid
            ? await apiService.getDailyAnalyticsForBin(trashbinid, days, startDateStr, endDateStr)
            : await apiService.getDailyAnalytics(days, undefined, startDateStr, endDateStr);
        } else {
          response = trashbinid
            ? await apiService.getHourlyIntervalDataForBin(trashbinid, startDateStr, endDateStr)
            : await apiService.getHourlyIntervalData(undefined, undefined, startDateStr, endDateStr);
        }
      } else {
        // Get specific category data using deviceId
        if (period === 'yearly') {
          response = await apiService.getDailyAnalytics(days, categoryParam, startDateStr, endDateStr, targetDeviceId);
        } else {
          response = await apiService.getHourlyIntervalData(targetDeviceId, categoryParam, startDateStr, endDateStr);
        }
      }

      if (response.success && response.data) {
        setExportStatus('Generating CSV file...');

        const csvContent = generateCSV(response.data as unknown as Record<string, unknown>[], devices);
        const categoryLabel = category === 'all' ? 'All' : category;
        const filename = `${trashBinName.replace(/\s+/g, '_')}_${categoryLabel}_${period}_export_${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(csvContent, filename);

        setExportStatus('Download complete!');
        devLog(`Exported ${period} ${categoryLabel} data for ${trashBinName} (${response.data.length} records)`);

        // Clear status after 2 seconds
        setTimeout(() => {
          setIsExporting(false);
          setExportStatus('');
        }, 2000);
      } else {
        setExportStatus('Failed to fetch data');
        setTimeout(() => {
          setIsExporting(false);
          setExportStatus('');
        }, 3000);
      }
    } catch (error) {
      devError('Export error:', error);
      setExportStatus('Export failed. Please try again.');
      setTimeout(() => {
        setIsExporting(false);
        setExportStatus('');
      }, 3000);
    }
  };

  // Bin components data
  // Helper function to get category chart data with correct toggle
  const getResidueChartDataWithToggle = () => {
    // STEP 1: Return empty array to verify data fetching
    return [];

    // Original code commented out for Step 1
    // if (!residueData.residueAnalytics?.length) return [];
    // // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // return residueData.residueAnalytics.map((item: any) => {
    //   const timestamp = item.time_interval || item.analysis_date;
    //   const date = new Date(timestamp);

    //   // Format timestamp for tooltip
    //   let fullTimestamp;
    //   if (timeRange === 'fiveMinute' && item.wib_time_display) {
    //     fullTimestamp = item.wib_time_display;
    //   } else if (timeRange === 'fiveMinute') {
    //     fullTimestamp = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
    //   } else if (timeRange === 'hourly') {
    //     const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    //     fullTimestamp = `${String(wibDate.getUTCHours()).padStart(2, '0')}:${String(wibDate.getUTCMinutes()).padStart(2, '0')}`;
    //   } else {
    //     fullTimestamp = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    //   }

    //   const formatTimestamp = (item: Record<string, unknown>): string => {
    //     const timestamp = (item.time_interval || item.analysis_date) as string;
    //     if (!timestamp) return '';
    //     const date = new Date(timestamp);

    //     if (timeRange === 'fiveMinute') {
    //       if (item.wib_time_display) {
    //         return item.wib_time_display as string;
    //       }
    //       const minutes = date.getUTCMinutes();
    //       const hours = date.getUTCHours();
    //       return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    //     } else if (timeRange === 'hourly') {
    //       const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    //       return wibDate.toLocaleTimeString('en-US', {
    //         hour: '2-digit',
    //         minute: '2-digit',
    //         hour12: false,
    //         timeZone: 'UTC'
    //       });
    //     } else if (timeRange === 'daily') {
    //       return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    //     } else {
    //       return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    //     }
    //   };

    //   return {
    //     time: formatTimestamp(item),
    //     fullTimestamp,
    //     value: residueToggle === "weight" ? item.avg_weight : item.avg_volume
    //   };
    // });
  };

  // Removed duplicate function - now defined above with useCallback

  /* const getOrganicChartDataWithToggle = () => {
    // STEP 3: Process sensor readings for chart
    if (!sensorReadings || sensorReadings.length === 0) {
      devLog('[Organic Chart] No sensor readings available');
      return [];
    }

    devLog(`[Organic Chart] Processing ${sensorReadings.length} sensor readings`);

    // Helper function to calculate volume percentage from 4 sensors
    const calculateVolumePercentage = (topLeft: number, topRight: number, bottomLeft: number, bottomRight: number): number => {
      const BIN_HEIGHT = 60; // cm

      // Calculate average of 4 sensors
      // Example: [49, 48, 37, 7] => 141 / 4 = 35.25
      const sum = topLeft + topRight + bottomLeft + bottomRight;
      const avgDistance = sum / 4;

      // Calculate fill height (distance from sensors to trash)
      // Example: 60 - 35.25 = 24.75
      const fillHeight = BIN_HEIGHT - avgDistance;

      // Calculate percentage
      // Example: (24.75 / 60) * 100 = 41.25%
      const percentage = (fillHeight / BIN_HEIGHT) * 100;

      return Math.max(0, Math.min(100, percentage)); // Clamp between 0-100
    };

    // Process readings (using global calculateVolumePercentage with error handling)
    const processedData = sensorReadings.map(reading => {
      const timestamp = new Date(reading.timestamp);
      const weight = parseFloat(reading.weight);

      // Parse 4 individual sensor readings
      const sensorTL = parseFloat(reading.sensor_top_left);
      const sensorTR = parseFloat(reading.sensor_top_right);
      const sensorBL = parseFloat(reading.sensor_bottom_left);
      const sensorBR = parseFloat(reading.sensor_bottom_right);

      // Calculate volume from 4 sensors (global function handles errors >= 2000)
      const volume = calculateVolumePercentage(sensorTL, sensorTR, sensorBL, sensorBR);

      return {
        id: reading.id,
        timestamp,
        timestampString: reading.timestamp, // Keep original string for debugging
        weight: isNaN(weight) ? 0 : weight,
        volume,
        sensors: {
          topLeft: sensorTL,
          topRight: sensorTR,
          bottomLeft: sensorBL,
          bottomRight: sensorBR
        }
      };
    });

    // Sort by timestamp (oldest first)
    processedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (processedData.length > 0) {
      const first = processedData[0];
      const last = processedData[processedData.length - 1];
      devLog(`[Organic Chart] First reading: ID ${first.id}, ${first.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
      devLog(`[Organic Chart] Last reading: ID ${last.id}, ${last.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
    }

    let chartData: { time: string; fullTimestamp: string; value: number }[] = [];

    if (timeRange === 'fiveMinute') {
      // HOUR VIEW: Show specific hour from Time Period picker
      // Parse the applied start date and time from Time Period picker
      const startDateTime = new Date(`${appliedStartDate}T${appliedStartTime}`);
      const endDateTime = new Date(`${appliedEndDate}T${appliedEndTime}`);

      devLog(`[Organic Chart Hour View] Time Period Selection:`);
      devLog(`  Start: ${appliedStartDate} ${appliedStartTime} => ${startDateTime.toISOString()}`);
      devLog(`  End: ${appliedEndDate} ${appliedEndTime} => ${endDateTime.toISOString()}`);
      devLog(`  Total sensor readings available: ${processedData.length}`);

      // Group by MINUTE, select latest reading per minute
      const groupByMinute: Record<string, typeof processedData[0]> = {};

      processedData.forEach(item => {
        const minuteKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });

        if (!groupByMinute[minuteKey] || item.timestamp > groupByMinute[minuteKey].timestamp) {
          groupByMinute[minuteKey] = item;
        }
      });

      const minuteData = Object.values(groupByMinute).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      devLog(`  Grouped to ${minuteData.length} minute intervals`);
      if (minuteData.length > 0) {
        devLog(`  First minute data: ${minuteData[0].timestamp.toISOString()}`);
        devLog(`  Last minute data: ${minuteData[minuteData.length - 1].timestamp.toISOString()}`);
      }

      // Filter data based on Time Period picker selection
      const filteredData = minuteData.filter(item => {
        const isInRange = item.timestamp >= startDateTime && item.timestamp <= endDateTime;
        return isInRange;
      });

      devLog(`  Filtered to ${filteredData.length} data points within Time Period range`);
      if (filteredData.length > 0) {
        devLog(`  First filtered: ${filteredData[0].timestamp.toISOString()}`);
        devLog(`  Last filtered: ${filteredData[filteredData.length - 1].timestamp.toISOString()}`);
      } else if (hasMoreSensorData && !sensorDataLoading) {
        // No data found in current range, try fetching more historical data
        devLog(`  No data found, fetching more historical data (offset: ${sensorDataOffset})`);
        fetchSensorReadings(sensorDataOffset, true);
      }

      if (filteredData.length > 0) {
        // Extract target hour and date from Time Period picker
        const targetHour = startDateTime.getHours();
        const targetDate = new Date(startDateTime);
        targetDate.setHours(0, 0, 0, 0);

        devLog(`[Organic Chart] Showing data for ${targetDate.toLocaleDateString('en-US')} ${targetHour}:00-${targetHour}:59`);

        // Create a map of existing data by minute
        const dataByMinute = new Map<number, typeof processedData[0]>();
        filteredData.forEach(item => {
          const minute = item.timestamp.getMinutes();
          dataByMinute.set(minute, item);
        });

        // Generate all 60 minutes (0-59) with data or zero values
        chartData = Array.from({ length: 60 }, (_, minute) => {
          const data = dataByMinute.get(minute);

          if (data) {
            // Has data for this minute
            return {
              time: data.timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta'
              }),
              fullTimestamp: `${data.timestamp.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'Asia/Jakarta'
              })} ${data.timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta'
              })} (ID #${data.id})`,
              value: organicToggle === "weight" ? data.weight : data.volume
            };
          } else {
            // No data for this minute, create placeholder with value 0
            const placeholderDate = new Date(targetDate);
            placeholderDate.setHours(targetHour, minute, 0, 0);

            return {
              time: `${String(targetHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
              fullTimestamp: `${targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'Asia/Jakarta'
              })} ${String(targetHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (No data)`,
              value: 0
            };
          }
        });
      }

    } else if (timeRange === 'hourly') {
      // DAY VIEW: Show data from Time Period picker range with 15-minute intervals
      // Parse the applied start date and time from Time Period picker
      const startDateTime = new Date(`${appliedStartDate}T${appliedStartTime}`);
      const endDateTime = new Date(`${appliedEndDate}T${appliedEndTime}`);

      devLog(`[Organic Chart Day View] Time Period Selection - Start: ${startDateTime.toISOString()}, End: ${endDateTime.toISOString()}`);

      // Group by 15-minute intervals, select latest reading per interval
      const groupBy15Min: Record<string, typeof processedData[0]> = {};

      processedData.forEach(item => {
        // Round down to nearest 15-minute interval
        const roundedMinute = Math.floor(item.timestamp.getMinutes() / 15) * 15;
        const intervalKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        }) + `:${String(roundedMinute).padStart(2, '0')}`;

        if (!groupBy15Min[intervalKey] || item.timestamp > groupBy15Min[intervalKey].timestamp) {
          groupBy15Min[intervalKey] = item;
        }
      });

      // Filter data based on Time Period picker selection (compare in UTC)
      const filteredData = Object.values(groupBy15Min).filter(item => {
        return item.timestamp >= startDateTimeUTC && item.timestamp <= endDateTimeUTC;
      });

      devLog(`[Organic Chart Day View] Filtered ${filteredData.length} data points within Time Period range`);

      // Create a map of existing data by hour and 15-minute interval
      const dataByInterval = new Map<string, typeof processedData[0]>();
      filteredData.forEach(item => {
        const hour = item.timestamp.getHours();
        const roundedMinute = Math.floor(item.timestamp.getMinutes() / 15) * 15;
        const key = `${hour}:${String(roundedMinute).padStart(2, '0')}`;
        dataByInterval.set(key, item);
      });

      // Generate all 15-minute intervals for 24 hours (96 intervals: 24 hours * 4)
      const startHour = startDateTime.getHours();
      const endHour = endDateTime.getHours();
      const targetDate = new Date(startDateTime);
      targetDate.setHours(0, 0, 0, 0);

      chartData = [];

      for (let hour = startHour; hour <= endHour; hour++) {
        for (const minute of [0, 15, 30, 45]) {
          const key = `${hour}:${String(minute).padStart(2, '0')}`;
          const data = dataByInterval.get(key);

          if (data) {
            // Has data for this interval
            chartData.push({
              time: data.timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta'
              }),
              fullTimestamp: `${data.timestamp.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'Asia/Jakarta'
              })} ${data.timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta'
              })} (ID #${data.id})`,
              value: organicToggle === "weight" ? data.weight : data.volume
            });
          } else {
            // No data for this interval, create placeholder with value 0
            const placeholderDate = new Date(targetDate);
            placeholderDate.setHours(hour, minute, 0, 0);

            chartData.push({
              time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
              fullTimestamp: `${targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'Asia/Jakarta'
              })} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (No data)`,
              value: 0
            });
          }
        }
      }

      devLog(`[Organic Chart Day View] Generated ${chartData.length} data points with 15-minute intervals`);

    } else if (timeRange === 'daily') {
      // WEEK VIEW: Show data from Time Period picker range with DAILY AGGREGATION
      // Uses accumulated memory logic to handle intra-day pickups
      const startDateTime = new Date(`${appliedStartDate}T${appliedStartTime}`);
      const endDateTime = new Date(`${appliedEndDate}T${appliedEndTime}`);

      devLog(`[Organic Chart Week View] Time Period Selection - Start: ${startDateTime.toISOString()}, End: ${endDateTime.toISOString()}`);

      // Group ALL readings by date (YYYY-MM-DD)
      const readingsByDate: Record<string, typeof processedData> = {};

      processedData.forEach(item => {
        const dateKey = item.timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Jakarta'
        });

        if (!readingsByDate[dateKey]) {
          readingsByDate[dateKey] = [];
        }
        readingsByDate[dateKey].push(item);
      });

      devLog(`[Organic Chart Week View] Grouped into ${Object.keys(readingsByDate).length} days`);

      // Calculate daily totals using accumulated memory logic
      const dailyTotals: Array<{ date: string; timestamp: Date; totalWaste: number }> = [];

      Object.entries(readingsByDate).forEach(([dateKey, dayReadings]) => {
        // Check if this date is within our range
        const firstReading = dayReadings[0];
        if (firstReading.timestamp < startDateTime || firstReading.timestamp > endDateTime) {
          return; // Skip dates outside range
        }

        // Apply intra-day accumulated memory algorithm
        const metric = organicToggle === "weight" ? "weight" : "volume";
        const totalWaste = calculateIntraDayAccumulation(dayReadings, metric);

        dailyTotals.push({
          date: dateKey,
          timestamp: firstReading.timestamp,
          totalWaste
        });

        devLog(`  [Week View] ${dateKey}: ${dayReadings.length} readings → ${totalWaste.toFixed(2)} ${metric} generated`);
      });

      // Sort by date
      dailyTotals.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      devLog(`[Organic Chart Week View] Generated ${dailyTotals.length} daily data points`);

      // Convert to chart format
      chartData = dailyTotals.map(day => ({
        time: day.timestamp.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        }),
        fullTimestamp: `${day.date} - Total: ${day.totalWaste.toFixed(2)} ${organicToggle === "weight" ? "kg" : "%"}`,
        value: day.totalWaste
      }));

    } else if (timeRange === 'weekly') {
      // MONTH VIEW: Show data from Time Period picker range with DAILY AGGREGATION
      // Uses accumulated memory logic to handle intra-day pickups
      const startDateTime = new Date(`${appliedStartDate}T${appliedStartTime}`);
      const endDateTime = new Date(`${appliedEndDate}T${appliedEndTime}`);

      devLog(`[Organic Chart Month View] Time Period Selection - Start: ${startDateTime.toISOString()}, End: ${endDateTime.toISOString()}`);

      // Group ALL readings by date (YYYY-MM-DD)
      const readingsByDate: Record<string, typeof processedData> = {};

      processedData.forEach(item => {
        const dateKey = item.timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Jakarta'
        });

        if (!readingsByDate[dateKey]) {
          readingsByDate[dateKey] = [];
        }
        readingsByDate[dateKey].push(item);
      });

      devLog(`[Organic Chart Month View] Grouped into ${Object.keys(readingsByDate).length} days`);

      // Calculate daily totals using accumulated memory logic
      const dailyTotals: Array<{ date: string; timestamp: Date; totalWaste: number }> = [];

      Object.entries(readingsByDate).forEach(([dateKey, dayReadings]) => {
        // Check if this date is within our range
        const firstReading = dayReadings[0];
        if (firstReading.timestamp < startDateTime || firstReading.timestamp > endDateTime) {
          return; // Skip dates outside range
        }

        // Apply intra-day accumulated memory algorithm
        const metric = organicToggle === "weight" ? "weight" : "volume";
        const totalWaste = calculateIntraDayAccumulation(dayReadings, metric);

        dailyTotals.push({
          date: dateKey,
          timestamp: firstReading.timestamp,
          totalWaste
        });

        devLog(`  [Month View] ${dateKey}: ${dayReadings.length} readings → ${totalWaste.toFixed(2)} ${metric} generated`);
      });

      // Sort by date
      dailyTotals.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      devLog(`[Organic Chart Month View] Generated ${dailyTotals.length} daily data points`);

      // Convert to chart format
      chartData = dailyTotals.map(day => ({
        time: day.timestamp.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        }),
        fullTimestamp: `${day.date} - Total: ${day.totalWaste.toFixed(2)} ${organicToggle === "weight" ? "kg" : "%"}`,
        value: day.totalWaste
      }));
    }

    return chartData;
  }; */

  // STEP 3: Calculate current organic values from latest sensor reading
  const getCurrentOrganicData = () => {
    if (!sensorReadings || sensorReadings.length === 0) {
      return { weight: 0, volume: 0 };
    }

    // Get the latest reading
    const latestReading = sensorReadings[sensorReadings.length - 1];
    const weight = parseFloat(latestReading.weight);

    // Parse 4 individual sensor readings
    const sensorTL = parseFloat(latestReading.sensor_top_left);
    const sensorTR = parseFloat(latestReading.sensor_top_right);
    const sensorBL = parseFloat(latestReading.sensor_bottom_left);
    const sensorBR = parseFloat(latestReading.sensor_bottom_right);

    // Calculate volume percentage using helper function with error handling
    const volumePercentage = calculateVolumePercentage(sensorTL, sensorTR, sensorBL, sensorBR);

    return {
      weight: isNaN(weight) ? 0 : weight.toFixed(2),
      volume: volumePercentage.toFixed(1)
    };
  };

  const getCurrentAnorganicData = () => {
    if (!anorganicSensorReadings || anorganicSensorReadings.length === 0) {
      return { weight: 0, volume: 0 };
    }

    // Get the latest reading
    const latestReading = anorganicSensorReadings[anorganicSensorReadings.length - 1];
    const weight = parseFloat(latestReading.weight);

    // Parse 4 individual sensor readings
    const sensorTL = parseFloat(latestReading.sensor_top_left);
    const sensorTR = parseFloat(latestReading.sensor_top_right);
    const sensorBL = parseFloat(latestReading.sensor_bottom_left);
    const sensorBR = parseFloat(latestReading.sensor_bottom_right);

    // Calculate volume percentage using helper function with error handling
    const volumePercentage = calculateVolumePercentage(sensorTL, sensorTR, sensorBL, sensorBR);

    return {
      weight: isNaN(weight) ? 0 : weight.toFixed(2),
      volume: volumePercentage.toFixed(1)
    };
  };

  // Calculate current totals from sensor readings (Organic + Anorganic)
  const getCurrentTotalsFromSensors = () => {
    const organicData = getCurrentOrganicData();
    const anorganicData = getCurrentAnorganicData();

    // Weight: Sum of Organic + Anorganic (in kg, convert to grams for display)
    const totalWeight = (parseFloat(String(organicData.weight)) + parseFloat(String(anorganicData.weight)));

    // Volume: Average of Organic + Anorganic (to keep max at 100%)
    const totalVolume = (parseFloat(String(organicData.volume)) + parseFloat(String(anorganicData.volume))) / 2;

    return {
      weight: (totalWeight * 1000).toFixed(1), // Convert kg to grams
      volume: totalVolume.toFixed(1)
    };
  };

  // Calculate status based on volume percentage with 20% gaps
  const getStatusFromVolume = (volumePercentage: number): string => {
    if (volumePercentage >= 81) return 'Penuh'; // 81-100%
    if (volumePercentage >= 61) return 'Hampir Penuh'; // 61-80%
    if (volumePercentage >= 41) return 'Menengah'; // 41-60%
    if (volumePercentage >= 21) return 'Rendah'; // 21-40%
    return 'Kosong'; // 0-20%
  };

  // Get Donut Chart data (Weight composition) from sensor readings
  const getDonutDataFromSensors = () => {
    const organicData = getCurrentOrganicData();
    const anorganicData = getCurrentAnorganicData();

    // Convert kg to grams and return as numbers for the chart
    const organicWeight = parseFloat(String(organicData.weight)) * 1000; // kg to grams
    const anorganicWeight = parseFloat(String(anorganicData.weight)) * 1000; // kg to grams

    return [
      { name: "Organic", value: Math.round(organicWeight * 10) / 10, color: "#22c55e" },
      { name: "Anorganic", value: Math.round(anorganicWeight * 10) / 10, color: "#eab308" },
    ];
  };

  // Get Volume Bar Chart data from sensor readings
  const getVolumeBarDataFromSensors = () => {
    const organicData = getCurrentOrganicData();
    const anorganicData = getCurrentAnorganicData();

    const organicVolume = parseFloat(String(organicData.volume));
    const anorganicVolume = parseFloat(String(anorganicData.volume));

    return [
      { name: "Organic", value: Math.round(organicVolume * 10) / 10, color: "#22c55e" },
      { name: "Anorganic", value: Math.round(anorganicVolume * 10) / 10, color: "#eab308" },
    ];
  };

  const getAnorganicChartDataWithToggle = React.useCallback(() => {
    // Process anorganic sensor readings for chart
    if (!anorganicSensorReadings || anorganicSensorReadings.length === 0) {
      devLog('[Anorganic Chart] No sensor readings available');
      return [];
    }

    devLog(`[Anorganic Chart] Processing ${anorganicSensorReadings.length} sensor readings`);

    // Helper function to calculate volume percentage from 4 sensors
    const calculateVolumePercentage = (topLeft: number, topRight: number, bottomLeft: number, bottomRight: number): number => {
      const BIN_HEIGHT = 60; // cm
      const sum = topLeft + topRight + bottomLeft + bottomRight;
      const avgDistance = sum / 4;
      const fillHeight = BIN_HEIGHT - avgDistance;
      const percentage = (fillHeight / BIN_HEIGHT) * 100;
      return Math.max(0, Math.min(100, percentage));
    };

    // Process readings
    const processedData = anorganicSensorReadings.map(reading => {
      const timestamp = new Date(reading.timestamp);
      const weight = parseFloat(reading.weight);

      // Parse 4 individual sensor readings
      const sensorTL = parseFloat(reading.sensor_top_left);
      const sensorTR = parseFloat(reading.sensor_top_right);
      const sensorBL = parseFloat(reading.sensor_bottom_left);
      const sensorBR = parseFloat(reading.sensor_bottom_right);

      // Calculate volume from 4 sensors
      const volume = (!isNaN(sensorTL) && !isNaN(sensorTR) && !isNaN(sensorBL) && !isNaN(sensorBR))
        ? calculateVolumePercentage(sensorTL, sensorTR, sensorBL, sensorBR)
        : 0;

      return {
        id: reading.id,
        timestamp,
        timestampString: reading.timestamp,
        weight: isNaN(weight) ? 0 : weight,
        volume,
        sensors: {
          topLeft: sensorTL,
          topRight: sensorTR,
          bottomLeft: sensorBL,
          bottomRight: sensorBR
        }
      };
    });

    // Sort by timestamp (oldest first)
    processedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let chartData: { time: string; fullTimestamp: string; value: number }[] = [];

    if (timeRange === 'minute') {
      // HOURLY VIEW: Show data from current hour with 60 minute intervals (XX:00-XX:59)
      const [startYear, startMonth, startDay] = appliedStartDate.split('-').map(Number);
      const [startHourInput, startMinuteInput] = appliedStartTime.split(':').map(Number);
      const [endYear, endMonth, endDay] = appliedEndDate.split('-').map(Number);
      const [endHourInput, endMinuteInput] = appliedEndTime.split(':').map(Number);

      // Create UTC dates by subtracting 7 hours from Jakarta time
      const startDateTimeUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, startHourInput - 7, startMinuteInput));
      const endDateTimeUTC = new Date(Date.UTC(endYear, endMonth - 1, endDay, endHourInput - 7, endMinuteInput));

      devLog(`[Anorganic Chart Hourly View] Time Period Selection - Start: ${startDateTimeUTC.toISOString()}, End: ${endDateTimeUTC.toISOString()}`);

      // Group by minute, select latest reading per minute
      const groupByMinute: Record<string, typeof processedData[0]> = {};

      processedData.forEach(item => {
        const intervalKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });

        if (!groupByMinute[intervalKey] || item.timestamp > groupByMinute[intervalKey].timestamp) {
          groupByMinute[intervalKey] = item;
        }
      });

      // Filter data based on Time Period picker selection (compare in UTC)
      const filteredData = Object.values(groupByMinute).filter(item => {
        return item.timestamp >= startDateTimeUTC && item.timestamp <= endDateTimeUTC;
      });

      devLog(`[Anorganic Chart Hourly View] Filtered ${filteredData.length} data points within Time Period range`);

      // Create a map of existing data by minute
      const dataByMinute = new Map<string, typeof processedData[0]>();
      filteredData.forEach(item => {
        const jakartaTimeStr = item.timestamp.toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });
        const key = jakartaTimeStr;

        if (!dataByMinute.has(key) || item.timestamp > dataByMinute.get(key)!.timestamp) {
          dataByMinute.set(key, item);
        }
      });

      // Generate all 60 minutes for the hour (0-59)
      const targetHour = startHourInput;
      chartData = [];

      for (let minute = 0; minute < 60; minute++) {
        const key = `${String(targetHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const data = dataByMinute.get(key);

        if (data) {
          // Has data for this minute
          chartData.push({
            time: data.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Jakarta'
            }),
            fullTimestamp: `${data.timestamp.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: 'Asia/Jakarta'
            })} ${data.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
              timeZone: 'Asia/Jakarta'
            })} (ID #${data.id})`,
            value: anorganicToggle === "weight" ? data.weight : data.volume
          });
        } else {
          // No data for this minute, create placeholder with value 0
          chartData.push({
            time: `${String(targetHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            fullTimestamp: `${appliedStartDate} ${String(targetHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (No data)`,
            value: 0
          });
        }
      }

      devLog(`[Anorganic Chart Hourly View] Generated ${chartData.length} data points with 1-minute intervals`);

    } else if (timeRange === 'hourly') {
      // DAY VIEW: Show data from Time Period picker range with 15-minute intervals
      // Parse the applied start/end dates as Asia/Jakarta timezone and convert to UTC for filtering

      // The input dates are in format "2025-11-19" and times "00:00", "23:59"
      // We need to interpret them as Jakarta time and convert to UTC for filtering
      const [startYear, startMonth, startDay] = appliedStartDate.split('-').map(Number);
      const [startHourInput, startMinuteInput] = appliedStartTime.split(':').map(Number);
      const [endYear, endMonth, endDay] = appliedEndDate.split('-').map(Number);
      const [endHourInput, endMinuteInput] = appliedEndTime.split(':').map(Number);

      // Create UTC dates by subtracting 7 hours from Jakarta time
      // (Jakarta is UTC+7, so Jakarta midnight = 17:00 previous day UTC)
      const startDateTimeUTC = new Date(Date.UTC(startYear, startMonth - 1, startDay, startHourInput - 7, startMinuteInput));
      const endDateTimeUTC = new Date(Date.UTC(endYear, endMonth - 1, endDay, endHourInput - 7, endMinuteInput));

      // Also create Jakarta timezone date objects for display purposes
      const startDateTime = new Date(`${appliedStartDate}T${appliedStartTime}`);
      const endDateTime = new Date(`${appliedEndDate}T${appliedEndTime}`);

      devLog(`[Anorganic Chart Day View] Time Period Selection - Start: ${startDateTimeUTC.toISOString()}, End: ${endDateTimeUTC.toISOString()}`);

      // Group by 15-minute intervals, select latest reading per interval
      const groupBy15Min: Record<string, typeof processedData[0]> = {};

      processedData.forEach(item => {
        // Round down to nearest 15-minute interval
        const roundedMinute = Math.floor(item.timestamp.getMinutes() / 15) * 15;
        const intervalKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        }) + `:${String(roundedMinute).padStart(2, '0')}`;

        if (!groupBy15Min[intervalKey] || item.timestamp > groupBy15Min[intervalKey].timestamp) {
          groupBy15Min[intervalKey] = item;
        }
      });

      // Filter data based on Time Period picker selection (compare in UTC)
      const filteredData = Object.values(groupBy15Min).filter(item => {
        return item.timestamp >= startDateTimeUTC && item.timestamp <= endDateTimeUTC;
      });

      devLog(`[Anorganic Chart Day View] Filtered ${filteredData.length} data points within Time Period range`);

      // Create a map of existing data by hour and 15-minute interval using Asia/Jakarta timezone
      const dataByInterval = new Map<string, typeof processedData[0]>();
      filteredData.forEach(item => {
        // Use Asia/Jakarta timezone to extract hour and minute consistently
        const jakartaTimeStr = item.timestamp.toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });
        const [hourStr, minuteStr] = jakartaTimeStr.split(':');
        const minute = parseInt(minuteStr, 10);
        const roundedMinute = Math.floor(minute / 15) * 15;
        const key = `${hourStr}:${String(roundedMinute).padStart(2, '0')}`;

        if (!dataByInterval.has(key) || item.timestamp > dataByInterval.get(key)!.timestamp) {
          dataByInterval.set(key, item);
        }
      });

      // Generate all 15-minute intervals for 24 hours (96 intervals: 24 hours * 4)
      // Use Jakarta timezone to extract the hour values from the applied times
      const startHour = startHourInput; // Use the input hour directly (already in Jakarta time)
      const endHour = endHourInput;

      // Create a date object for display purposes using Jakarta date
      const targetDate = new Date(`${appliedStartDate}T00:00:00`);
      targetDate.setHours(0, 0, 0, 0);

      chartData = [];

      for (let hour = startHour; hour <= endHour; hour++) {
        for (const minute of [0, 15, 30, 45]) {
          const key = `${hour}:${String(minute).padStart(2, '0')}`;
          const data = dataByInterval.get(key);

          if (data) {
            // Has data for this interval
            chartData.push({
              time: data.timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta'
              }),
              fullTimestamp: `${data.timestamp.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'Asia/Jakarta'
              })} ${data.timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Jakarta'
              })} (ID #${data.id})`,
              value: anorganicToggle === "weight" ? data.weight : data.volume
            });
          } else {
            // No data for this interval, create placeholder with value 0
            const placeholderDate = new Date(targetDate);
            placeholderDate.setHours(hour, minute, 0, 0);

            chartData.push({
              time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
              fullTimestamp: `${targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'Asia/Jakarta'
              })} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (No data)`,
              value: 0
            });
          }
        }
      }

      devLog(`[Anorganic Chart Day View] Generated ${chartData.length} data points with 15-minute intervals`);
    }
    // For other time ranges (daily/weekly), return empty for now
    // TODO: Implement other time range views if needed

    return chartData;
  }, [anorganicSensorReadings, appliedStartDate, appliedEndDate, appliedStartTime, appliedEndTime, anorganicToggle, timeRange]);

    // Original code commented out for Step 1
    // if (!anorganicData.anorganicAnalytics?.length) return [];
    // // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // return anorganicData.anorganicAnalytics.map((item: any) => {
    //   const timestamp = item.time_interval || item.analysis_date;
    //   const date = new Date(timestamp);

    //   let fullTimestamp;
    //   if (timeRange === 'fiveMinute' && item.wib_time_display) {
    //     fullTimestamp = item.wib_time_display;
    //   } else if (timeRange === 'fiveMinute') {
    //     fullTimestamp = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
    //   } else if (timeRange === 'hourly') {
    //     const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    //     fullTimestamp = `${String(wibDate.getUTCHours()).padStart(2, '0')}:${String(wibDate.getUTCMinutes()).padStart(2, '0')}`;
    //   } else {
    //     fullTimestamp = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    //   }

    //   const formatTimestamp = (item: Record<string, unknown>): string => {
    //     const timestamp = (item.time_interval || item.analysis_date) as string;
    //     if (!timestamp) return '';
    //     const date = new Date(timestamp);

    //     if (timeRange === 'fiveMinute') {
    //       if (item.wib_time_display) {
    //         return item.wib_time_display as string;
    //       }
    //       const minutes = date.getUTCMinutes();
    //       const hours = date.getUTCHours();
    //       return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    //     } else if (timeRange === 'hourly') {
    //       const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    //       return wibDate.toLocaleTimeString('en-US', {
    //         hour: '2-digit',
    //         minute: '2-digit',
    //         hour12: false,
    //         timeZone: 'UTC'
    //       });
    //     } else if (timeRange === 'daily') {
    //       return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    //     } else {
    //       return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    //     }
    //   };

    //   return {
    //     time: formatTimestamp(item),
    //     fullTimestamp,
    //     value: anorganicToggle === "weight" ? item.avg_weight : item.avg_volume
    //   };
    // });

  // Memoize anorganic chart data
  const anorganicChartData = React.useMemo(() => {
    return getAnorganicChartDataWithToggle();
  }, [getAnorganicChartDataWithToggle]);

  const binComponentsData = [
    {
      id: 'residue',
      chartType: 'residue' as const,
      title: 'Residue',
      colorTheme: 'red',
      bgColor: 'bg-gradient-to-br from-red-500 to-red-600',
      toggle: residueToggle,
      setToggle: setResidueToggle,
      chartData: getResidueChartDataWithToggle(),
      currentData: currentSpecific.residue,
      titleColor: 'text-red-600',
      cardBg: 'bg-red-50',
      borderColor: 'border-red-200',
      valueColor: 'text-red-600',
      isAlert: currentSpecific.residue.volume > 80,
    },
    {
      id: 'organic',
      chartType: 'organic' as const,
      title: 'Organic',
      colorTheme: 'green',
      bgColor: 'bg-gradient-to-br from-green-500 to-green-600',
      toggle: organicToggle,
      setToggle: setOrganicToggle,
      chartData: organicChartData,
      currentData: getCurrentOrganicData(), // STEP 3: Use real sensor data
      titleColor: 'text-green-600',
      cardBg: 'bg-green-50',
      borderColor: 'border-green-200',
      valueColor: 'text-green-600',
      isAlert: parseFloat(getCurrentOrganicData().volume.toString()) > 80, // STEP 3: Use calculated volume
    },
    {
      id: 'anorganic',
      chartType: 'anorganic' as const,
      title: 'Anorganic',
      colorTheme: 'yellow',
      bgColor: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      toggle: anorganicToggle,
      setToggle: setAnorganicToggle,
      chartData: anorganicChartData,
      currentData: getCurrentAnorganicData(),
      titleColor: 'text-yellow-600',
      cardBg: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      valueColor: 'text-yellow-600',
      isAlert: currentSpecific.anorganic.volume > 80,
    },
  ];

  // Render bin component
  const renderBinComponent = (binData: typeof binComponentsData[0]) => (
    <div
      key={binData.id}
      className={`bg-white p-3 rounded-lg shadow-sm relative ${
        binData.isAlert ? "ring-2 ring-red-500" : ""
      }`}
    >
      {binData.isAlert && (
        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm animate-pulse">
          <AlertCircle className="w-3 h-3" />
          Full!
        </div>
      )}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-bold ${binData.titleColor}`}>{binData.title}</h3>
          <span className="text-xs text-gray-600 font-semibold bg-gray-50 px-2 py-0.5 rounded">
            {getChartTimeDisplay(binData.chartType).startTime} - {getChartTimeDisplay(binData.chartType).endTime}
          </span>
        </div>
        <ToggleButton
          value={binData.toggle}
          onChange={binData.setToggle}
          size="small"
          colorTheme={binData.colorTheme}
        />
      </div>
      <div className="space-y-2">
        <div>
          <ChartComponent
            data={binData.chartData}
            bgColor={binData.bgColor}
            height={120}
            yAxisDomain={binData.toggle === "volume" ? [0, 100] : undefined}
            valueUnit={binData.toggle === "volume" ? "%" : undefined}
          />

          <div className="flex justify-center items-center gap-3 mt-2">
            {/* Left Arrow */}
            <button
              onClick={() => handlePreviousPeriod(binData.chartType)}
              className="bg-white hover:bg-gray-50 shadow-sm rounded-full p-1.5 transition-all hover:scale-110 border border-gray-200"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>

            {/* Right Arrow */}
            <button
              onClick={() => handleNextPeriod(binData.chartType)}
              className="bg-white hover:bg-gray-50 shadow-sm rounded-full p-1.5 transition-all hover:scale-110 border border-gray-200"
              aria-label="Next period"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1">
          <div className={`text-center ${binData.cardBg} p-2 rounded`}>
            <p className="text-xs font-medium text-gray-800 mb-1">Weight</p>
            <p className={`text-sm font-bold ${binData.isAlert ? "text-red-600" : "text-black"}`}>{binData.currentData.weight}</p>
            <p className="text-xs text-gray-600">grams</p>
          </div>
          <div className={`text-center ${binData.cardBg} p-2 rounded`}>
            <p className="text-xs font-medium text-gray-800 mb-1">Volume</p>
            <p className={`text-sm font-bold ${binData.isAlert ? "text-red-600" : "text-black"}`}>
              {binData.currentData.volume}%
            </p>
            <p className="text-xs text-gray-600">capacity</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Prevent hydration mismatch by showing loading state during SSR
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
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
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
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-2 sm:p-4 overflow-auto">
      {/* Export Loading Alert */}
      {isExporting && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slideIn">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          <span className="font-medium">{exportStatus}</span>
        </div>
      )}

      <div className="max-w-full mx-auto flex flex-col gap-2 sm:gap-4">
        {/* Clean Header */}
        <div className="bg-white p-2 sm:p-3 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            {/* Left: Back Button + Title + Battery */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => router.push('/monitoring')}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                aria-label="Back to monitoring"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">Back</span>
              </button>
              <div className="group relative inline-block">
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 cursor-pointer">
                  {trashBinName}
                </h1>
                {/* Export button on hover - slides down */}
                <div ref={exportDropdownRef} className="absolute top-full left-0 mt-1 pointer-events-none group-hover:pointer-events-auto">
                  <button
                    onClick={handleExport}
                    className="opacity-0 group-hover:opacity-100 bg-blue-500 text-white px-3 py-1 rounded text-xs transition-all duration-200 whitespace-nowrap transform -translate-y-2 group-hover:translate-y-0 shadow-md hover:bg-blue-600 flex items-center gap-1 pointer-events-auto"
                  >
                    <Download className="w-3 h-3" />
                    Export
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Export dropdown menu */}
                  {showExportDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[280px] pointer-events-auto">
                      {/* All Data Section */}
                      <div className="px-3 py-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">All Categories</p>
                        <div className="space-y-1">
                          <button
                            onClick={() => handleExportPeriod('weekly', 'all')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Weekly CSV
                          </button>
                          <button
                            onClick={() => handleExportPeriod('monthly', 'all')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Monthly CSV
                          </button>
                          <button
                            onClick={() => handleExportPeriod('yearly', 'all')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Yearly CSV
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Organic Section */}
                      <div className="px-3 py-1">
                        <p className="text-xs font-semibold text-green-600 uppercase mb-1">Organic</p>
                        <div className="space-y-1">
                          <button
                            onClick={() => handleExportPeriod('weekly', 'Organic')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Weekly CSV
                          </button>
                          <button
                            onClick={() => handleExportPeriod('monthly', 'Organic')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Monthly CSV
                          </button>
                          <button
                            onClick={() => handleExportPeriod('yearly', 'Organic')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Yearly CSV
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Anorganic Section */}
                      <div className="px-3 py-1">
                        <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Anorganic</p>
                        <div className="space-y-1">
                          <button
                            onClick={() => handleExportPeriod('weekly', 'Anorganic')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Weekly CSV
                          </button>
                          <button
                            onClick={() => handleExportPeriod('monthly', 'Anorganic')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Monthly CSV
                          </button>
                          <button
                            onClick={() => handleExportPeriod('yearly', 'Anorganic')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Yearly CSV
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* Residue Section */}
                      <div className="px-3 py-1">
                        <p className="text-xs font-semibold text-red-600 uppercase mb-1">Residue</p>
                        <div className="space-y-1">
                          <button
                            onClick={() => handleExportPeriod('weekly', 'Residue')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Weekly CSV
                          </button>
                          <button
                            onClick={() => handleExportPeriod('monthly', 'Residue')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Monthly CSV
                          </button>
                          <button
                            onClick={() => handleExportPeriod('yearly', 'Residue')}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2 rounded"
                          >
                            <Download className="w-3 h-3" />
                            Yearly CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">{batteryPercentage}%</span>
              </div>
            </div>

            {/* Right: REAL DATA badge - clickable to switch to dummy data view */}
            <div>
              <button
                onClick={() => router.push(`/${binSlug}`)}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold transition-all shadow-sm hover:shadow-md transform hover:scale-105"
                aria-label="Switch to dummy data view"
              >
                REAL DATA
              </button>
            </div>
          </div>
        </div>

        {/* Row 1: Current Status + Composition (Current Info) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4">
          {/* Current Status */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 sm:p-3 rounded-lg shadow-sm h-48">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-blue-800 flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Current Status
              </h3>
              <button
                onClick={() => router.push(`/condition/${binSlug}`)}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm hover:shadow-md transform hover:scale-105"
              >
                Condition
              </button>
            </div>
            <div className="space-y-2">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">Status</span>
                </div>
                <p className="text-sm text-gray-800 font-medium">
                  {(() => {
                    const totals = getCurrentTotalsFromSensors();
                    return getStatusFromVolume(parseFloat(totals.volume));
                  })()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg text-white text-center">
                  <h4 className="font-medium text-blue-100 text-xs">Weight</h4>
                  <p className="text-lg font-bold">{getCurrentTotalsFromSensors().weight}</p>
                  <p className="text-blue-200 text-xs">grams</p>
                </div>

                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-2 rounded-lg text-white text-center">
                  <h4 className="font-medium text-indigo-100 text-xs">Volume</h4>
                  <p className="text-lg font-bold">{getCurrentTotalsFromSensors().volume}%</p>
                  <p className="text-indigo-200 text-xs">capacity</p>
                </div>
              </div>
            </div>
          </div>

          {/* Composition */}
          <div className="bg-white p-2 sm:p-3 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-bold text-gray-800">Composition</h3>
              <ToggleButton
                value={compositionToggle}
                onChange={setCompositionToggle}
                size="small"
              />
            </div>

            <div className="h-48"> {/* Increased height for bigger donut chart */}
              {compositionToggle === "weight" ? (
                // Weight - Donut Chart with Organic/Anorganic split
                <div className="grid grid-cols-2 gap-3 items-start h-full">
                  <div className="space-y-1 pt-2">
                    {getDonutDataFromSensors().map((item, index) => (
                      <div
                        key={item.name}
                        className={`flex items-start justify-between p-1 rounded cursor-pointer transition-all ${
                          selectedSlice === index ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedSlice(index)}
                      >
                        <div className="flex items-start gap-1">
                          <div
                            className="w-2 h-2 rounded-full mt-0.5"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs font-medium text-gray-800">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: item.color }}>
                          {item.value}g
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center items-center h-full">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={getDonutDataFromSensors()}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={80}
                          dataKey="value"
                          onMouseEnter={(_, index) => setSelectedSlice(index)}
                          onMouseLeave={() => setSelectedSlice(null)}
                        >
                          {getDonutDataFromSensors().map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke="none"
                              strokeWidth={0}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `${value}g`}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '2px solid #3b82f6',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                // Volume - Bar Chart with Organic/Anorganic split
                <div className="h-full">
                  <BarChart
                    data={getVolumeBarDataFromSensors()}
                    selectedIndex={selectedSlice}
                    onBarHover={setSelectedSlice}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Time Period + Total Monitoring (Analytics) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 sm:gap-4">
          {/* Time Period */}
          <div className="lg:col-span-2">
            <TimePeriod
              startDate={startDate}
              startTime={startTime}
              endDate={endDate}
              endTime={endTime}
              timeRange={timeRange}
              onStartDateChange={setStartDate}
              onStartTimeChange={setStartTime}
              onEndDateChange={setEndDate}
              onEndTimeChange={setEndTime}
              onTimeRangeChange={handleTimeRangeChange}
              onApply={handleApplyDateRange}
              excludeRanges={['fiveMinute']}
            />
          </div>

          {/* Total Monitoring */}
          <div className="lg:col-span-3 bg-white p-2 sm:p-3 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-800">Total Monitoring</h3>
                <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                  {getChartTimeDisplay('total').startTime} - {getChartTimeDisplay('total').endTime}
                </span>
              </div>
              <ToggleButton
                value={totalToggle}
                onChange={setTotalToggle}
                size="small"
                colorTheme="blue"
              />
            </div>

            {/* Chart with navigation arrows for all time ranges */}
            <div className="relative">
              <ChartComponent
                data={getTotalChartData()}
                bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
                height={180}
                yAxisDomain={totalToggle === "volume" ? [0, 100] : undefined}
                valueUnit={totalToggle === "volume" ? "%" : undefined}
              />

              <div className="flex justify-center items-center gap-4 mt-2">
                {/* Left Arrow */}
                <button
                  onClick={() => handlePreviousPeriod('total')}
                  className="bg-white hover:bg-blue-50 shadow-md rounded-full p-2 transition-all hover:scale-110 border border-blue-200"
                  aria-label="Previous period"
                >
                  <ChevronLeft className="w-5 h-5 text-blue-600" />
                </button>

                {/* Right Arrow */}
                <button
                  onClick={() => handleNextPeriod('total')}
                  className="bg-white hover:bg-blue-50 shadow-md rounded-full p-2 transition-all hover:scale-110 border border-blue-200"
                  aria-label="Next period"
                >
                  <ChevronRight className="w-5 h-5 text-blue-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3rd Row: Bin Categories */}
        {/* Desktop View */}
        <div className="hidden lg:grid grid-cols-3 gap-2 sm:gap-4">
          {binComponentsData.map(renderBinComponent)}
        </div>

        {/* Mobile Carousel View */}
        <div className="lg:hidden">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-gray-800">Bin Categories</h3>
            <div className="flex gap-1">
              {binComponentsData.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBinIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentBinIndex === index ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <TouchCarousel
            currentIndex={currentBinIndex}
            onIndexChange={setCurrentBinIndex}
          >
            {binComponentsData.map(renderBinComponent)}
          </TouchCarousel>
          
          {/* Navigation Arrows */}
          <div className="flex justify-between mt-3">
            <button
              onClick={() => setCurrentBinIndex(Math.max(0, currentBinIndex - 1))}
              disabled={currentBinIndex === 0}
              className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentBinIndex(Math.min(binComponentsData.length - 1, currentBinIndex + 1))}
              disabled={currentBinIndex === binComponentsData.length - 1}
              className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Alert Notification - Only show if any category in THIS bin is > 80% */}
        {(currentSpecific.residue.volume > 80 ||
          currentSpecific.organic.volume > 80 ||
          currentSpecific.anorganic.volume > 80) && (
          <div className="fixed top-3 right-3 bg-gradient-to-r from-red-500 to-red-600 text-white p-4 sm:p-5 rounded-xl shadow-2xl flex items-center gap-3 animate-pulse border-2 border-red-400 z-50">
            <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="font-bold text-base sm:text-lg">Alert: Bin is full!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealDataDashboard;
