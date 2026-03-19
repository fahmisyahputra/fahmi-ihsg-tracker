"use server";

import { getPerformanceData as getPerfData, PerformanceStats } from "@/lib/performance-data";
import { DateRange } from "react-day-picker";

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
