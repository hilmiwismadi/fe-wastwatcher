import { ChartData } from '../types';

// Slug to TrashBin ID mapping
export const binSlugToIdMapping: Record<string, string> = {
  'baratlt1': 'TB-BARAT-LT1',
  'baratlt2': 'TB-BARAT-LT2',
  'baratlt3': 'TB-BARAT-LT3',
  'baratlt4': 'TB-BARAT-LT4',
  'baratlt5': 'TB-BARAT-LT5',
  'baratlt6': 'TB-BARAT-LT6',
  'kantinlt1': 'TB_KANTIN_LT1',
  'selatanlt1': 'TB-SELATAN-LT1',
  'selatanlt2': 'TB-SELATAN-LT2',
  'selatanlt3': 'TB-SELATAN-LT3',
  'selatanlt4': 'TB-SELATAN-LT4',
  'selatanlt5': 'TB-SELATAN-LT5',
  'timurlt1': 'TB-TIMUR-LT1',
  'timurlt2': 'TB-TIMUR-LT2',
  'timurlt3': 'TB-TIMUR-LT3',
  'timurlt4': 'TB-TIMUR-LT4',
  'timurlt5': 'TB-TIMUR-LT5',
  'timurlt6': 'TB-TIMUR-LT6',
  'utaralt1': 'TB-UTARA-LT1',
  'utaralt2': 'TB-UTARA-LT2',
  'utaralt3': 'TB-UTARA-LT3',
  'utaralt4': 'TB-UTARA-LT4',
  'utaralt5': 'TB-UTARA-LT5',
  'utaralt6': 'TB-UTARA-LT6',
};

// Bin data mapping from slug to display name
export const binSlugMapping: Record<string, { name: string; battery: number; condition: string }> = {
  'kantinlt1': {
    name: 'Trash Bin Kantin LT 1',
    battery: 80,
    condition: 'Menumpuk di satu sisi'
  },
  'timurselasar': {
    name: 'Timur Selasar',
    battery: 75,
    condition: 'Normal'
  },
  'baratselasar': {
    name: 'Barat Selasar',
    battery: 85,
    condition: 'Normal'
  },
  'selatanselasar': {
    name: 'Selatan Selasar',
    battery: 70,
    condition: 'Terisi penuh'
  }
};

// Default fallback values
export const trashBinName = "Trash Bin Kantin LT 1";
export const batteryPercentage = 80;
export const condition = "Menumpuk di satu sisi";

// Get bin data by slug
export const getBinData = (slug: string) => {
  return binSlugMapping[slug.toLowerCase()] || {
    name: trashBinName,
    battery: batteryPercentage,
    condition: condition
  };
};

// Realistic hourly data with variable waste removal patterns
// Weight data in grams (1-5000g) with variative inputs
export const residueWeightData: ChartData[] = [
  { time: "06:00", value: 850 },   // Early morning baseline
  { time: "07:00", value: 1200 },  // +350g morning waste
  { time: "08:00", value: 1850 },  // +650g breakfast rush
  { time: "09:00", value: 2100 },  // +250g steady increase
  { time: "10:00", value: 1750 },  // -350g first cleaning/removal
  { time: "11:00", value: 2300 },  // +550g late morning activity
  { time: "12:00", value: 3200 },  // +900g lunch rush peak
  { time: "13:00", value: 3850 },  // +650g continued lunch
  { time: "14:00", value: 3100 },  // -750g major cleaning
  { time: "15:00", value: 3650 },  // +550g afternoon activity
  { time: "16:00", value: 4200 },  // +550g steady buildup
  { time: "17:00", value: 3800 },  // -400g partial cleaning
  { time: "18:00", value: 4100 },  // +300g evening start
];

export const residueVolumeData: ChartData[] = [
  { time: "06:00", value: 15 },   // Early morning
  { time: "07:00", value: 25 },   // +10% morning increase
  { time: "08:00", value: 45 },   // +20% breakfast period
  { time: "09:00", value: 52 },   // +7% steady rise
  { time: "10:00", value: 38 },   // -14% cleaning occurred
  { time: "11:00", value: 58 },   // +20% refilling
  { time: "12:00", value: 78 },   // +20% lunch rush
  { time: "13:00", value: 88 },   // +10% peak usage - ALERT WILL TRIGGER (>80%)
  { time: "14:00", value: 62 },   // -26% major cleaning
  { time: "15:00", value: 74 },   // +12% afternoon activity
  { time: "16:00", value: 85 },   // +11% building up - ALERT TRIGGERED
  { time: "17:00", value: 71 },   // -14% partial cleaning
  { time: "18:00", value: 79 },   // +8% evening use
];

