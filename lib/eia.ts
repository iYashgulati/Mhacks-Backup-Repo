import type { GenerationSource, LiveRegionUpdate, Region } from "./grid-data";

const EIA_BASE_URL = "https://api.eia.gov/v2/electricity/rto";
const CACHE_SECONDS = 300;

export const EIA_REGIONS = [
  { id: "caiso", respondent: "CISO", name: "California ISO" },
  { id: "ercot", respondent: "ERCO", name: "ERCOT" },
  { id: "pjm", respondent: "PJM", name: "PJM Interconnection" },
  { id: "miso", respondent: "MISO", name: "Midcontinent ISO" },
  { id: "spp", respondent: "SWPP", name: "Southwest Power Pool" },
  { id: "nyiso", respondent: "NYIS", name: "New York ISO" },
  { id: "isone", respondent: "ISNE", name: "ISO New England" },
  { id: "northwest", respondent: "BPAT", name: "Bonneville Power Administration" },
  { id: "southwest", respondent: "AZPS", name: "Arizona Public Service" },
  { id: "southeast", respondent: "SOCO", name: "Southern Company" },
] as const;

type EiaRow = {
  period: string;
  respondent: string;
  type?: string;
  fueltype?: string;
  value: string | number;
  [key: string]: string | number | undefined;
};

type EiaResponse = { response?: { data?: EiaRow[] } };

type FuelMeta = {
  name: string;
  factor: number;
  color: string;
  renewable: boolean;
  exclude?: boolean;
};

// Operational emissions in gCO₂/kWh. Non-combustion resources are zero here;
// this intentionally avoids mixing lifecycle and stack-emission accounting.
const FUEL_META: Record<string, FuelMeta> = {
  COL: { name: "Coal", factor: 1000, color: "#9a7454", renewable: false },
  NG: { name: "Natural Gas", factor: 490, color: "#a78bfa", renewable: false },
  OIL: { name: "Petroleum", factor: 780, color: "#e8794f", renewable: false },
  NUC: { name: "Nuclear", factor: 0, color: "#ef7bb3", renewable: false },
  WAT: { name: "Hydro", factor: 0, color: "#47a7ff", renewable: true },
  WND: { name: "Wind", factor: 0, color: "#6dd9b3", renewable: true },
  SUN: { name: "Solar", factor: 0, color: "#f4bd61", renewable: true },
  GEO: { name: "Geothermal", factor: 0, color: "#d7a564", renewable: true },
  BIO: { name: "Biomass", factor: 230, color: "#7bbf6a", renewable: true },
  OTH: { name: "Other", factor: 400, color: "#657086", renewable: false },
  UNK: { name: "Other", factor: 400, color: "#657086", renewable: false },
  PS: { name: "Storage", factor: 0, color: "#55c5d6", renewable: false, exclude: true },
};

type MixSnapshot = {
  period: string;
  carbon: number;
  renewable: number;
  generation: GenerationSource[];
};

function numberValue(value: string | number) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function periodDate(period: string) {
  return new Date(`${period}:00:00Z`);
}

function buildUrl(
  path: string,
  apiKey: string,
  extra: Record<string, string[]>,
  respondents: string[],
  length: number,
) {
  const params = new URLSearchParams({
    api_key: apiKey,
    frequency: "hourly",
    "data[0]": "value",
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    offset: "0",
    length: String(length),
  });
  respondents.forEach((respondent) => params.append("facets[respondent][]", respondent));
  Object.entries(extra).forEach(([key, values]) => {
    values.forEach((value) => params.append(key, value));
  });
  return `${EIA_BASE_URL}/${path}/data/?${params.toString()}`;
}

async function fetchEia(url: string): Promise<EiaRow[]> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    next: { revalidate: CACHE_SECONDS },
  });
  if (!response.ok) throw new Error(`EIA returned HTTP ${response.status}`);
  const payload = (await response.json()) as EiaResponse;
  return payload.response?.data ?? [];
}

