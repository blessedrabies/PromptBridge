"use client";

import { useEffect, useState } from "react";
import { getStats, incrementStat } from "@/lib/supabase";

export function StatsBanner() {
  const [totalConversions, setTotalConversions] = useState<number | null>(null);

  useEffect(() => {
    // Track visit
    incrementStat("total_visits");

    // Fetch stats
    getStats().then((stats) => {
      if (stats) {
        setTotalConversions(stats.totalConversions);
      }
    });
  }, []);

  if (totalConversions === null) return null;

  return (
    <div className="flex justify-center gap-6 text-sm text-zinc-500">
      <span>
        <span className="font-mono text-zinc-300">{totalConversions.toLocaleString()}</span>{" "}
        conversions performed
      </span>
    </div>
  );
}
