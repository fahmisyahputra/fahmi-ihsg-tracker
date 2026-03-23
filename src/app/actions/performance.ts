"use server";

import { getPerformanceData as getPerfData, PerformanceStats } from "@/lib/performance-data";
import { getAdvancedAnalytics as getAnalytics, getIpoAnalytics as getIpoData } from "@/lib/analytics-data";
import type { AdvancedAnalytics, IpoAnalytics } from "@/lib/analytics-data";
import { DateRange } from "react-day-picker";
import { getStartDateForTimeframe } from "@/utils/date-filters";

export async function fetchPerformanceData(filters: {
  year: string;
  range: string;
  customRange?: { from?: Date; to?: Date };
}): Promise<PerformanceStats> {
  // Convert optional DateRange fields to required for the lib function if needed
  const sanitizedCustomRange = filters.customRange?.from && filters.customRange?.to 
    ? { from: filters.customRange.from, to: filters.customRange.to } 
    : undefined;

  return await getPerfData({
    ...filters,
    customRange: sanitizedCustomRange,
  });
}

export async function fetchAdvancedAnalytics(filters?: {
  year: string;
  range: string;
  customRange?: { from?: Date; to?: Date };
  assetType?: string;
}): Promise<AdvancedAnalytics> {
  let dates: { startDate: Date; endDate: Date } | undefined;

  if (filters) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (filters.year === "custom" && filters.customRange?.from) {
      dates = {
        startDate: filters.customRange.from,
        endDate: filters.customRange.to || today,
      };
    } else {
      const start = getStartDateForTimeframe(filters.range);
      if (start) {
        dates = { startDate: start, endDate: today };
      }
    }
  }

  return await getAnalytics(dates, filters?.assetType || "all");
}

export async function fetchIpoAnalytics(filters?: {
  year: string;
  range: string;
  customRange?: { from?: Date; to?: Date };
}): Promise<IpoAnalytics> {
  let dates: { startDate: Date; endDate: Date } | undefined;

  if (filters) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (filters.year === "custom" && filters.customRange?.from) {
      dates = {
        startDate: filters.customRange.from,
        endDate: filters.customRange.to || today,
      };
    } else {
      const start = getStartDateForTimeframe(filters.range);
      if (start) {
        dates = { startDate: start, endDate: today };
      }
    }
  }

  return await getIpoData(dates);
}
