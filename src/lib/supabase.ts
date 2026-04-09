import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function incrementStat(statId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("increment_stat", { stat_id: statId });
  if (error) {
    console.error("Failed to increment stat:", error);
    return null;
  }
  return data;
}

export async function getStats(): Promise<{ totalConversions: number; totalVisits: number } | null> {
  const { data, error } = await supabase
    .from("stats")
    .select("id, count");
  if (error) {
    console.error("Failed to fetch stats:", error);
    return null;
  }
  const conversions = data?.find((r) => r.id === "total_conversions")?.count ?? 0;
  const visits = data?.find((r) => r.id === "total_visits")?.count ?? 0;
  return { totalConversions: conversions, totalVisits: visits };
}
