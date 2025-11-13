// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
// Use mock data in production when no API URL is configured or when API is unavailable
const USE_MOCK_DATA = (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) ||
                      (typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('netlify.app')));

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  count?: number;
}

export interface TrashBin {
  trashbinid: string;
  name: string;
  location: string;
  area: string;
  floor: string;
  capacity_liters: number;
  bin_status: 'active' | 'maintenance' | 'inactive';
  device_count: string;
  active_devices: string;
}

export interface TrashBinWithStatus extends TrashBin {
  deviceid?: string;
  category?: string;
  total_weight_kg?: number;
  average_volume_percentage?: number;
  fill_status?: string;
  condition?: string;
  last_updated?: string;
}

export interface Device {
  deviceid: string;
  trashbinid: string;
  category: 'Organic' | 'Inorganic' | 'Anorganic' | 'B3' | 'Residue';
  status: 'active' | 'maintenance' | 'faulty' | 'offline';
  bin_name: string;
  location: string;
  sensor_count: number;
  total_weight_kg?: number;
  average_volume_percentage?: number;
  fill_status?: string;
  last_updated?: string;
  battery_percentage?: number;
  error_count_24h?: number;
}

export interface DashboardOverview {
  total_bins: string;
  total_devices: string;
  active_devices: string;
  bins_need_collection: string;
  avg_fill_percentage: string;
  avg_battery_level: string;
  active_alerts: string;
}

export interface WasteDistribution {
  category: 'Organic' | 'Inorganic' | 'B3';
  device_count: number;
  avg_weight: number;
  avg_fill_percentage: number;
  color_code: string;
}

export interface AggregatedComposition {
  categories: {
    category: 'Organic' | 'Inorganic' | 'B3';
    bin_count: string;
    total_weight: string;
    avg_weight_per_bin: string;
    avg_volume_percentage: string;
  }[];
  summary: {
    total_weight: number;
    avg_volume_percentage: number;
    total_bins: number;
  };
}

export interface DailyAnalytics {
  analysis_date?: string;
  time_interval?: string;
  wib_time_display?: string;
  deviceid?: string;
  category?: string;
  device_count?: number;
  data_points?: number;
  avg_weight: number;
  max_weight?: number;
  avg_volume: number;
  max_volume?: number;
  total_collections?: number;
  avg_density?: number;
}

export interface HourlyPattern {
  hour: number;
  data_points: number;
  avg_weight: number;
  max_weight: number;
  min_weight: number;
}

export interface FillLevelDistribution {
  fill_level: 'empty' | 'low' | 'medium' | 'high' | 'full' | 'overflowing';
  bin_count: number;
  avg_percentage: number;
  categories: string[];
}

export interface LocationAnalytics {
  area: string;
  bin_count: number;
  device_count: number;
  avg_fill_percentage: number;
  avg_weight: number;
  bins_need_collection: number;
}

export interface DeviceStatistics {
  total_devices: number;
  active_devices: number;
  inactive_devices: number;
  maintenance_devices: number;
}

export interface RealTimeData {
  timestamp: string;
  weight_kg: number;
  fill_percentage: number;
  temperature: number;
  humidity: number;
}

export interface TrendData {
  date: string;
  value: number;
  category?: string;
}

