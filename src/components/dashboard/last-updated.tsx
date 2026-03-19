"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

interface LastUpdatedProps {
  isoTimestamp: string;
  isMarketTime: boolean;
}

export function LastUpdated({ isoTimestamp, isMarketTime }: LastUpdatedProps) {
  const [formattedDateTime, setFormattedDateTime] = useState<string>("");

  useEffect(() => {
    const date = new Date(isoTimestamp);
    
    // Format: "20 Mar, 16:14:50"
    const datePart = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
    
    const timePart = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    setFormattedDateTime(`${datePart}, ${timePart}`);
  }, [isoTimestamp]);

  if (!formattedDateTime) return null;

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
      <span>
        {isMarketTime ? "Market data as of" : "Updated at"} {formattedDateTime}
        {!isMarketTime && " (Delayed ~15m)"}
      </span>
      <RefreshCcw 
        className="w-3 h-3 cursor-pointer hover:text-zinc-300 transition-colors" 
        onClick={() => window.location.reload()} 
      />
    </div>
  );
}
