import { useState, useEffect, useMemo } from 'react';
import { TrashData, ChartData, CurrentSpecific, ToggleType } from '../types';
import { apiService, WasteDistribution, DailyAnalytics, TrashBinWithStatus } from '../services/api';

export const useApiTrashData = (startDate?: string, endDate?: string) => {
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
  const [trashBinsStatus, setTrashBinsStatus] = useState<TrashBinWithStatus[]>([]);

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [distributionRes, analyticsRes, binsRes] = await Promise.all([
        apiService.getWasteDistribution(),
        apiService.getDailyAnalytics(30, undefined, startDate, endDate),
        apiService.getTrashBinsWithStatus()
      ]);

      if (distributionRes.success) {
        setWasteDistribution(distributionRes.data);
      }

      if (analyticsRes.success) {
        setDailyAnalytics(analyticsRes.data);
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
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Calculate current values from API data (using today's/latest data)
  const currentWeight: TrashData = useMemo(() => {
    // Use the latest daily analytics data as "today's" data
    const latestData = dailyAnalytics.length > 0 ? dailyAnalytics[dailyAnalytics.length - 1] : null;

    if (latestData) {
      // For weight, use today's actual data divided by category estimates
      const totalWeight = parseFloat(latestData.avg_weight);
      return {
        organic: Math.round(totalWeight * 0.5 * 10) / 10, // Approximate: 50% organic
        anorganic: Math.round(totalWeight * 0.3 * 10) / 10, // Approximate: 30% inorganic
        residue: Math.round(totalWeight * 0.2 * 10) / 10, // Approximate: 20% B3
      };
    }

    // Fallback to waste distribution averages if no daily data
    const organic = Math.round(parseFloat(wasteDistribution.find(w => w.category === 'Organic')?.avg_weight || '0') * 10) / 10;
    const inorganic = Math.round(parseFloat(wasteDistribution.find(w => w.category === 'Inorganic')?.avg_weight || '0') * 10) / 10;
    const b3 = Math.round(parseFloat(wasteDistribution.find(w => w.category === 'B3')?.avg_weight || '0') * 10) / 10;

    return {
      organic,
      anorganic: inorganic,
      residue: b3,
    };
  }, [dailyAnalytics, wasteDistribution]);

  const currentVolume: TrashData = useMemo(() => {
    // Use the latest daily analytics data as "today's" data
    const latestData = dailyAnalytics.length > 0 ? dailyAnalytics[dailyAnalytics.length - 1] : null;

    if (latestData) {
      // For volume, use today's actual volume data divided by category estimates
      const totalVolume = parseFloat(latestData.avg_volume);
      return {
        organic: Math.round(totalVolume * 0.45 * 10) / 10, // Approximate: 45% organic
        anorganic: Math.round(totalVolume * 0.35 * 10) / 10, // Approximate: 35% inorganic
        residue: Math.round(totalVolume * 0.20 * 10) / 10, // Approximate: 20% B3
        empty: Math.round(Math.max(0, 100 - totalVolume) * 10) / 10,
      };
    }

    // Fallback to waste distribution averages if no daily data
    const organic = Math.round(parseFloat(wasteDistribution.find(w => w.category === 'Organic')?.avg_fill_percentage || '0') * 10) / 10;
    const inorganic = Math.round(parseFloat(wasteDistribution.find(w => w.category === 'Inorganic')?.avg_fill_percentage || '0') * 10) / 10;
    const b3 = Math.round(parseFloat(wasteDistribution.find(w => w.category === 'B3')?.avg_fill_percentage || '0') * 10) / 10;

    return {
      organic,
      anorganic: inorganic,
      residue: b3,
      empty: Math.round(Math.max(0, 100 - organic - inorganic - b3) * 10) / 10,
    };
  }, [dailyAnalytics, wasteDistribution]);

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

  // Chart data functions using API data
  const getTotalChartData = (): ChartData[] => {
    if (!dailyAnalytics.length) return [];

    return dailyAnalytics.map((item) => ({
      time: new Date(item.analysis_date).toLocaleDateString(),
      value: totalToggle === "weight" ? item.avg_weight : item.avg_volume
    }));
  };

  const getResidueChartData = (): ChartData[] => {
    if (!dailyAnalytics.length) return [];

    // Filter data for B3 category (we'd need to modify API to support category filtering)
    return dailyAnalytics.map((item) => ({
      time: new Date(item.analysis_date).toLocaleDateString(),
      value: residueToggle === "weight" ? item.avg_weight * 0.3 : item.avg_volume * 0.3 // Approximate B3 portion
    }));
  };

  const getOrganicChartData = (): ChartData[] => {
    if (!dailyAnalytics.length) return [];

    return dailyAnalytics.map((item) => ({
      time: new Date(item.analysis_date).toLocaleDateString(),
      value: organicToggle === "weight" ? item.avg_weight * 0.5 : item.avg_volume * 0.5 // Approximate organic portion
    }));
  };

  const getAnorganicChartData = (): ChartData[] => {
    if (!dailyAnalytics.length) return [];

    return dailyAnalytics.map((item) => ({
      time: new Date(item.analysis_date).toLocaleDateString(),
      value: anorganicToggle === "weight" ? item.avg_weight * 0.2 : item.avg_volume * 0.2 // Approximate inorganic portion
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
    refetch: fetchData,

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