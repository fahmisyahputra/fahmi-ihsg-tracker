import { subDays, subMonths, subYears, startOfYear, startOfDay } from "date-fns";

/**
 * Robust date filtering logic for portfolio timeframes.
 * Returns the start date for a given timeframe string.
 */
export function getStartDateForTimeframe(timeframe: string): Date {
  const now = new Date();
  
  switch (timeframe.toUpperCase()) {
    case "1W":
      return subDays(now, 7);
    case "1M":
      return subMonths(now, 1);
    case "3M":
      return subMonths(now, 3);
    case "6M":
      return subMonths(now, 6);
    case "YTD":
      return startOfYear(now);
    case "1Y":
      return subYears(now, 1);
    case "ALL":
      return new Date(2010, 0, 1); // Historical fallback
    default:
      return startOfYear(now);
  }
}

/**
 * Filters an array of objects having a date property based on a timeframe.
 * @param data Array to filter
 * @param timeframe Timeframe string (1W, 1M, etc.)
 * @param dateKey The key in the object that contains the date (string or Date)
 */
export function filterDataByTimeframe<T>(
  data: T[],
  timeframe: string,
  dateKey: keyof T
): T[] {
  if (timeframe.toUpperCase() === "ALL") return data;
  
  const startDate = getStartDateForTimeframe(timeframe);
  const startTime = startOfDay(startDate).getTime();

  return data.filter((item) => {
    const dateVal = item[dateKey];
    const itemTime = (dateVal instanceof Date ? dateVal : new Date(dateVal as string)).getTime();
    return itemTime >= startTime;
  });
}
