import { useState, useMemo } from 'react';
import { TrashData, ChartData, CurrentSpecific, ToggleType } from '../types';
import {
  residueWeightData,
  residueVolumeData,
  organicWeightData,
  organicVolumeData,
  anorganicWeightData,
  anorganicVolumeData,
} from '../data/mockData';

export const useTrashData = () => {
  const [compositionToggle, setCompositionToggle] = useState<ToggleType>("weight");
  const [totalToggle, setTotalToggle] = useState<ToggleType>("weight");
  const [residueToggle, setResidueToggle] = useState<ToggleType>("weight");
  const [organicToggle, setOrganicToggle] = useState<ToggleType>("weight");
  const [anorganicToggle, setAnorganicToggle] = useState<ToggleType>("weight");
  const [selectedSlice, setSelectedSlice] = useState<number | null>(null);

  // Calculate current values from latest data points
  const currentWeight: TrashData = useMemo(() => ({
    organic: organicWeightData[organicWeightData.length - 1]?.value || 0,
    anorganic: anorganicWeightData[anorganicWeightData.length - 1]?.value || 0,
    residue: residueWeightData[residueWeightData.length - 1]?.value || 0,
  }), []);

  const currentVolume: TrashData = useMemo(() => ({
    organic: organicVolumeData[organicVolumeData.length - 1]?.value || 0,
    anorganic: anorganicVolumeData[anorganicVolumeData.length - 1]?.value || 0,
    residue: residueVolumeData[residueVolumeData.length - 1]?.value || 0,
    empty: Math.max(0, 100 - (organicVolumeData[organicVolumeData.length - 1]?.value || 0) - 
                        (anorganicVolumeData[anorganicVolumeData.length - 1]?.value || 0) - 
                        (residueVolumeData[residueVolumeData.length - 1]?.value || 0)),
  }), []);

  const currentTotals = useMemo(() => ({
    weight: currentWeight.organic + currentWeight.anorganic + currentWeight.residue,
    volume: Math.round((currentVolume.organic + currentVolume.anorganic + currentVolume.residue) / 3),
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

  // Chart data functions
  const getTotalChartData = (): ChartData[] => {
    if (totalToggle === "weight") {
      return residueWeightData.map((item, index) => ({
        time: item.time,
        value: item.value + (organicWeightData[index]?.value || 0) + (anorganicWeightData[index]?.value || 0)
      }));
    } else {
      return residueVolumeData.map((item, index) => ({
        time: item.time,
        value: Math.round(((item.value + (organicVolumeData[index]?.value || 0) + (anorganicVolumeData[index]?.value || 0)) / 3))
      }));
    }
  };

  const getResidueChartData = (): ChartData[] => {
    return residueToggle === "weight" ? residueWeightData : residueVolumeData;
  };

  const getOrganicChartData = (): ChartData[] => {
    return organicToggle === "weight" ? organicWeightData : organicVolumeData;
  };

  const getAnorganicChartData = (): ChartData[] => {
    return anorganicToggle === "weight" ? anorganicWeightData : anorganicVolumeData;
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
    return (
      currentSpecific.organic.volume > 80 ||
      currentSpecific.anorganic.volume > 80 ||
      currentSpecific.residue.volume > 80
    );
  };

  return {
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
    
    // Functions
    getTotalChartData,
    getResidueChartData,
    getOrganicChartData,
    getAnorganicChartData,
    getVolumeBarData,
    getDonutData,
    isAnyBinFull,
  };
};