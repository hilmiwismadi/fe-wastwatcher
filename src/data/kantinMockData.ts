import { DailyAnalytics } from '../services/api';

// Special mock data for Kantin LT 1 (kantinlt1)
// Date: November 19, 2025
// 288 data points (5-minute intervals from 00:00 to 23:55)

// Helper function to generate realistic waste data with patterns
const generateWasteData = (
  hour: number,
  minute: number,
  category: 'Organic' | 'Anorganic' | 'Residue'
): { weight: number; volume: number } => {
  // Base patterns by hour (0-23)
  const hourlyPatterns = {
    Organic: [
      10, 8, 6, 5, 5, 8,    // 00:00-05:55 (night - minimal)
      15, 25, 40, 55, 60, 75, // 06:00-11:55 (morning rush, breakfast prep)
      95, 100, 85, 70, 60, 50, // 12:00-17:55 (lunch peak, then decline)
      40, 35, 30, 25, 20, 15  // 18:00-23:55 (evening, dinner, then decline)
    ],
    Anorganic: [
      5, 5, 4, 4, 4, 6,     // 00:00-05:55 (night - minimal)
      12, 20, 35, 45, 50, 60, // 06:00-11:55 (morning packaging)
      75, 80, 70, 60, 55, 45, // 12:00-17:55 (lunch packaging peak)
      40, 35, 30, 28, 25, 20  // 18:00-23:55 (evening decline)
    ],
    Residue: [
      3, 2, 2, 2, 2, 3,     // 00:00-05:55 (night - minimal)
      8, 12, 18, 25, 28, 32, // 06:00-11:55 (morning buildup)
      40, 45, 38, 32, 28, 25, // 12:00-17:55 (lunch peak then decline)
      22, 20, 18, 15, 12, 8   // 18:00-23:55 (evening decline)
    ]
  };

  let baseVolume = hourlyPatterns[category][hour];

  // Add minute-based variation (gradual increase within the hour)
  const minuteProgress = minute / 60; // 0.0 to ~0.92 (for 55 minutes)
  let minuteVariation = 0;

  // Check if this is a collection hour (waste removal)
  const isCollectionHour =
    hour === 10 || // Morning collection
    hour === 14 || // Afternoon collection
    hour === 18;   // Evening collection

  if (isCollectionHour && minute === 0) {
    // Sharp drop at collection time
    baseVolume = baseVolume * 0.3; // 70% reduction
  } else if (isCollectionHour && minute > 0 && minute <= 15) {
    // Gradual recovery after collection (0-15 minutes)
    const recoveryFactor = 0.3 + (minute / 15) * 0.4; // 30% to 70%
    baseVolume = hourlyPatterns[category][hour] * recoveryFactor;
  } else {
    // Normal gradual increase within hour (simulate accumulation)
    minuteVariation = minuteProgress * (hourlyPatterns[category][Math.min(hour + 1, 23)] - baseVolume) * 0.8;
  }

  const volume = Math.max(0, Math.min(100, baseVolume + minuteVariation));

  // Weight calculation (volume * capacity factor)
  // Organic is denser, Anorganic is lighter (packaging), Residue is mixed
  const densityFactor = {
    Organic: 2.5,    // 2.5 kg per 1% volume
    Anorganic: 1.2,  // 1.2 kg per 1% volume (light packaging)
    Residue: 1.8     // 1.8 kg per 1% volume
  };

  const weight = volume * densityFactor[category];

  return { weight: Math.round(weight * 100) / 100, volume: Math.round(volume * 10) / 10 };
};

// Generate all 288 data points for each category
const generateCategoryData = (
  category: 'Organic' | 'Anorganic' | 'Residue',
  deviceId: string
): DailyAnalytics[] => {
  const data: DailyAnalytics[] = [];

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const { weight, volume } = generateWasteData(hour, minute, category);

      // Create timestamp for 2025-11-19
      const timestamp = `2025-11-19T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
      const wibTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      data.push({
        time_interval: timestamp,
        wib_time_display: wibTime,
        deviceid: deviceId,
        category,
        avg_weight: weight,
        avg_volume: volume
      });
    }
  }

  return data;
};

// Export data for all three categories
export const kantinOrganicData = generateCategoryData('Organic', 'DVC-KANTIN-LT1-ORG');
export const kantinAnorganicData = generateCategoryData('Anorganic', 'DVC-KANTIN-LT1-ANO');
export const kantinResidueData = generateCategoryData('Residue', 'DVC-KANTIN-LT1-RES');

// Combined total data (aggregates all three categories)
export const kantinTotalData: DailyAnalytics[] = kantinOrganicData.map((org, index) => {
  const ano = kantinAnorganicData[index];
  const res = kantinResidueData[index];

  return {
    time_interval: org.time_interval,
    wib_time_display: org.wib_time_display,
    deviceid: 'TB-SELATAN-LT1',
    category: 'Total',
    avg_weight: org.avg_weight + ano.avg_weight + res.avg_weight,
    avg_volume: (org.avg_volume + ano.avg_volume + res.avg_volume) / 3 // Average volume
  };
});

// Helper function to get hourly aggregated data (24 points)
export const getKantinHourlyData = (categoryData: DailyAnalytics[]): DailyAnalytics[] => {
  const hourlyData: DailyAnalytics[] = [];

  for (let hour = 0; hour < 24; hour++) {
    // Get all data points for this hour (12 points: 00, 05, 10, ..., 55)
    const hourData = categoryData.filter((item) => {
      if (!item.time_interval) return false;
      const itemDate = new Date(item.time_interval);
      return itemDate.getUTCHours() === hour;
    });

    if (hourData.length > 0) {
      // Calculate average for the hour
      const avgWeight = hourData.reduce((sum, item) => sum + item.avg_weight, 0) / hourData.length;
      const avgVolume = hourData.reduce((sum, item) => sum + item.avg_volume, 0) / hourData.length;

      // Use the first data point's timestamp (XX:00)
      const firstPoint = hourData[0];

      hourlyData.push({
        time_interval: firstPoint.time_interval,
        wib_time_display: firstPoint.wib_time_display,
        deviceid: firstPoint.deviceid,
        category: firstPoint.category,
        avg_weight: Math.round(avgWeight * 100) / 100,
        avg_volume: Math.round(avgVolume * 10) / 10
      });
    }
  }

  return hourlyData;
};

// Helper function to get data for a specific hour (12 points: 5-minute intervals)
export const getKantinHourData = (
  categoryData: DailyAnalytics[],
  hour: number
): DailyAnalytics[] => {
  return categoryData.filter((item) => {
    if (!item.time_interval) return false;
    const itemDate = new Date(item.time_interval);
    return itemDate.getUTCHours() === hour;
  });
};

// Mock current status data for Kantin LT 1
export const kantinCurrentStatus = {
  organic: {
    weight: 125.5,
    volume: 52.3,
    deviceId: 'DVC-KANTIN-LT1-ORG'
  },
  anorganic: {
    weight: 68.2,
    volume: 45.7,
    deviceId: 'DVC-KANTIN-LT1-ANO'
  },
  residue: {
    weight: 42.8,
    volume: 38.2,
    deviceId: 'DVC-KANTIN-LT1-RES'
  }
};
