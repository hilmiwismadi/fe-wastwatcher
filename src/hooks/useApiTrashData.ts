import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrashData, ChartData, CurrentSpecific, ToggleType } from '../types';
import { apiService, WasteDistribution, DailyAnalytics, TrashBinWithStatus } from '../services/api';
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
  const [currentStatusData, setCurrentStatusData] = useState<DailyAnalytics | null>(null);
  const [binSpecificDevices, setBinSpecificDevices] = useState<any[]>([]);

  // Fetch current status data (latest data, not affected by time range)
  const fetchCurrentStatus = useCallback(async () => {
    try {
      // Get the very latest data point for current status
      const latestDataRes = await apiService.getDailyAnalytics(1); // Just get today's data
      if (latestDataRes.success && latestDataRes.data.length > 0) {
        setCurrentStatusData(latestDataRes.data[latestDataRes.data.length - 1]);
      }

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

      // Choose API endpoint based on timeRange
      let analyticsPromise, organicPromise, anorganicPromise, residuePromise;
      if (timeRange === 'hourly') {
        // For "Day" view, show hourly data (24 hours: 00:00-23:00)
        analyticsPromise = apiService.getHourlyIntervalData(undefined, undefined, startDate, endDate);
        organicPromise = apiService.getHourlyIntervalData(undefined, 'Organic', startDate, endDate);
        anorganicPromise = apiService.getHourlyIntervalData(undefined, 'Anorganic', startDate, endDate);
        residuePromise = apiService.getHourlyIntervalData(undefined, 'Residue', startDate, endDate);
      } else if (timeRange === 'daily') {
        // For "Week" view, show daily data (7 days)
        analyticsPromise = apiService.getDailyAnalytics(7, undefined, startDate, endDate);
        organicPromise = apiService.getDailyAnalytics(7, 'Organic', startDate, endDate);
        anorganicPromise = apiService.getDailyAnalytics(7, 'Anorganic', startDate, endDate);
        residuePromise = apiService.getDailyAnalytics(7, 'Residue', startDate, endDate);
      } else {
        // For "Month" view, show daily data (30 days)
        analyticsPromise = apiService.getDailyAnalytics(30, undefined, startDate, endDate);
        organicPromise = apiService.getDailyAnalytics(30, 'Organic', startDate, endDate);
        anorganicPromise = apiService.getDailyAnalytics(30, 'Anorganic', startDate, endDate);
        residuePromise = apiService.getDailyAnalytics(30, 'Residue', startDate, endDate);
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
  }, [startDate, endDate, timeRange]);

  // Fetch both current status and time-range data
  useEffect(() => {
    fetchCurrentStatus(); // Fetch current status once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    fetchTimeRangeData(); // Fetch time-range data when filters change
  }, [fetchTimeRangeData]);

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
    const anorganic = Math.round(parseFloat(String(wasteDistribution.find(w => w.category === 'Anorganic' || w.category === 'Inorganic')?.avg_weight || '0')) * 10) / 10;
    const residue = Math.round(parseFloat(String(wasteDistribution.find(w => w.category === 'Residue' || w.category === 'B3')?.avg_weight || '0')) * 10) / 10;

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
    const anorganic = Math.round(parseFloat(String(wasteDistribution.find(w => w.category === 'Anorganic' || w.category === 'Inorganic')?.avg_fill_percentage || '0')) * 10) / 10;
    const residue = Math.round(parseFloat(String(wasteDistribution.find(w => w.category === 'Residue' || w.category === 'B3')?.avg_fill_percentage || '0')) * 10) / 10;

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
    volume: Math.round((currentVolume.organic + currentVolume.anorganic + currentVolume.residue) * 10) / 10,
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
    const timestamp = item.time_interval || item.analysis_date;
    if (!timestamp) return '';

    const date = new Date(timestamp);

    if (timeRange === 'hourly') {
      // For "Day" view: show hourly timestamps (00:00-23:00)
      return date.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + ':00';
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

    return dailyAnalytics.map((item) => ({
      time: formatTimestamp(item),
      value: totalToggle === "weight" ? item.avg_weight : item.avg_volume
    }));
  };

  const getResidueChartData = (): ChartData[] => {
    if (!residueAnalytics.length) return [];

    return residueAnalytics.map((item) => ({
      time: formatTimestamp(item),
      value: residueToggle === "weight" ? item.avg_weight : item.avg_volume
    }));
  };

  const getOrganicChartData = (): ChartData[] => {
    if (!organicAnalytics.length) return [];

    return organicAnalytics.map((item) => ({
      time: formatTimestamp(item),
      value: organicToggle === "weight" ? item.avg_weight : item.avg_volume
    }));
  };

  const getAnorganicChartData = (): ChartData[] => {
    if (!anorganicAnalytics.length) return [];

    return anorganicAnalytics.map((item) => ({
      time: formatTimestamp(item),
      value: anorganicToggle === "weight" ? item.avg_weight : item.avg_volume
    }));
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