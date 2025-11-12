import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrashData, ChartData, CurrentSpecific, ToggleType } from '../types';
import { apiService, WasteDistribution, DailyAnalytics, TrashBinWithStatus, Device } from '../services/api';
import { TimeRange } from '../components/TimeRangeSelector';

export const useApiTrashData = (startDate?: string, endDate?: string, timeRange?: TimeRange, binId?: string) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toggle states
  const [compositionToggle, setCompositionToggle] = useState<ToggleType>("weight");
  const [totalToggle, setTotalToggle] = useState<ToggleType>("weight");
  const [residueToggle, setResidueToggle] = useState<ToggleType>("weight");
  const [organicToggle, setOrganicToggle] = useState<ToggleType>("weight");
  const [anorganicToggle, setAnorganicToggle] = useState<ToggleType>("weight");
  const [selectedSlice, setSelectedSlice] = useState<number | null>(null);

  // API Data states
  const [wasteDistribution, setWasteDistribution] = useState<WasteDistribution[]>([]);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalytics[]>([]);
  const [organicAnalytics, setOrganicAnalytics] = useState<DailyAnalytics[]>([]);
  const [anorganicAnalytics, setAnorganicAnalytics] = useState<DailyAnalytics[]>([]);
  const [residueAnalytics, setResidueAnalytics] = useState<DailyAnalytics[]>([]);
  const [trashBinsStatus, setTrashBinsStatus] = useState<TrashBinWithStatus[]>([]);
  const [binSpecificDevices, setBinSpecificDevices] = useState<Device[]>([]);

  // Fetch current status data (latest data, not affected by time range)
  const fetchCurrentStatus = useCallback(async () => {
    try {
      // If binId is provided, fetch bin-specific devices
      if (binId) {
        const devicesRes = await apiService.getDevicesByTrashBinId(binId);
        if (devicesRes.success) {
          setBinSpecificDevices(devicesRes.data);
        }
      }
    } catch (err) {
      console.error('Error fetching current status:', err);
    }
  }, [binId]);

  // Fetch time-period filtered data for charts
  const fetchTimeRangeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // If binId is provided, get device IDs for this specific bin
      let organicDeviceId, anorganicDeviceId, residueDeviceId;
      if (binId && binSpecificDevices.length > 0) {
        organicDeviceId = binSpecificDevices.find(d => d.category === 'Organic')?.deviceid;
        anorganicDeviceId = binSpecificDevices.find(d => d.category === 'Anorganic' || d.category === 'Inorganic')?.deviceid;
        residueDeviceId = binSpecificDevices.find(d => d.category === 'Residue' || d.category === 'B3')?.deviceid;
        console.log('Using device IDs for bin:', binId, { organicDeviceId, anorganicDeviceId, residueDeviceId });
      }

      // Choose API endpoint based on timeRange
      let analyticsPromise, organicPromise, anorganicPromise, residuePromise;
      if (timeRange === 'fiveMinute') {
        // For "Hourly" view, show 5-minute interval data (12 points per hour, 24 hours)
        analyticsPromise = binId
          ? apiService.getFiveMinuteIntervalDataForBin(binId, startDate, endDate)
          : apiService.getFiveMinuteIntervalData(undefined, undefined, startDate, endDate);
        organicPromise = apiService.getFiveMinuteIntervalData(organicDeviceId, 'Organic', startDate, endDate);
        anorganicPromise = apiService.getFiveMinuteIntervalData(anorganicDeviceId, 'Anorganic', startDate, endDate);
        residuePromise = apiService.getFiveMinuteIntervalData(residueDeviceId, 'Residue', startDate, endDate);
      } else if (timeRange === 'hourly') {
        // For "Day" view, show hourly data (24 hours: 00:00-23:00)
        analyticsPromise = binId
          ? apiService.getHourlyIntervalDataForBin(binId, startDate, endDate)
          : apiService.getHourlyIntervalData(undefined, undefined, startDate, endDate);
        organicPromise = apiService.getHourlyIntervalData(organicDeviceId, 'Organic', startDate, endDate);
        anorganicPromise = apiService.getHourlyIntervalData(anorganicDeviceId, 'Anorganic', startDate, endDate);
        residuePromise = apiService.getHourlyIntervalData(residueDeviceId, 'Residue', startDate, endDate);
      } else if (timeRange === 'daily') {
        // For "Week" view, show daily data (7 days)
        analyticsPromise = binId
          ? apiService.getDailyAnalyticsForBin(binId, 7, startDate, endDate)
          : apiService.getDailyAnalytics(7, undefined, startDate, endDate);
        organicPromise = apiService.getDailyAnalytics(7, 'Organic', startDate, endDate, organicDeviceId);
        anorganicPromise = apiService.getDailyAnalytics(7, 'Anorganic', startDate, endDate, anorganicDeviceId);
        residuePromise = apiService.getDailyAnalytics(7, 'Residue', startDate, endDate, residueDeviceId);
      } else {
        // For "Month" view, show daily data (30 days)
        analyticsPromise = binId
          ? apiService.getDailyAnalyticsForBin(binId, 30, startDate, endDate)
          : apiService.getDailyAnalytics(30, undefined, startDate, endDate);
        organicPromise = apiService.getDailyAnalytics(30, 'Organic', startDate, endDate, organicDeviceId);
        anorganicPromise = apiService.getDailyAnalytics(30, 'Anorganic', startDate, endDate, anorganicDeviceId);
        residuePromise = apiService.getDailyAnalytics(30, 'Residue', startDate, endDate, residueDeviceId);
      }

      const [distributionRes, analyticsRes, organicRes, anorganicRes, residueRes, binsRes] = await Promise.all([
        apiService.getWasteDistribution(),
        analyticsPromise,
        organicPromise,
        anorganicPromise,
        residuePromise,
        apiService.getTrashBinsWithStatus()
      ]);

      if (distributionRes.success) {
        setWasteDistribution(distributionRes.data);
      }

      if (analyticsRes.success) {
        setDailyAnalytics(analyticsRes.data);
      }

      if (organicRes.success) {
        setOrganicAnalytics(organicRes.data);
      }

      if (anorganicRes.success) {
        setAnorganicAnalytics(anorganicRes.data);
      }

      if (residueRes.success) {
        setResidueAnalytics(residueRes.data);
      }

      if (binsRes.success) {
        setTrashBinsStatus(binsRes.data);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, timeRange, binId, binSpecificDevices]);

  // Fetch both current status and time-range data
  useEffect(() => {
    const fetchData = async () => {
      await fetchCurrentStatus(); // Fetch current status first (including bin devices)
      // Time range data will be fetched by the second useEffect once binSpecificDevices is set
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binId]); // Re-fetch when binId changes

  useEffect(() => {
    // Only fetch time-range data if:
    // 1. No binId is specified (system-wide data), OR
    // 2. binId is specified AND binSpecificDevices have been loaded
    if (!binId || (binId && binSpecificDevices.length > 0)) {
      fetchTimeRangeData(); // Fetch time-range data when filters change
    }
  }, [fetchTimeRangeData, binId, binSpecificDevices.length]);

  // Calculate current values from CURRENT STATUS data (not affected by time range filters)
  const currentWeight: TrashData = useMemo(() => {
    // If bin-specific devices are available, use those instead of system-wide averages
    if (binId && binSpecificDevices.length > 0) {
      const organic = Math.round(parseFloat(String(binSpecificDevices.find(d => d.category === 'Organic')?.total_weight_kg || '0')) * 10) / 10;
      const anorganic = Math.round(parseFloat(String(binSpecificDevices.find(d => d.category === 'Anorganic' || d.category === 'Inorganic')?.total_weight_kg || '0')) * 10) / 10;
      const residue = Math.round(parseFloat(String(binSpecificDevices.find(d => d.category === 'Residue' || d.category === 'B3')?.total_weight_kg || '0')) * 10) / 10;

      return {
        organic,
        anorganic,
        residue,
      };
    }

    // Use waste distribution data which has real per-device weights
    const organic = Math.round(parseFloat(String(wasteDistribution.find(w => w.category === 'Organic')?.avg_weight || '0')) * 10) / 10;
    const anorganic = Math.round(parseFloat(String(wasteDistribution.find(w => w.category === 'Inorganic')?.avg_weight || '0')) * 10) / 10;
    const residue = Math.round(parseFloat(String(wasteDistribution.find(w => w.category === 'B3')?.avg_weight || '0')) * 10) / 10;

    return {
      organic,
      anorganic,
      residue,
    };
  }, [wasteDistribution, binId, binSpecificDevices]);

  const currentVolume: TrashData = useMemo(() => {
    // If bin-specific devices are available, use those instead of system-wide averages
    if (binId && binSpecificDevices.length > 0) {
      const organic = Math.round(parseFloat(String(binSpecificDevices.find(d => d.category === 'Organic')?.average_volume_percentage || '0')) * 10) / 10;
      const anorganic = Math.round(parseFloat(String(binSpecificDevices.find(d => d.category === 'Anorganic' || d.category === 'Inorganic')?.average_volume_percentage || '0')) * 10) / 10;
      const residue = Math.round(parseFloat(String(binSpecificDevices.find(d => d.category === 'Residue' || d.category === 'B3')?.average_volume_percentage || '0')) * 10) / 10;

      return {
        organic,
        anorganic,
        residue,
        empty: 0, // Not applicable for individual device percentages
      };
    }

    // Use waste distribution data which has real per-device percentages
    // These represent individual device fill percentages
    const organic = Math.round(parseFloat(String(wasteDistribution.find(w => w.category === 'Organic')?.avg_fill_percentage || '0')) * 10) / 10;
    const anorganic = Math.round(parseFloat(String(wasteDistribution.find(w => w.category === 'Inorganic')?.avg_fill_percentage || '0')) * 10) / 10;
    const residue = Math.round(parseFloat(String(wasteDistribution.find(w => w.category === 'B3')?.avg_fill_percentage || '0')) * 10) / 10;

    // These are individual percentages, not totals (each device can be 0-100%)
    return {
      organic,
      anorganic,
      residue,
      empty: 0, // Not applicable for individual device percentages
    };
  }, [wasteDistribution, binId, binSpecificDevices]);

  const currentTotals = useMemo(() => ({
    weight: Math.round((currentWeight.organic + currentWeight.anorganic + currentWeight.residue) * 10) / 10,
    volume: Math.round(((currentVolume.organic + currentVolume.anorganic + currentVolume.residue) / 3) * 10) / 10,
  }), [currentWeight, currentVolume]);

  const currentSpecific: CurrentSpecific = useMemo(() => ({
    organic: {
      weight: currentWeight.organic,
      volume: currentVolume.organic
    },
    anorganic: {
      weight: currentWeight.anorganic,
      volume: currentVolume.anorganic
    },
    residue: {
      weight: currentWeight.residue,
      volume: currentVolume.residue
    },
  }), [currentWeight, currentVolume]);

  // Format timestamp based on time range
  const formatTimestamp = (item: DailyAnalytics): string => {
    const timestamp = item.time_interval || item.analysis_date || '';
    if (!timestamp) return '';

    const date = new Date(timestamp);

    if (timeRange === 'fiveMinute') {
      // For "Hourly" view with 5-minute intervals
      // Use wib_time_display from backend if available
      if (item.wib_time_display) {
        // Show all intervals as labels (user requested labels for each 5 minutes)
        return item.wib_time_display;
      }

      // Fallback: extract from timestamp
      const minutes = date.getUTCMinutes();
      const hours = date.getUTCHours();
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } else if (timeRange === 'hourly') {
      // For "Day" view: show hourly timestamps (00:00-23:00)
      // Convert UTC to WIB by adding 7 hours
      const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
      return wibDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
      });
    } else if (timeRange === 'daily') {
      // For "Week" view: show 7 daily date points
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // For "Month" view: show 30 daily date points
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Chart data functions using API data
  const getTotalChartData = (): ChartData[] => {
    if (!dailyAnalytics.length) return [];

    // Group data by actual timestamp (not formatted) to aggregate multiple devices per timestamp
    const groupedData = dailyAnalytics.reduce((acc, item) => {
      const timestamp = item.time_interval || item.analysis_date || '';
      if (!timestamp) return acc;

      // Use actual timestamp as key for grouping, not the formatted display label
      const timeKey = new Date(timestamp).toISOString();
      if (!acc[timeKey]) {
        acc[timeKey] = {
          timestamp,
          displayLabel: formatTimestamp(item),
          wibTimeDisplay: item.wib_time_display,
          count: 0,
          totalWeight: 0,
          totalVolume: 0
        };
      }
      acc[timeKey].count += 1;
      acc[timeKey].totalWeight += (parseFloat(String(item.avg_weight)) || 0);
      acc[timeKey].totalVolume += (parseFloat(String(item.avg_volume)) || 0);
      return acc;
    }, {} as Record<string, { timestamp: string; displayLabel: string; wibTimeDisplay?: string; count: number; totalWeight: number; totalVolume: number }>);

    // Convert grouped data to chart format with averaged values, sorted by timestamp
    return Object.entries(groupedData)
      .sort(([, a], [, b]) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(([, data]) => {
        const weight = data.totalWeight;
        const volume = data.count > 0 ? data.totalVolume / data.count : 0;
        const date = new Date(data.timestamp);

        // Create full timestamp for tooltip
        let fullTimestamp;
        if (timeRange === 'fiveMinute' && data.wibTimeDisplay) {
          // Use pre-calculated WIB time from backend (HH:MM)
          fullTimestamp = data.wibTimeDisplay;
        } else if (timeRange === 'fiveMinute') {
          // Fallback: extract time from timestamp (HH:MM)
          fullTimestamp = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
        } else if (timeRange === 'hourly') {
          // For Day view: show time (HH:MM)
          const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
          fullTimestamp = `${String(wibDate.getUTCHours()).padStart(2, '0')}:${String(wibDate.getUTCMinutes()).padStart(2, '0')}`;
        } else {
          // For Week/Month view: show date (e.g., "Oct 3", "Nov 2")
          fullTimestamp = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        return {
          time: data.displayLabel,
          fullTimestamp,
          value: totalToggle === "weight"
            ? (isNaN(weight) ? 0 : Math.round(weight * 100) / 100)  // Sum of weights
            : (isNaN(volume) ? 0 : Math.round(volume * 100) / 100)  // Average of volumes
        };
      });
  };

  const getResidueChartData = (): ChartData[] => {
    if (!residueAnalytics.length) return [];

    return residueAnalytics.map((item) => {
      const timestamp = item.time_interval || item.analysis_date || '';
      const date = new Date(timestamp);

      // Format timestamp for tooltip
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

      return {
        time: formatTimestamp(item),
        fullTimestamp,
        value: residueToggle === "weight" ? item.avg_weight : item.avg_volume
      };
    });
  };

  const getOrganicChartData = (): ChartData[] => {
    if (!organicAnalytics.length) return [];

    return organicAnalytics.map((item) => {
      const timestamp = item.time_interval || item.analysis_date || '';
      const date = new Date(timestamp);

      // Format timestamp for tooltip
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

      return {
        time: formatTimestamp(item),
        fullTimestamp,
        value: organicToggle === "weight" ? item.avg_weight : item.avg_volume
      };
    });
  };

  const getAnorganicChartData = (): ChartData[] => {
    if (!anorganicAnalytics.length) return [];

    return anorganicAnalytics.map((item) => {
      const timestamp = item.time_interval || item.analysis_date || '';
      const date = new Date(timestamp);

      // Format timestamp for tooltip
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

      return {
        time: formatTimestamp(item),
        fullTimestamp,
        value: anorganicToggle === "weight" ? item.avg_weight : item.avg_volume
      };
    });
  };

  // Volume bar chart data
  const getVolumeBarData = () => [
    { name: "Organic", value: currentVolume.organic, color: "#22c55e" },
    { name: "Anorganic", value: currentVolume.anorganic, color: "#eab308" },
    { name: "Residue", value: currentVolume.residue, color: "#ef4444" },
  ];

  // Donut chart data (for weight composition)
  const getDonutData = () => [
    { name: "Organic", value: currentWeight.organic, color: "#22c55e" },
    { name: "Anorganic", value: currentWeight.anorganic, color: "#eab308" },
    { name: "Residue", value: currentWeight.residue, color: "#ef4444" },
  ];

  // Check if any bin is full (>80% volume)
  const isAnyBinFull = (): boolean => {
    return trashBinsStatus.some(bin =>
      (bin.average_volume_percentage || 0) > 80
    );
  };

  // Get bins that need collection
  const getBinsNeedingCollection = () => {
    return trashBinsStatus.filter(bin =>
      (bin.average_volume_percentage || 0) > 80
    );
  };

  // Get total active bins
  const getActiveBinsCount = () => {
    return trashBinsStatus.filter(bin => bin.bin_status === 'active').length;
  };

  return {
    // Loading and error states
    loading,
    error,
    refetch: fetchTimeRangeData,

    // State
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

    // Data
    currentWeight,
    currentVolume,
    currentTotals,
    currentSpecific,
    wasteDistribution,
    dailyAnalytics,
    residueAnalytics,
    organicAnalytics,
    anorganicAnalytics,
    trashBinsStatus,

    // Functions
    getTotalChartData,
    getResidueChartData,
    getOrganicChartData,
    getAnorganicChartData,
    getVolumeBarData,
    getDonutData,
    isAnyBinFull,
    getBinsNeedingCollection,
    getActiveBinsCount,
  };
};