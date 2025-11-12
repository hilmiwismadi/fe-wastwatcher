import { useState, useEffect } from 'react';
import { apiService, AggregatedComposition } from '@/services/api';

export const useMonitoringComposition = () => {
  const [compositionData, setCompositionData] = useState<AggregatedComposition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComposition = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiService.getAggregatedComposition();

        if (response.success && response.data) {
          setCompositionData(response.data);
        } else {
          setError('Failed to fetch composition data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching composition data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchComposition();
    const interval = setInterval(fetchComposition, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate donut chart data for weight
  const getWeightData = () => {
    if (!compositionData) return [];

    const data = compositionData.categories.map(cat => ({
      name: cat.category === 'B3' ? 'Residue' : cat.category === 'Inorganic' ? 'Anorganic' : cat.category,
      value: parseFloat(cat.total_weight),
      color: cat.category === 'Organic' ? '#22c55e' : (cat.category === 'Inorganic' || cat.category === 'Anorganic') ? '#eab308' : '#ef4444'
    }));

    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return [];

    return data.map(item => ({
      ...item,
      value: Math.round((item.value / total) * 100 * 10) / 10
    }));
  };

  // Calculate donut chart data for volume
  const getVolumeData = () => {
    if (!compositionData) return [];

    const data = compositionData.categories.map(cat => ({
      name: cat.category === 'B3' ? 'Residue' : cat.category === 'Inorganic' || cat.category === 'Anorganic' ? 'Anorganic' : cat.category,
      value: parseFloat(cat.avg_volume_percentage),
      color: cat.category === 'Organic' ? '#22c55e' : (cat.category === 'Inorganic' || cat.category === 'Anorganic') ? '#eab308' : '#ef4444'
    }));

    return data.map(item => ({
      ...item,
      value: Math.round(item.value * 10) / 10
    }));
  };

  return {
    compositionData,
    loading,
    error,
    weightData: getWeightData(),
    volumeData: getVolumeData(),
  };
};
