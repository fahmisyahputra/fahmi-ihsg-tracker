"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

interface LastUpdatedProps {
  isoTimestamp: string;
}

export function LastUpdated({ isoTimestamp }: LastUpdatedProps) {
  const [formattedTime, setFormattedTime] = useState<string>("");

  useEffect(() => {
    const date = new Date(isoTimestamp);
    setFormattedTime(
      date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    );
  }, [isoTimestamp]);

  if (!formattedTime) return null;

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
      <span>Last updated at {formattedTime}</span>
      <RefreshCcw className="w-3 h-3 cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => window.location.reload()} />
    </div>
  );
}