function generationMix(rows: EiaRow[], period: string): MixSnapshot | null {
  const categories = new Map<string, { raw: number; color: string }>();
  let total = 0;
  let weightedCarbon = 0;
  let renewableGeneration = 0;

  rows.forEach((row) => {
    const meta = FUEL_META[row.fueltype ?? "OTH"] ?? FUEL_META.OTH;
    const value = Math.max(0, numberValue(row.value));
    if (meta.exclude || value <= 0) return;
    total += value;
    weightedCarbon += value * meta.factor;
    if (meta.renewable) renewableGeneration += value;
    const category = categories.get(meta.name) ?? { raw: 0, color: meta.color };
    category.raw += value;
    categories.set(meta.name, category);
  });

  if (total <= 0) return null;
  const generation = [...categories.entries()]
    .map(([name, category]) => ({
      name,
      value: Math.round((category.raw / total) * 100),
      color: category.color,
      raw: category.raw,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.raw - a.raw);

  const displayedTotal = generation.reduce((sum, item) => sum + item.value, 0);
  if (generation.length && displayedTotal !== 100) {
    generation[0].value += 100 - displayedTotal;
  }

  return {
    period,
    carbon: Math.round(weightedCarbon / total),
    renewable: Math.round((renewableGeneration / total) * 100),
    generation: generation.map(({ name, value, color }) => ({ name, value, color })),
  };
}

function mixHistory(rows: EiaRow[], respondent: string) {
  const respondentRows = rows.filter((row) => row.respondent === respondent);
  const periods = [...new Set(respondentRows.map((row) => row.period))].sort().reverse();
  return periods.flatMap((period) => {
    const mix = generationMix(
      respondentRows.filter((row) => row.period === period),
      period,
    );
    return mix ? [mix] : [];
  });
}

function carbonForecast(history: MixSnapshot[], now: Date) {
  const current = history[0]?.carbon ?? 0;
  const recentFallback = history.slice(0, 12).reduce((sum, item) => sum + item.carbon, 0)
    / Math.max(1, Math.min(12, history.length));

  return Array.from({ length: 24 }, (_, offset) => {
    if (offset === 0) return current;
    const targetHour = (now.getUTCHours() + offset) % 24;
    const sameHourSamples = history
      .slice(1)
      .filter((item) => periodDate(item.period).getUTCHours() === targetHour)
      .slice(0, 7);
    const profile = sameHourSamples.length
      ? sameHourSamples.reduce((sum, item) => sum + item.carbon, 0) / sameHourSamples.length
      : recentFallback;
    return Math.max(0, Math.round(profile * 0.85 + current * 0.15));
  });
}

function gridStatus(actual: number, forecast: number): Region["status"] {
  if (forecast <= 0) return "stable";
  const variance = actual / forecast;
  if (variance > 1.05) return "tight";
  if (variance < 0.95) return "surplus";
  return "stable";
}

async function fetchFuelHistory(apiKey: string) {
  const rows: EiaRow[] = [];
  const batchSize = 3;
  for (let index = 0; index < EIA_REGIONS.length; index += batchSize) {
    const batch = EIA_REGIONS.slice(index, index + batchSize);
    const results = await Promise.allSettled(
      batch.map((region) =>
        fetchEia(buildUrl("fuel-type-data", apiKey, {}, [region.respondent], 1800)),
      ),
    );
    results.forEach((result) => {
      if (result.status === "fulfilled") rows.push(...result.value);
    });
  }
  return rows;
}

export async function getEiaGridSnapshot(apiKey: string): Promise<LiveRegionUpdate[]> {
  const respondents = EIA_REGIONS.map((region) => region.respondent);
  const regionRowsPromise = fetchEia(
    buildUrl("region-data", apiKey, { "facets[type][]": ["D", "DF"] }, respondents, 1200),
  );
  const [regionRows, fuelRows] = await Promise.all([
    regionRowsPromise,
    fetchFuelHistory(apiKey),
  ]);
  const now = new Date();

  return EIA_REGIONS.flatMap((config) => {
    const demandRows = regionRows.filter(
      (row) => row.respondent === config.respondent && row.type === "D",
    );
    const currentDemandRow = demandRows[0];
    const currentDemand = numberValue(currentDemandRow?.value ?? 0);
    const matchingForecast = regionRows.find(
      (row) =>
        row.respondent === config.respondent &&
        row.type === "DF" &&
        row.period === currentDemandRow?.period,
    );
    const history = mixHistory(fuelRows, config.respondent);
    const currentMix = history[0];
    const previousMix = history[1];
    if (!currentMix || currentDemand <= 0) return [];

    const observedDate = periodDate(currentMix.period);
    const sourceDelayHours = Math.max(
      0,
      Number(((now.getTime() - observedDate.getTime()) / 3_600_000).toFixed(1)),
    );
    const trend = previousMix?.carbon
      ? Number((((currentMix.carbon - previousMix.carbon) / previousMix.carbon) * 100).toFixed(1))
      : 0;

    return [{
      id: config.id,
      carbon: currentMix.carbon,
      demand: Number((currentDemand / 1000).toFixed(1)),
      renewable: currentMix.renewable,
      trend,
      status: gridStatus(currentDemand, numberValue(matchingForecast?.value ?? 0)),
      generation: currentMix.generation,
      carbonForecast: carbonForecast(history, now),
      observedAt: currentMix.period,
      balancingAuthority: config.name,
      sourceDelayHours,
    } satisfies LiveRegionUpdate];
  });
}
