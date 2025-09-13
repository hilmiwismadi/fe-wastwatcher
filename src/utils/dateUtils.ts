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

// Get date range for dummy data (August 13 to September 11, 2025)
export const getDummyDataDateRange = () => {
  return {
    start: "2025-08-13",
    end: "2025-09-11"
  };
};

// Check if date is within dummy data range
export const isDateInDummyRange = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const startDate = new Date("2025-08-13");
  const endDate = new Date("2025-09-11");

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

// Time range types
export type TimeRange = 'hourly' | 'daily' | 'weekly';

// Get date range based on time range selector
export const getTimeRangeDate = (timeRange: TimeRange) => {
  const dummyRange = getDummyDataDateRange();
  const dummyEndDate = new Date(dummyRange.end);

  switch (timeRange) {
    case 'hourly':
      // Last 24 hours from end of dummy data
      const hourlyStart = new Date(dummyEndDate);
      hourlyStart.setDate(hourlyStart.getDate() - 1);
      return {
        startDate: formatDateForInput(hourlyStart),
        endDate: dummyRange.end,
        startTime: getCurrentTimeString(),
        endTime: getCurrentTimeString()
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
      // Last 4 weeks (28 days) from end of dummy data
      const weeklyStart = new Date(dummyEndDate);
      weeklyStart.setDate(weeklyStart.getDate() - 28);
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