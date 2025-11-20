// Utility functions for date handling

export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTimeForInput = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getTodayDateString = (): string => {
  return formatDateForInput(new Date());
};

export const getCurrentTimeString = (): string => {
  return formatTimeForInput(new Date());
};

export const getStartOfDayString = (): string => {
  return "00:00";
};

export const getEndOfDayString = (): string => {
  return "23:59";
};

export const combineDateAndTime = (dateStr: string, timeStr: string): string => {
  return `${dateStr} ${timeStr}:00`;
};

// Get date range for dummy data (September 1 to November 2, 2025)
// Updated to match the actual seeded data range in the database
// Note: Most bins have data until Nov 2, while Kantin LT 1 has data until current date
export const getDummyDataDateRange = () => {
  // Most bins have data seeded until November 2, 2025
  const dataEndDate = new Date('2025-11-02');
  const today = new Date();

  // Use the earlier of: data end date or current date
  const endDate = today > dataEndDate ? dataEndDate : today;

  const startDate = new Date(endDate);
  startDate.setMonth(endDate.getMonth() - 2); // 2 months before end date

  return {
    start: formatDateForInput(startDate),
    end: formatDateForInput(endDate)
  };
};

// Check if date is within dummy data range
export const isDateInDummyRange = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const startDate = new Date("2025-09-01");
  const endDate = new Date("2025-11-02");

  return date >= startDate && date <= endDate;
};

// Get default date range (use current date if in dummy range, otherwise use dummy range)
export const getDefaultDateRange = () => {
  const today = getTodayDateString();
  const dummyRange = getDummyDataDateRange();

  // Since current date (2025-09-13) is outside dummy range, use dummy range
  if (!isDateInDummyRange(today)) {
    return {
      startDate: dummyRange.start,
      endDate: dummyRange.end,
      startTime: getStartOfDayString(),
      endTime: getEndOfDayString()
    };
  }

  // If current date is in dummy range, use today
  return {
    startDate: today,
    endDate: today,
    startTime: getStartOfDayString(),
    endTime: getEndOfDayString()
  };
};

// Get default date range for real-time sensor data
export const getRealTimeDefaultDateRange = () => {
  const now = new Date();
  const today = getTodayDateString();
  const currentTime = formatTimeForInput(now);

  return {
    startDate: today,
    endDate: today,
    startTime: getStartOfDayString(),
    endTime: currentTime
  };
};

// Time range types
export type TimeRange = 'minute' | 'fiveMinute' | 'hourly' | 'daily' | 'weekly';

// Get date range based on time range selector (for dummy data)
export const getTimeRangeDate = (timeRange: TimeRange) => {
  const dummyRange = getDummyDataDateRange();
  const dummyEndDate = new Date(dummyRange.end);

  switch (timeRange) {
    case 'minute':
      // Hourly view - 5-minute intervals (12 data points per hour: XX:00, XX:05, ..., XX:55)
      // Use September 15, 2025 at 14:00 (middle of dummy data range with good data coverage)
      const defaultHourMinute = new Date("2025-09-15T14:00:00");
      const hourStartMinute = new Date(defaultHourMinute);
      hourStartMinute.setMinutes(0, 0, 0);
      const hourEndMinute = new Date(hourStartMinute);
      hourEndMinute.setMinutes(59, 59, 999);

      return {
        startDate: formatDateForInput(hourStartMinute),
        endDate: formatDateForInput(hourEndMinute),
        startTime: formatTimeForInput(hourStartMinute),
        endTime: formatTimeForInput(hourEndMinute)
      };

    case 'fiveMinute':
      // Current hour only (5-min intervals) - from :00 to :59
      // Use the latest available time from dummy data
      const currentHour = new Date(dummyEndDate);
      const hourStart = new Date(currentHour);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setMinutes(59, 59, 999);

      return {
        startDate: formatDateForInput(hourStart),
        endDate: formatDateForInput(hourEnd),
        startTime: formatTimeForInput(hourStart),
        endTime: formatTimeForInput(hourEnd)
      };

    case 'hourly':
      // Last 24 hours with hourly intervals (Day view)
      const hourlyStart = new Date(dummyEndDate);
      hourlyStart.setDate(hourlyStart.getDate() - 1);
      return {
        startDate: formatDateForInput(hourlyStart),
        endDate: dummyRange.end,
        startTime: getStartOfDayString(),
        endTime: getEndOfDayString()
      };

    case 'daily':
      // Last 7 days from end of dummy data
      const dailyStart = new Date(dummyEndDate);
      dailyStart.setDate(dailyStart.getDate() - 7);
      return {
        startDate: formatDateForInput(dailyStart),
        endDate: dummyRange.end,
        startTime: getStartOfDayString(),
        endTime: getEndOfDayString()
      };

    case 'weekly':
      // Last 30 days (monthly view) from end of dummy data
      const weeklyStart = new Date(dummyEndDate);
      weeklyStart.setDate(weeklyStart.getDate() - 30);
      return {
        startDate: formatDateForInput(weeklyStart),
        endDate: dummyRange.end,
        startTime: getStartOfDayString(),
        endTime: getEndOfDayString()
      };

    default:
      return getDefaultDateRange();
  }
};

// Get date range based on time range selector (for real-time data)
export const getRealTimeRangeDate = (timeRange: TimeRange) => {
  const now = new Date();
  const today = formatDateForInput(now);
  const currentTime = formatTimeForInput(now);

  switch (timeRange) {
    case 'minute':
      // Current hour view - Full hour from :00 to :59 (minute intervals)
      const hourStartMinute = new Date(now);
      hourStartMinute.setMinutes(0, 0, 0);
      const hourEndMinute = new Date(now);
      hourEndMinute.setMinutes(59, 59, 999);

      return {
        startDate: formatDateForInput(hourStartMinute),
        endDate: formatDateForInput(hourEndMinute),
        startTime: formatTimeForInput(hourStartMinute),
        endTime: formatTimeForInput(hourEndMinute)
      };

    case 'fiveMinute':
      // Current hour view - Full hour from :00 to :59 (5-min intervals)
      const hourStart = new Date(now);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(now);
      hourEnd.setMinutes(59, 59, 999);

      return {
        startDate: formatDateForInput(hourStart),
        endDate: formatDateForInput(hourEnd),
        startTime: formatTimeForInput(hourStart),
        endTime: formatTimeForInput(hourEnd)
      };

    case 'hourly':
      // Full day view (Day view) - Today from 00:00 to 23:59
      return {
        startDate: today,
        endDate: today,
        startTime: getStartOfDayString(),
        endTime: getEndOfDayString()
      };

    case 'daily':
      // Last 7 days
      const dailyStart = new Date(now);
      dailyStart.setDate(dailyStart.getDate() - 7);
      return {
        startDate: formatDateForInput(dailyStart),
        endDate: today,
        startTime: getStartOfDayString(),
        endTime: currentTime
      };

    case 'weekly':
      // Last 30 days (monthly view)
      const weeklyStart = new Date(now);
      weeklyStart.setDate(weeklyStart.getDate() - 30);
      return {
        startDate: formatDateForInput(weeklyStart),
        endDate: today,
        startTime: getStartOfDayString(),
        endTime: currentTime
      };

    default:
      return getRealTimeDefaultDateRange();
  }
};