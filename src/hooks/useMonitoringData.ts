import { useState, useEffect } from 'react';
import { apiService, TrashBinWithStatus } from '@/services/api';

interface BinMonitoringData {
  trashbinid: string;
  name: string;
  location: string;
  floor: string;
  organic_percentage: number;
  anorganic_percentage: number;
  residue_percentage: number;
  organic_weight: number;
  anorganic_weight: number;
  residue_weight: number;
}

export const useMonitoringData = () => {
  const [bins, setBins] = useState<BinMonitoringData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both trash bins and devices data
        const [binsResponse, devicesResponse] = await Promise.all([
          apiService.getTrashBins(),
          apiService.getDevicesWithHealth(),
        ]);

        if (binsResponse.success && devicesResponse.success) {
          // Create a map of bin data
          const binMap = new Map<string, BinMonitoringData>();

          // Initialize all bins with zero values
          binsResponse.data.forEach(bin => {
            binMap.set(bin.trashbinid, {
              trashbinid: bin.trashbinid,
              name: bin.name,
              location: bin.location,
              floor: bin.floor,
              organic_percentage: 0,
              anorganic_percentage: 0,
              residue_percentage: 0,
              organic_weight: 0,
              anorganic_weight: 0,
              residue_weight: 0,
            });
          });

          // Populate with device data
          devicesResponse.data.forEach(device => {
            const binData = binMap.get(device.trashbinid);
            if (binData) {
              const percentage = device.average_volume_percentage || 0;
              const weight = device.total_weight_kg || 0;

              if (device.category === 'Organic') {
                binData.organic_percentage = percentage;
                binData.organic_weight = weight;
              } else if (device.category === 'Inorganic') {
                binData.anorganic_percentage = percentage;
                binData.anorganic_weight = weight;
              } else if (device.category === 'B3') {
                binData.residue_percentage = percentage;
                binData.residue_weight = weight;
              }
            }
          });

          // Convert map to array
          const transformedData = Array.from(binMap.values());
          setBins(transformedData);
        } else {
          setError('Failed to fetch monitoring data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching monitoring data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonitoringData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);

    return () => clearInterval(interval);
  }, []);

  return { bins, loading, error };
};