class ApiService {
  private async fetchApi<T>(endpoint: string, retries = 3): Promise<ApiResponse<T>> {
    // Use mock data if in production without API URL
    if (USE_MOCK_DATA) {
      const { mockWasteDistribution, mockDailyAnalytics, mockTrashBinsWithStatus, mockFiveMinuteIntervalData, mockHourlyIntervalData } = await import('./mockData');

      // Return appropriate mock data based on endpoint
      if (endpoint.includes('/waste-distribution')) {
        return mockWasteDistribution as ApiResponse<T>;
      } else if (endpoint.includes('/intervals/5-minute')) {
        return mockFiveMinuteIntervalData as ApiResponse<T>;
      } else if (endpoint.includes('/intervals/hourly')) {
        return mockHourlyIntervalData as ApiResponse<T>;
      } else if (endpoint.includes('/daily')) {
        // Handle days parameter for daily analytics
        const daysMatch = endpoint.match(/days=(\d+)/);
        const requestedDays = daysMatch ? parseInt(daysMatch[1]) : 30;
        const filteredData = mockDailyAnalytics.data.slice(-requestedDays);
        return {
          ...mockDailyAnalytics,
          data: filteredData
        } as ApiResponse<T>;
      } else if (endpoint.includes('/trash-bins/status')) {
        return mockTrashBinsWithStatus as ApiResponse<T>;
      }

      // Default empty response for other endpoints
      return {
        success: true,
        data: [] as T
      };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout (increased for large datasets)

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle rate limiting with exponential backoff
          if (response.status === 429 && attempt < retries - 1) {
            const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            console.warn(`Rate limited, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error as Error;

        // If it's an abort error or network error, retry
        if ((error instanceof Error && error.name === 'AbortError') ||
            (error instanceof TypeError && error.message.includes('fetch'))) {
          if (attempt < retries - 1) {
            console.warn(`Request failed (attempt ${attempt + 1}/${retries}), retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
        }

        console.error(`API call failed for ${endpoint}:`, error);
        throw error;
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  }

  // Trash Bins
  async getTrashBins(): Promise<ApiResponse<TrashBin[]>> {
    return this.fetchApi<TrashBin[]>('/api/trash-bins');
  }

  async getTrashBinsWithStatus(): Promise<ApiResponse<TrashBinWithStatus[]>> {
    return this.fetchApi<TrashBinWithStatus[]>('/api/trash-bins/status');
  }

  async getTrashBinById(id: string): Promise<ApiResponse<TrashBin>> {
    return this.fetchApi<TrashBin>(`/api/trash-bins/${id}`);
  }

  async getTrashBinsByLocation(area: string): Promise<ApiResponse<TrashBin[]>> {
    return this.fetchApi<TrashBin[]>(`/api/trash-bins/location/${area}`);
  }

  // Devices
  async getDevices(): Promise<ApiResponse<Device[]>> {
    return this.fetchApi<Device[]>('/api/devices');
  }

  async getDeviceById(id: string): Promise<ApiResponse<Device>> {
    return this.fetchApi<Device>(`/api/devices/${id}`);
  }

  async getDevicesByCategory(category: string): Promise<ApiResponse<Device[]>> {
    return this.fetchApi<Device[]>(`/api/devices/category/${category}`);
  }

  async getDevicesWithHealth(): Promise<ApiResponse<Device[]>> {
    return this.fetchApi<Device[]>('/api/devices');
  }

  async getDeviceStatistics(): Promise<ApiResponse<DeviceStatistics>> {
    return this.fetchApi<DeviceStatistics>('/api/devices/statistics');
  }

  async getDevicesByTrashBinId(trashbinid: string): Promise<ApiResponse<Device[]>> {
    return this.fetchApi<Device[]>(`/api/devices?trashbinid=${trashbinid}`);
  }

  // Analytics
  async getDashboardOverview(): Promise<ApiResponse<DashboardOverview>> {
    return this.fetchApi<DashboardOverview>('/api/analytics/dashboard');
  }

  async getWasteDistribution(): Promise<ApiResponse<WasteDistribution[]>> {
    return this.fetchApi<WasteDistribution[]>('/api/analytics/waste-distribution');
  }

  async getAggregatedComposition(): Promise<ApiResponse<AggregatedComposition>> {
    return this.fetchApi<AggregatedComposition>('/api/analytics/composition/aggregated');
  }

  async getDailyAnalytics(days?: number, category?: string, startDate?: string, endDate?: string, deviceId?: string): Promise<ApiResponse<DailyAnalytics[]>> {
    const params = new URLSearchParams();
    if (days) params.append('days', days.toString());
    if (category) params.append('category', category);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (deviceId) params.append('deviceId', deviceId);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetchApi<DailyAnalytics[]>(`/api/analytics/daily${query}`);
  }

  async getHourlyPatterns(deviceId?: string, category?: string): Promise<ApiResponse<HourlyPattern[]>> {
    const params = new URLSearchParams();
    if (deviceId) params.append('deviceId', deviceId);
    if (category) params.append('category', category);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetchApi<HourlyPattern[]>(`/api/analytics/hourly-patterns${query}`);
  }

  async getFiveMinuteIntervalData(deviceId?: string, category?: string, startDate?: string, endDate?: string): Promise<ApiResponse<DailyAnalytics[]>> {
    const params = new URLSearchParams();
    if (deviceId) params.append('deviceId', deviceId);
    if (category) params.append('category', category);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetchApi<DailyAnalytics[]>(`/api/analytics/intervals/5-minute${query}`);
  }

  async getFiveMinuteIntervalDataForBin(trashbinid: string, startDate?: string, endDate?: string): Promise<ApiResponse<DailyAnalytics[]>> {
    const params = new URLSearchParams();
    params.append('trashbinid', trashbinid);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetchApi<DailyAnalytics[]>(`/api/analytics/intervals/5-minute${query}`);
  }

  async getHourlyIntervalData(deviceId?: string, category?: string, startDate?: string, endDate?: string): Promise<ApiResponse<DailyAnalytics[]>> {
    const params = new URLSearchParams();
    if (deviceId) params.append('deviceId', deviceId);
    if (category) params.append('category', category);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetchApi<DailyAnalytics[]>(`/api/analytics/intervals/hourly${query}`);
  }

  async getHourlyIntervalDataForBin(trashbinid: string, startDate?: string, endDate?: string): Promise<ApiResponse<DailyAnalytics[]>> {
    const params = new URLSearchParams();
    params.append('trashbinid', trashbinid);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetchApi<DailyAnalytics[]>(`/api/analytics/intervals/hourly${query}`);
  }

  async getDailyAnalyticsForBin(trashbinid: string, days?: number, startDate?: string, endDate?: string): Promise<ApiResponse<DailyAnalytics[]>> {
    const params = new URLSearchParams();
    params.append('trashbinid', trashbinid);
    if (days) params.append('days', days.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.fetchApi<DailyAnalytics[]>(`/api/analytics/daily${query}`);
  }

  async getFillLevelDistribution(): Promise<ApiResponse<FillLevelDistribution[]>> {
    return this.fetchApi<FillLevelDistribution[]>('/api/analytics/fill-levels');
  }

  async getLocationAnalytics(): Promise<ApiResponse<LocationAnalytics[]>> {
    return this.fetchApi<LocationAnalytics[]>('/api/analytics/locations');
  }

  async getRealTimeData(deviceId: string, hours?: number): Promise<ApiResponse<RealTimeData[]>> {
    const query = hours ? `?hours=${hours}` : '';
    return this.fetchApi<RealTimeData[]>(`/api/analytics/devices/${deviceId}/realtime${query}`);
  }

  async getCollectionTrends(days?: number): Promise<ApiResponse<TrendData[]>> {
    const query = days ? `?days=${days}` : '';
    return this.fetchApi<TrendData[]>(`/api/analytics/collection-trends${query}`);
  }

  async getDeviceHealthTrends(days?: number): Promise<ApiResponse<TrendData[]>> {
    const query = days ? `?days=${days}` : '';
    return this.fetchApi<TrendData[]>(`/api/analytics/health-trends${query}`);
  }

  async getAlertStatistics(days?: number): Promise<ApiResponse<TrendData[]>> {
    const query = days ? `?days=${days}` : '';
    return this.fetchApi<TrendData[]>(`/api/analytics/alert-statistics${query}`);
  }
}

export const apiService = new ApiService();
export default apiService;