export const organicWeightData: ChartData[] = [
  { time: "06:00", value: 450 },   // Morning start
  { time: "07:00", value: 680 },   // +230g breakfast prep
  { time: "08:00", value: 1150 },  // +470g heavy breakfast waste
  { time: "09:00", value: 1350 },  // +200g continued activity
  { time: "10:00", value: 950 },   // -400g emptied partially
  { time: "11:00", value: 1400 },  // +450g lunch prep starts
  { time: "12:00", value: 2200 },  // +800g lunch peak organic waste
  { time: "13:00", value: 2850 },  // +650g continued lunch
  { time: "14:00", value: 1900 },  // -950g major cleaning
  { time: "15:00", value: 2350 },  // +450g afternoon snacks
  { time: "16:00", value: 2800 },  // +450g buildup
  { time: "17:00", value: 2200 },  // -600g cleaning
  { time: "18:00", value: 2650 },  // +450g dinner prep starts
];

export const organicVolumeData: ChartData[] = [
  { time: "06:00", value: 18 },   // Morning baseline
  { time: "07:00", value: 32 },   // +14% breakfast waste
  { time: "08:00", value: 58 },   // +26% heavy organic waste
  { time: "09:00", value: 65 },   // +7% steady increase
  { time: "10:00", value: 45 },   // -20% cleaning done
  { time: "11:00", value: 68 },   // +23% lunch prep
  { time: "12:00", value: 89 },   // +21% lunch peak - ALERT TRIGGERED (>80%)
  { time: "13:00", value: 95 },   // +6% peak organic - FULL ALERT
  { time: "14:00", value: 52 },   // -43% major emptying
  { time: "15:00", value: 71 },   // +19% afternoon activity
  { time: "16:00", value: 83 },   // +12% building up - ALERT TRIGGERED
  { time: "17:00", value: 61 },   // -22% cleaning
  { time: "18:00", value: 78 },   // +17% dinner prep
];

export const anorganicWeightData: ChartData[] = [
  { time: "06:00", value: 320 },   // Light morning
  { time: "07:00", value: 520 },   // +200g packaging waste
  { time: "08:00", value: 890 },   // +370g breakfast packaging
  { time: "09:00", value: 1100 },  // +210g continued
  { time: "10:00", value: 750 },   // -350g cleaning
  { time: "11:00", value: 1200 },  // +450g activity increase
  { time: "12:00", value: 1850 },  // +650g lunch packaging peak
  { time: "13:00", value: 2300 },  // +450g continued lunch
  { time: "14:00", value: 1650 },  // -650g cleaning
  { time: "15:00", value: 2150 },  // +500g afternoon activity
  { time: "16:00", value: 2650 },  // +500g steady buildup
  { time: "17:00", value: 2100 },  // -550g partial cleaning
  { time: "18:00", value: 2450 },  // +350g evening activity
];

export const anorganicVolumeData: ChartData[] = [
  { time: "06:00", value: 12 },   // Light start
  { time: "07:00", value: 22 },   // +10% morning packaging
  { time: "08:00", value: 38 },   // +16% breakfast packaging
  { time: "09:00", value: 45 },   // +7% steady increase
  { time: "10:00", value: 28 },   // -17% cleaning
  { time: "11:00", value: 48 },   // +20% activity increase
  { time: "12:00", value: 68 },   // +20% lunch packaging
  { time: "13:00", value: 76 },   // +8% continued lunch
  { time: "14:00", value: 51 },   // -25% cleaning
  { time: "15:00", value: 67 },   // +16% afternoon
  { time: "16:00", value: 74 },   // +7% buildup
  { time: "17:00", value: 58 },   // -16% partial cleaning
  { time: "18:00", value: 69 },   // +11% evening activity
];