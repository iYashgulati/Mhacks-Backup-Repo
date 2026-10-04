import { Region, regions } from "./grid-data";

export type OptimizerInput = {
  name: string;
  type: string;
  power: number;
  duration: number;
  earliestOffset: number;
  deadlineOffset: number;
  regionMode: "current" | "selected" | "anywhere";
  currentRegionId: string;
  selectedRegionIds: string[];
  carbonPriority: number;
};

export type ScheduleOption = {
  region: Region;
  startOffset: number;
  averageCarbon: number;
  averagePrice: number;
  energy: number;
  emissions: number;
  cost: number;
  score: number;
};

export async function getRegions() {
  return regions;
}

export async function getRegionCarbonIntensity(regionId: string) {
  return regions.find((region) => region.id === regionId)?.carbon ?? null;
}

export async function getRegionGenerationMix(regionId: string) {
  return regions.find((region) => region.id === regionId)?.generation ?? [];
}

export async function getCarbonForecast(regionId: string) {
  return regions.find((region) => region.id === regionId)?.carbonForecast ?? [];
}

export async function getElectricityPrice(regionId: string) {
  return regions.find((region) => region.id === regionId)?.price ?? null;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function runOptimizer(input: OptimizerInput): ScheduleOption[] {
  const allowedRegions =
    input.regionMode === "current"
      ? regions.filter((region) => region.id === input.currentRegionId)
      : input.regionMode === "selected"
        ? regions.filter((region) => input.selectedRegionIds.includes(region.id))
        : regions;

  const slots = Math.max(1, Math.ceil(input.duration));
  const latestStart = Math.max(
    input.earliestOffset,
    Math.min(23 - slots, input.deadlineOffset - slots),
  );
  const candidates: Omit<ScheduleOption, "score">[] = [];

  allowedRegions.forEach((region) => {
    for (let start = input.earliestOffset; start <= latestStart; start += 1) {
      const carbons = region.carbonForecast.slice(start, start + slots);
      const prices = region.priceForecast.slice(start, start + slots);
      const averageCarbon = average(carbons);
      const averagePrice = average(prices);
      const energy = input.power * input.duration;
      candidates.push({
        region,
        startOffset: start,
        averageCarbon,
        averagePrice,
        energy,
        emissions: (energy * averageCarbon) / 1000,
        cost: energy * (averagePrice / 1000),
      });
    }
  });

  const carbonValues = candidates.map((item) => item.emissions);
  const costValues = candidates.map((item) => item.cost);
  const minCarbon = Math.min(...carbonValues);
  const maxCarbon = Math.max(...carbonValues);
  const minCost = Math.min(...costValues);
  const maxCost = Math.max(...costValues);
  const carbonWeight = input.carbonPriority / 100;

  return candidates
    .map((candidate) => {
      const normalizedCarbon =
        (candidate.emissions - minCarbon) / Math.max(0.001, maxCarbon - minCarbon);
      const normalizedCost =
        (candidate.cost - minCost) / Math.max(0.001, maxCost - minCost);
      return {
        ...candidate,
        score: normalizedCarbon * carbonWeight + normalizedCost * (1 - carbonWeight),
      };
    })
    .sort((a, b) => a.score - b.score)
    .filter(
      (candidate, index, all) =>
        index === 0 ||
        all.slice(0, index).every(
          (other) =>
            other.region.id !== candidate.region.id ||
            Math.abs(other.startOffset - candidate.startOffset) > 2,
        ),
    )
    .slice(0, 3);
}

export function immediateOption(input: OptimizerInput): ScheduleOption {
  const region = regions.find((item) => item.id === input.currentRegionId) ?? regions[5];
  const slots = Math.max(1, Math.ceil(input.duration));
  const averageCarbon = average(region.carbonForecast.slice(0, slots));
  const averagePrice = average(region.priceForecast.slice(0, slots));
  const energy = input.power * input.duration;
  return {
    region,
    startOffset: 0,
    averageCarbon,
    averagePrice,
    energy,
    emissions: (energy * averageCarbon) / 1000,
    cost: energy * (averagePrice / 1000),
    score: 1,
  };
}
