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
import { getDefaultDateRange, combineDateAndTime, getTimeRangeDate } from '../utils/dateUtils';
import { apiService, Device } from '../services/api';

interface RealDataDashboardProps {
  binSlug?: string; // URL slug for the bin (e.g., "kantinlt1")
}

// STEP 3: Map bin slug to location name for sensor readings
const binSlugToLocationMapping: Record<string, string> = {
  'kantinlt1': 'KantinSGLC',
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

const RealDataDashboard: React.FC<RealDataDashboardProps> = ({ binSlug = 'kantinlt1' }) => {
  const router = useRouter();

  // Track if component is mounted to prevent hydration issues
  const [isMounted, setIsMounted] = useState(false);

  // Get trashbinid from slug for API calls
  const trashbinid = binSlugToIdMapping[binSlug.toLowerCase()];

  // STEP 3: State for sensor readings
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [sensorDataLoading, setSensorDataLoading] = useState(false);

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
        console.error('Error fetching bin data:', error);
        setTrashBinName('Error loading bin');
        setCondition('Unknown');
      }
    };

    fetchBinData();
  }, [trashbinid, binSlug]);

  // STEP 3: Fetch sensor readings from backend
  React.useEffect(() => {
    const fetchSensorReadings = async () => {
      const location = binSlugToLocationMapping[binSlug.toLowerCase()];
      if (!location) {
        console.warn('No location mapping found for binSlug:', binSlug);
        return;
      }

      setSensorDataLoading(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        // Fetch sensor readings for specific location and bin type
        const response = await fetch(`${API_URL}/api/sensors/readings/${location}?binType=organic&limit=1000`);

        if (!response.ok) {
          throw new Error('Failed to fetch sensor readings');
        }

        const data = await response.json();

        if (data.success && data.data) {
          console.log('Fetched sensor readings:', data.data.length, 'records');

          // Backend returns data in reverse chronological order (newest first)
          // Reverse it so latest is at the end for consistency
          const sortedReadings = [...data.data].reverse();

          console.log(`First reading after sort: ID ${sortedReadings[0]?.id}, timestamp: ${sortedReadings[0]?.timestamp}`);
          console.log(`Last reading after sort: ID ${sortedReadings[sortedReadings.length - 1]?.id}, timestamp: ${sortedReadings[sortedReadings.length - 1]?.timestamp}`);

          setSensorReadings(sortedReadings);
        } else {
          console.warn('No sensor readings found');
          setSensorReadings([]);
        }
      } catch (error) {
        console.error('Error fetching sensor readings:', error);
        setSensorReadings([]);
      } finally {
        setSensorDataLoading(false);
      }
    };

    fetchSensorReadings();
  }, [binSlug]);

  // Initialize with default date range
  const defaultRange = getDefaultDateRange();

  // State management
  const [currentBinIndex, setCurrentBinIndex] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');

  // Independent hour offsets for each chart
  const [hourlyOffsets, setHourlyOffsets] = useState({
    total: 0,
    residue: 0,
    organic: 0,
    anorganic: 0
  });

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

  // Helper function to calculate time range for a specific chart
  const getChartTimeRange = (chartType: 'total' | 'residue' | 'organic' | 'anorganic') => {
    if (timeRange !== 'fiveMinute') {
      // For non-hourly views, all charts use the same range
      return {
        startDate: combineDateAndTime(appliedStartDate, appliedStartTime),
        endDate: combineDateAndTime(appliedEndDate, appliedEndTime)
      };
    }

    // For hourly view, calculate based on chart-specific offset
    const offset = hourlyOffsets[chartType];
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

  // Create API date range parameters from applied state (for Total chart)
  const totalRange = getChartTimeRange('total');
  const apiStartDate = totalRange.startDate;
  const apiEndDate = totalRange.endDate;

  // Custom hook for Total chart data (main data source)
  let mainHookData = useApiTrashData(apiStartDate, apiEndDate, timeRange, trashbinid);

  // Separate hooks for category charts (for independent navigation in Hourly view)
  const residueRange = getChartTimeRange('residue');
  const organicRange = getChartTimeRange('organic');
  const anorganicRange = getChartTimeRange('anorganic');

  let residueData = useApiTrashData(residueRange.startDate, residueRange.endDate, timeRange, trashbinid);
  let organicData = useApiTrashData(organicRange.startDate, organicRange.endDate, timeRange, trashbinid);
  let anorganicData = useApiTrashData(anorganicRange.startDate, anorganicRange.endDate, timeRange, trashbinid);

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
    getTotalChartData: getTotalChartDataOriginal,
    getVolumeBarData: getVolumeBarDataOriginal,
    getDonutData: getDonutDataOriginal,
  } = mainHookData;

  // STEP 1: Override chart data functions to return empty arrays
  const getTotalChartData = () => [];
  const getVolumeBarData = () => [];
  const getDonutData = () => [];

  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
    // Reset all hour offsets when changing time range
    setHourlyOffsets({ total: 0, residue: 0, organic: 0, anorganic: 0 });
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

    console.log("Time range changed to:", newTimeRange, newRange);
  };

  // Navigate hours for a specific chart
  const handlePreviousHour = (chartType: 'total' | 'residue' | 'organic' | 'anorganic') => {
    if (timeRange !== 'fiveMinute') return;

    setHourlyOffsets(prev => ({
      ...prev,
      [chartType]: prev[chartType] - 1
    }));
  };

  const handleNextHour = (chartType: 'total' | 'residue' | 'organic' | 'anorganic') => {
    if (timeRange !== 'fiveMinute') return;

    setHourlyOffsets(prev => ({
      ...prev,
      [chartType]: prev[chartType] + 1
    }));
  };

  // Get formatted time display for a chart
  const getChartTimeDisplay = (chartType: 'total' | 'residue' | 'organic' | 'anorganic') => {
    // For organic chart with sensor data in hourly view, calculate from sensor readings
    if (chartType === 'organic' && timeRange === 'fiveMinute' && sensorReadings.length > 0) {
      const latestReading = sensorReadings[sensorReadings.length - 1];
      const latestTimestamp = new Date(latestReading.timestamp);

      // Get hour in WIB timezone using Intl.DateTimeFormat (more reliable)
      const wibHour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        hour12: false
      }).format(latestTimestamp);

      const wibDate = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(latestTimestamp);

      const latestHour = parseInt(wibHour);

      console.log(`[Display Header DEBUG] Raw timestamp: ${latestReading.timestamp}`);
      console.log(`[Display Header DEBUG] WIB hour from Intl: "${wibHour}" = ${latestHour}`);
      console.log(`[Display Header DEBUG] WIB date from Intl: "${wibDate}"`);

      const offset = hourlyOffsets.organic || 0;
      const targetHour = (latestHour + offset + 24) % 24; // Wrap around 0-23

      // Get WIB date components
      const [month, day, year] = wibDate.split('/');

      // Create a Date object representing the WIB date
      const latestDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), latestHour, 0, 0);

      // Calculate day shift for display
      let dayShift = 0;
      if (offset < 0 && targetHour > latestHour) {
        dayShift = -1;
      } else if (offset > 0 && targetHour < latestHour) {
        dayShift = 1;
      }

      const targetDate = new Date(latestDate);
      targetDate.setDate(targetDate.getDate() + dayShift);

      // Format date for display
      const dateStr = targetDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      console.log(`[Display Header] Latest WIB hour: ${latestHour}, Offset: ${offset}, Target: ${targetHour}, Display: ${dateStr} ${targetHour}:00-${targetHour}:59`);

      const startTime = `${dateStr} ${String(targetHour).padStart(2, '0')}:00`;
      const endTime = `${String(targetHour).padStart(2, '0')}:59`;

      return { startTime, endTime };
    }

    const range = getChartTimeRange(chartType);
    const startTime = range.startDate.split(' ')[1]?.substring(0, 5) || '00:00';
    const endTime = range.endDate.split(' ')[1]?.substring(0, 5) || '00:59';
    return { startTime, endTime };
  };

  const handleApplyDateRange = () => {
    // Apply the UI state to the applied state, which will trigger API re-fetch
    setAppliedStartDate(startDate);
    setAppliedStartTime(startTime);
    setAppliedEndDate(endDate);
    setAppliedEndTime(endTime);

    console.log("Date range applied:", {
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
        console.log(`Exported ${period} ${categoryLabel} data for ${trashBinName} (${response.data.length} records)`);

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
      console.error('Export error:', error);
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

  const getOrganicChartDataWithToggle = () => {
    // STEP 3: Process sensor readings for chart
    if (!sensorReadings || sensorReadings.length === 0) {
      console.log('[Organic Chart] No sensor readings available');
      return [];
    }

    console.log(`[Organic Chart] Processing ${sensorReadings.length} sensor readings`);

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

    // Process readings
    const processedData = sensorReadings.map(reading => {
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
      console.log(`[Organic Chart] First reading: ID ${first.id}, ${first.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
      console.log(`[Organic Chart] Last reading: ID ${last.id}, ${last.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
    }

    let chartData: { time: string; fullTimestamp: string; value: number }[] = [];

    if (timeRange === 'fiveMinute') {
      // HOURLY VIEW: Show specific hour based on offset
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

      // Get the latest timestamp to determine the default hour
      if (minuteData.length > 0) {
        const latestItem = minuteData[minuteData.length - 1];
        const latestTimestamp = latestItem.timestamp;

        // Get hour in WIB timezone (Asia/Jakarta)
        const wibTimeString = latestTimestamp.toLocaleString('en-US', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          hour12: false
        });
        const latestHour = parseInt(wibTimeString.split(',')[1]?.trim() || wibTimeString);

        console.log(`[Organic Chart DEBUG] Latest reading ID: ${latestItem.id}`);
        console.log(`[Organic Chart DEBUG] Original timestamp string: ${latestItem.timestampString}`);
        console.log(`[Organic Chart DEBUG] Date object: ${latestTimestamp.toISOString()}`);
        console.log(`[Organic Chart DEBUG] WIB time: ${latestTimestamp.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
        console.log(`[Organic Chart DEBUG] Local browser time: ${latestTimestamp.toLocaleString()}`);
        console.log(`[Organic Chart DEBUG] Extracted WIB hour: ${latestHour}`);

        // Calculate target hour based on offset (default 0 = latest hour)
        const offset = hourlyOffsets.organic || 0;
        const targetHour = (latestHour + offset + 24) % 24; // Wrap around 0-23

        // Get WIB date components for the latest timestamp
        const wibDateString = latestTimestamp.toLocaleString('en-US', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        const [datePart, timePart] = wibDateString.split(', ');
        const [month, day, year] = datePart.split('/');

        // Create a Date object representing the WIB date
        const latestDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), latestHour, 0, 0);

        // Determine target date based on offset
        const targetDate = new Date(latestDate);

        // Calculate how many days to shift
        let dayShift = 0;
        if (offset < 0 && targetHour > latestHour) {
          dayShift = -1;
        } else if (offset > 0 && targetHour < latestHour) {
          dayShift = 1;
        }

        targetDate.setDate(targetDate.getDate() + dayShift);

        console.log(`[Organic Chart] Latest hour (WIB): ${latestHour}, Offset: ${offset}, Target hour: ${targetHour}, Day shift: ${dayShift}`);
        console.log(`[Organic Chart] Target date: ${targetDate.toLocaleDateString('en-US')} ${targetHour}:00`);

        // Filter data for the specific hour on the target date using WIB timezone
        const hourData = minuteData.filter(item => {
          // Get hour in WIB timezone for this item
          const itemWibTimeString = item.timestamp.toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            hour12: false
          });
          const itemHour = parseInt(itemWibTimeString.split(',')[1]?.trim() || itemWibTimeString);

          // Get date components in WIB timezone
          const itemWibDateString = item.timestamp.toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour12: false
          });
          const [itemDatePart] = itemWibDateString.split(', ');
          const [itemMonth, itemDay, itemYear] = itemDatePart.split('/');

          const targetDateNum = targetDate.getDate();
          const targetMonth = targetDate.getMonth() + 1; // getMonth() is 0-indexed
          const targetYear = targetDate.getFullYear();

          return itemHour === targetHour &&
                 parseInt(itemDay) === targetDateNum &&
                 parseInt(itemMonth) === targetMonth &&
                 parseInt(itemYear) === targetYear;
        });

        console.log(`[Organic Chart] Showing ${hourData.length} data points for ${targetDate.toLocaleDateString('en-US')} ${targetHour}:00-${targetHour}:59`);

        // Create a map of existing data by minute (using WIB timezone)
        const dataByMinute = new Map<number, typeof processedData[0]>();
        hourData.forEach(item => {
          // Get minute in WIB timezone
          const wibMinuteString = item.timestamp.toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta',
            minute: '2-digit',
            hour12: false
          });
          const minute = parseInt(wibMinuteString.split(':').pop()?.trim() || '0');
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
      // DAY VIEW: Group by MINUTE, show last 24 hours
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

      // Show last 24 hours worth of data (1440 minutes, but we'll take last available minutes)
      const dataToShow = minuteData.slice(-1440);

      chartData = dataToShow.map(item => ({
        time: item.timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        }),
        fullTimestamp: `${item.timestamp.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        })} ${item.timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        })} (ID #${item.id})`,
        value: organicToggle === "weight" ? item.weight : item.volume
      }));

    } else if (timeRange === 'daily') {
      // WEEK VIEW: Group by HOUR, select latest reading per hour
      const groupByHour: Record<string, typeof processedData[0]> = {};

      processedData.forEach(item => {
        const hourKey = item.timestamp.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        });

        if (!groupByHour[hourKey] || item.timestamp > groupByHour[hourKey].timestamp) {
          groupByHour[hourKey] = item;
        }
      });

      const hourData = Object.values(groupByHour).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const dataToShow = hourData.slice(-168); // Last 7 days = 168 hours

      chartData = dataToShow.map(item => ({
        time: item.timestamp.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        }) + ' ' + item.timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        }) + ':00',
        fullTimestamp: `${item.timestamp.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        })} ${item.timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        })} (ID #${item.id})`,
        value: organicToggle === "weight" ? item.weight : item.volume
      }));

    } else if (timeRange === 'weekly') {
      // Group by DAY, select latest reading per day
      const groupByDay: Record<string, typeof processedData[0]> = {};

      processedData.forEach(item => {
        const dayKey = item.timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Jakarta'
        });

        if (!groupByDay[dayKey] || item.timestamp > groupByDay[dayKey].timestamp) {
          groupByDay[dayKey] = item;
        }
      });

      const dayData = Object.values(groupByDay).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const dataToShow = dayData.slice(-30); // Last 30 days

      chartData = dataToShow.map(item => ({
        time: item.timestamp.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        }),
        fullTimestamp: `${item.timestamp.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Jakarta'
        })} ${item.timestamp.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'Asia/Jakarta'
        })} (ID #${item.id})`,
        value: organicToggle === "weight" ? item.weight : item.volume
      }));
    }

    return chartData;
  };

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

    // Calculate volume percentage from 4 sensors
    const BIN_HEIGHT = 60; // cm
    let volumePercentage = 0;

    if (!isNaN(sensorTL) && !isNaN(sensorTR) && !isNaN(sensorBL) && !isNaN(sensorBR)) {
      // Calculate average of 4 sensors
      const sum = sensorTL + sensorTR + sensorBL + sensorBR;
      const avgDistance = sum / 4;

      // Calculate fill height
      const fillHeight = BIN_HEIGHT - avgDistance;

      // Calculate percentage
      volumePercentage = Math.max(0, Math.min(100, (fillHeight / BIN_HEIGHT) * 100));
    }

    return {
      weight: isNaN(weight) ? 0 : weight.toFixed(2),
      volume: volumePercentage.toFixed(1)
    };
  };

  const getAnorganicChartDataWithToggle = () => {
    // STEP 1: Return empty array to verify data fetching
    return [];

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
  };

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
      chartData: getOrganicChartDataWithToggle(),
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
      chartData: getAnorganicChartDataWithToggle(),
      currentData: currentSpecific.anorganic,
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
          {timeRange === 'fiveMinute' && (
            <span className="text-xs text-gray-600 font-semibold bg-gray-50 px-2 py-0.5 rounded">
              {getChartTimeDisplay(binData.chartType).startTime} - {getChartTimeDisplay(binData.chartType).endTime}
            </span>
          )}
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
            xAxisInterval={timeRange === 'fiveMinute' ? 4 : undefined}
          />

          {timeRange === 'fiveMinute' && (
            <div className="flex justify-center items-center gap-3 mt-2">
              {/* Left Arrow */}
              <button
                onClick={() => handlePreviousHour(binData.chartType)}
                className="bg-white hover:bg-gray-50 shadow-sm rounded-full p-1.5 transition-all hover:scale-110 border border-gray-200"
                aria-label="Previous hour"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              {/* Right Arrow */}
              <button
                onClick={() => handleNextHour(binData.chartType)}
                className="bg-white hover:bg-gray-50 shadow-sm rounded-full p-1.5 transition-all hover:scale-110 border border-gray-200"
                aria-label="Next hour"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
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
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-800 cursor-pointer">
                    {trashBinName}
                  </h1>
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    REAL DATA
                  </span>
                </div>
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
                <p className="text-sm text-gray-800 font-medium">{condition}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg text-white text-center">
                  <h4 className="font-medium text-blue-100 text-xs">Weight</h4>
                  <p className="text-lg font-bold">{currentTotals.weight}</p>
                  <p className="text-blue-200 text-xs">grams</p>
                </div>

                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-2 rounded-lg text-white text-center">
                  <h4 className="font-medium text-indigo-100 text-xs">Volume</h4>
                  <p className="text-lg font-bold">{currentTotals.volume}%</p>
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
                // Weight - Donut Chart with 50/50 split
                <div className="grid grid-cols-2 gap-3 items-start h-full">
                  <div className="space-y-1 pt-2">
                    {getDonutData().map((item, index) => (
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
                          data={getDonutData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={80}
                          dataKey="value"
                          onMouseEnter={(_, index) => setSelectedSlice(index)}
                          onMouseLeave={() => setSelectedSlice(null)}
                        >
                          {getDonutData().map((entry, index) => (
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
                // Volume - Bar Chart
                <div className="h-full">
                  <BarChart
                    data={getVolumeBarData()}
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
            />
          </div>

          {/* Total Monitoring */}
          <div className="lg:col-span-3 bg-white p-2 sm:p-3 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-800">Total Monitoring</h3>
                {timeRange === 'fiveMinute' && (
                  <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                    {getChartTimeDisplay('total').startTime} - {getChartTimeDisplay('total').endTime}
                  </span>
                )}
              </div>
              <ToggleButton
                value={totalToggle}
                onChange={setTotalToggle}
                size="small"
                colorTheme="blue"
              />
            </div>

            {/* Chart with navigation arrows for Hourly view */}
            <div className="relative">
              <ChartComponent
                data={getTotalChartData()}
                bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
                height={180}
              />

              {timeRange === 'fiveMinute' && (
                <div className="flex justify-center items-center gap-4 mt-2">
                  {/* Left Arrow */}
                  <button
                    onClick={() => handlePreviousHour('total')}
                    className="bg-white hover:bg-blue-50 shadow-md rounded-full p-2 transition-all hover:scale-110 border border-blue-200"
                    aria-label="Previous hour"
                  >
                    <ChevronLeft className="w-5 h-5 text-blue-600" />
                  </button>

                  {/* Right Arrow */}
                  <button
                    onClick={() => handleNextHour('total')}
                    className="bg-white hover:bg-blue-50 shadow-md rounded-full p-2 transition-all hover:scale-110 border border-blue-200"
                    aria-label="Next hour"
                  >
                    <ChevronRight className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
              )}
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