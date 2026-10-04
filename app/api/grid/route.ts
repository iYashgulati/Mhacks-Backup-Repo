import { NextResponse } from "next/server";
import { getEiaGridSnapshot } from "@/lib/eia";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { mode: "demo", regions: [], error: "EIA_API_KEY is not configured" },
      { status: 503 },
    );
  }

  try {
    const regions = await getEiaGridSnapshot(apiKey);
    if (!regions.length) throw new Error("EIA returned no usable regional observations");
    const oldestObservationHours = Math.max(...regions.map((region) => region.sourceDelayHours));
    return NextResponse.json(
      {
        mode: "live",
        provider: "U.S. Energy Information Administration",
        updatedAt: new Date().toISOString(),
        oldestObservationHours,
        regions,
        methodology: "Production-based operational carbon intensity is estimated from EIA-930 hourly generation by fuel. The 24-hour forecast uses the most recent seven matching hourly observations when available.",
      },
      { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=300" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "EIA data request failed";
    return NextResponse.json(
      { mode: "demo", regions: [], error: message },
      { status: 502 },
    );
  }
}
