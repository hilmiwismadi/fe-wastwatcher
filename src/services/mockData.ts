import { ApiResponse, WasteDistribution, DailyAnalytics, TrashBinWithStatus } from './api';

// Mock data that matches the API response format
export const mockWasteDistribution: ApiResponse<WasteDistribution[]> = {
  success: true,
  data: [
    {
      category: 'Organic',
      device_count: 5,
      avg_weight: 1500,
      avg_fill_percentage: 65,
      color_code: '#22c55e'
    },
    {
      category: 'Inorganic',
      device_count: 5,
      avg_weight: 1200,
      avg_fill_percentage: 45,
      color_code: '#eab308'
    },
    {
      category: 'B3',
      device_count: 2,
      avg_weight: 800,
      avg_fill_percentage: 25,
      color_code: '#ef4444'
    }
  ]
};

export const mockDailyAnalytics: ApiResponse<DailyAnalytics[]> = {
  success: true,
  data: Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      analysis_date: date.toISOString().split('T')[0],
      device_count: 12,
      avg_weight: 2500 + Math.random() * 1000,
      max_weight: 4000 + Math.random() * 500,
      avg_volume: 50 + Math.random() * 30,
      max_volume: 85 + Math.random() * 15,
      total_collections: Math.floor(Math.random() * 5),
      avg_density: 0.8 + Math.random() * 0.4
    };
  })
};

export const mockTrashBinsWithStatus: ApiResponse<TrashBinWithStatus[]> = {
  success: true,
  data: [
    {
      trashbinid: 'TB001',
      name: 'Trash Bin Kantin IT 1',
      location: 'Kantin IT',
      area: 'Building A',
      floor: 'Ground Floor',
      capacity_liters: 100,
      bin_status: 'active',
      device_count: '3',
      active_devices: '3',
      deviceid: 'D001',
      category: 'Organic',
      total_weight_kg: 2.5,
      average_volume_percentage: 85,
      fill_status: 'high',
      condition: 'Menumpuk di satu sisi',
      last_updated: new Date().toISOString()
    },
    {
      trashbinid: 'TB002',
      name: 'Trash Bin Kantin IT 2',
      location: 'Kantin IT',
      area: 'Building A',
      floor: 'Ground Floor',
      capacity_liters: 100,
      bin_status: 'active',
      device_count: '3',
      active_devices: '3',
      deviceid: 'D002',
      category: 'Inorganic',
      total_weight_kg: 1.8,
      average_volume_percentage: 45,
      fill_status: 'medium',
      condition: 'Normal',
      last_updated: new Date().toISOString()
    }
  ]
};