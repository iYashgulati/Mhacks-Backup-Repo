export type GenerationSource = {
  name: string;
  value: number;
  color: string;
};

export type Region = {
  id: string;
  name: string;
  area: string;
  carbon: number;
  price: number;
  demand: number;
  renewable: number;
  trend: number;
  status: "stable" | "tight" | "surplus";
  center: [number, number];
  path: string;
  generation: GenerationSource[];
  carbonForecast: number[];
  priceForecast: number[];
  observedAt?: string;
  balancingAuthority?: string;
  sourceDelayHours?: number;
  dataSource?: "eia";
};

export type LiveRegionUpdate = {
  id: string;
  carbon: number;
  demand: number;
  renewable: number;
  trend: number;
  generation: GenerationSource[];
  carbonForecast: number[];
  status: Region["status"];
  observedAt: string;
  balancingAuthority: string;
  sourceDelayHours: number;
};

const forecast = (values: number[], length = 24) =>
  Array.from({ length }, (_, index) => values[index % values.length]);

export const regions: Region[] = [
  {
    id: "northwest",
    name: "Northwest",
    area: "WA / OR / ID / MT",
    carbon: 118,
    price: 24,
    demand: 27.8,
    renewable: 71,
    trend: -3,
    status: "surplus",
    center: [146, 124],
    path: "M54 57 L249 64 L274 153 L242 220 L78 202 L48 130 Z",
    generation: [
      { name: "Hydro", value: 48, color: "#47a7ff" },
      { name: "Wind", value: 19, color: "#6dd9b3" },
      { name: "Natural Gas", value: 17, color: "#a78bfa" },
      { name: "Nuclear", value: 9, color: "#f4bd61" },
      { name: "Other", value: 7, color: "#657086" },
    ],
    carbonForecast: forecast([118, 152, 158, 162, 168, 171, 176, 182, 188, 191, 194, 189, 181, 174, 169, 165, 160, 156, 153, 151, 150, 151, 153, 156]),
    priceForecast: forecast([24, 22, 20, 19, 18, 19, 22, 27, 31, 34, 36, 35, 33, 31, 29, 28, 27, 26, 25, 24, 23, 23, 24, 24]),
  },
  {
    id: "caiso",
    name: "CAISO",
    area: "California",
    carbon: 184,
    price: 38,
    demand: 29.4,
    renewable: 58,
    trend: -11,
    status: "surplus",
    center: [100, 279],
    path: "M48 130 L114 163 L146 245 L126 365 L84 326 L55 238 Z",
    generation: [
      { name: "Solar", value: 34, color: "#f4bd61" },
      { name: "Natural Gas", value: 30, color: "#a78bfa" },
      { name: "Wind", value: 14, color: "#6dd9b3" },
      { name: "Hydro", value: 10, color: "#47a7ff" },
      { name: "Nuclear", value: 8, color: "#ef7bb3" },
      { name: "Other", value: 4, color: "#657086" },
    ],
    carbonForecast: forecast([184, 173, 160, 148, 137, 132, 139, 161, 198, 222, 238, 224, 190, 165, 149, 145, 159, 191, 236, 262, 249, 226, 208, 195]),
    priceForecast: forecast([38, 34, 30, 27, 25, 24, 26, 31, 42, 51, 57, 50, 42, 35, 31, 30, 34, 46, 61, 68, 59, 49, 43, 40]),
  },
  {
    id: "southwest",
    name: "Southwest",
    area: "AZ / NM / NV",
    carbon: 337,
    price: 29,
    demand: 24.1,
    renewable: 29,
    trend: 4,
    status: "stable",
    center: [210, 305],
    path: "M114 163 L250 183 L310 258 L298 368 L126 365 L146 245 Z",
    generation: [
      { name: "Natural Gas", value: 44, color: "#a78bfa" },
      { name: "Solar", value: 23, color: "#f4bd61" },
      { name: "Nuclear", value: 16, color: "#ef7bb3" },
      { name: "Coal", value: 10, color: "#9a7454" },
      { name: "Other", value: 7, color: "#657086" },
    ],
    carbonForecast: forecast([337, 326, 314, 302, 291, 287, 296, 319, 351, 368, 372, 358, 331, 305, 289, 284, 298, 326, 352, 370, 363, 354, 347, 341]),
    priceForecast: forecast([29, 27, 25, 24, 23, 23, 25, 29, 34, 38, 39, 37, 33, 29, 27, 27, 30, 35, 40, 42, 39, 35, 32, 30]),
  },
  {
    id: "miso",
    name: "MISO",
    area: "Midwest",
    carbon: 486,
    price: 27,
    demand: 73.6,
    renewable: 18,
    trend: 6,
    status: "tight",
    center: [484, 173],
    path: "M383 75 L538 82 L581 137 L550 245 L440 259 L383 190 Z",
    generation: [
      { name: "Natural Gas", value: 35, color: "#a78bfa" },
      { name: "Coal", value: 32, color: "#9a7454" },
      { name: "Wind", value: 16, color: "#6dd9b3" },
      { name: "Nuclear", value: 11, color: "#ef7bb3" },
      { name: "Other", value: 6, color: "#657086" },
    ],
    carbonForecast: forecast([486, 472, 455, 437, 421, 413, 424, 451, 493, 520, 531, 524, 501, 478, 461, 454, 468, 493, 516, 528, 519, 507, 498, 491]),
    priceForecast: forecast([27, 25, 23, 22, 21, 21, 23, 27, 32, 35, 36, 35, 32, 29, 27, 27, 29, 33, 37, 39, 36, 33, 30, 28]),
  },
  {
    id: "spp",
    name: "SPP",
    area: "Oklahoma / Kansas",
    carbon: 221,
    price: 25,
    demand: 39.8,
    renewable: 47,
    trend: -14,
    status: "surplus",
    center: [392, 267],
    path: "M275 153 L383 150 L440 259 L462 349 L313 350 L310 258 L250 183 Z",
    generation: [
      { name: "Wind", value: 43, color: "#6dd9b3" },
      { name: "Natural Gas", value: 31, color: "#a78bfa" },
      { name: "Coal", value: 15, color: "#9a7454" },
      { name: "Nuclear", value: 7, color: "#ef7bb3" },
      { name: "Other", value: 4, color: "#657086" },
    ],
    carbonForecast: forecast([221, 155, 154, 156, 163, 178, 198, 228, 267, 292, 303, 296, 278, 251, 224, 208, 211, 235, 264, 282, 271, 252, 239, 229]),
    priceForecast: forecast([25, 19, 17, 16, 17, 19, 22, 27, 32, 35, 36, 34, 31, 28, 26, 25, 26, 29, 33, 35, 32, 29, 27, 26]),
  },
  {
    id: "ercot",
    name: "ERCOT",
    area: "Texas",
    carbon: 412,
    price: 31,
    demand: 61.2,
    renewable: 34,
    trend: -8,
    status: "stable",
    center: [397, 397],
    path: "M298 344 L462 342 L505 395 L458 480 L392 452 L351 412 L307 405 Z",
    generation: [
      { name: "Natural Gas", value: 42, color: "#a78bfa" },
      { name: "Wind", value: 27, color: "#6dd9b3" },
      { name: "Solar", value: 14, color: "#f4bd61" },
      { name: "Nuclear", value: 10, color: "#ef7bb3" },
      { name: "Coal", value: 5, color: "#9a7454" },
      { name: "Other", value: 2, color: "#657086" },
    ],
    carbonForecast: forecast([412, 398, 376, 348, 315, 287, 278, 296, 337, 389, 431, 458, 466, 452, 423, 397, 385, 401, 438, 472, 481, 463, 441, 426]),
    priceForecast: forecast([31, 28, 25, 23, 21, 20, 22, 27, 34, 42, 49, 53, 51, 46, 39, 35, 34, 38, 45, 52, 55, 49, 41, 35]),
  },
  {
    id: "pjm",
    name: "PJM",
    area: "Mid-Atlantic",
    carbon: 354,
    price: 36,
    demand: 94.7,
    renewable: 19,
    trend: -2,
    status: "stable",
    center: [665, 219],
    path: "M550 137 L704 143 L770 198 L723 261 L601 278 L550 245 Z",
    generation: [
      { name: "Natural Gas", value: 39, color: "#a78bfa" },
      { name: "Nuclear", value: 30, color: "#ef7bb3" },
      { name: "Coal", value: 15, color: "#9a7454" },
      { name: "Wind", value: 8, color: "#6dd9b3" },
      { name: "Other", value: 8, color: "#657086" },
    ],
    carbonForecast: forecast([354, 342, 329, 316, 305, 301, 310, 333, 369, 397, 411, 407, 392, 371, 351, 339, 344, 363, 389, 405, 397, 381, 368, 360]),
    priceForecast: forecast([36, 33, 31, 29, 28, 28, 30, 35, 42, 47, 49, 48, 44, 40, 37, 36, 37, 41, 46, 49, 46, 42, 39, 37]),
  },
  {
    id: "nyiso",
    name: "NYISO",
    area: "New York",
    carbon: 238,
    price: 43,
    demand: 17.9,
    renewable: 32,
    trend: -5,
    status: "stable",
    center: [753, 133],
    path: "M665 82 L765 76 L820 111 L786 166 L704 143 Z",
    generation: [
      { name: "Natural Gas", value: 39, color: "#a78bfa" },
      { name: "Nuclear", value: 25, color: "#ef7bb3" },
      { name: "Hydro", value: 23, color: "#47a7ff" },
      { name: "Wind", value: 6, color: "#6dd9b3" },
      { name: "Other", value: 7, color: "#657086" },
    ],
    carbonForecast: forecast([238, 226, 214, 203, 196, 192, 201, 221, 249, 268, 276, 271, 258, 243, 231, 225, 229, 241, 258, 269, 263, 253, 247, 242]),
    priceForecast: forecast([43, 39, 36, 34, 33, 33, 36, 42, 50, 56, 58, 55, 51, 47, 44, 43, 44, 48, 54, 57, 54, 50, 47, 45]),
  },
  {
    id: "isone",
    name: "ISO-NE",
    area: "New England",
    carbon: 286,
    price: 46,
    demand: 14.3,
    renewable: 24,
    trend: 3,
    status: "tight",
    center: [837, 109],
    path: "M765 76 L851 49 L880 78 L855 140 L786 166 L820 111 Z",
    generation: [
      { name: "Natural Gas", value: 45, color: "#a78bfa" },
      { name: "Nuclear", value: 23, color: "#ef7bb3" },
      { name: "Hydro", value: 11, color: "#47a7ff" },
      { name: "Wind", value: 9, color: "#6dd9b3" },
      { name: "Other", value: 12, color: "#657086" },
    ],
    carbonForecast: forecast([286, 274, 261, 249, 241, 238, 246, 266, 295, 318, 329, 325, 311, 296, 282, 275, 280, 294, 313, 324, 318, 307, 298, 291]),
    priceForecast: forecast([46, 42, 39, 37, 36, 36, 39, 45, 53, 59, 62, 60, 56, 51, 48, 47, 49, 54, 60, 64, 61, 56, 52, 49]),
  },
  {
    id: "southeast",
    name: "Southeast",
    area: "Southeastern US",
    carbon: 448,
    price: 32,
    demand: 88.1,
    renewable: 16,
    trend: 7,
    status: "tight",
    center: [646, 363],
    path: "M462 259 L601 252 L723 261 L792 325 L752 430 L660 411 L612 349 L505 395 L462 349 Z",
    generation: [
      { name: "Natural Gas", value: 46, color: "#a78bfa" },
      { name: "Nuclear", value: 24, color: "#ef7bb3" },
      { name: "Coal", value: 14, color: "#9a7454" },
      { name: "Solar", value: 9, color: "#f4bd61" },
      { name: "Other", value: 7, color: "#657086" },
    ],
    carbonForecast: forecast([448, 435, 421, 406, 395, 389, 399, 426, 465, 491, 503, 498, 481, 459, 442, 435, 443, 464, 489, 501, 493, 477, 464, 455]),
    priceForecast: forecast([32, 29, 27, 26, 25, 25, 27, 31, 37, 42, 44, 43, 39, 35, 33, 32, 34, 38, 43, 45, 42, 38, 35, 33]),
  },
];

const seededForecasts = new Map(
  regions.map((region) => [region.id, [...region.carbonForecast]]),
);
const seededCarbon = new Map(regions.map((region) => [region.id, region.carbon]));

export function applyLiveRegionUpdates(updates: LiveRegionUpdate[]) {
  updates.forEach((update) => {
    const region = regions.find((item) => item.id === update.id);
    if (!region) return;
    const seedCarbon = seededCarbon.get(region.id) ?? region.carbon;
    const seedForecast = seededForecasts.get(region.id) ?? region.carbonForecast;
    const scale = update.carbon / Math.max(1, seedCarbon);

    region.carbon = update.carbon;
    region.demand = update.demand;
    region.renewable = update.renewable;
    region.trend = update.trend;
    region.status = update.status;
    region.generation = update.generation;
    region.carbonForecast = update.carbonForecast.length === 24
      ? update.carbonForecast
      : seedForecast.map((value, index) =>
          index === 0 ? update.carbon : Math.max(20, Math.round(value * scale)),
        );
    region.observedAt = update.observedAt;
    region.balancingAuthority = update.balancingAuthority;
    region.sourceDelayHours = update.sourceDelayHours;
    region.dataSource = "eia";
  });
}

export const REGION_OUTLINE =
  "M49 53 L110 35 L194 50 L270 55 L339 65 L409 60 L472 68 L521 58 L579 69 L632 67 L679 77 L754 69 L822 42 L879 58 L891 99 L861 150 L817 173 L793 228 L819 280 L797 324 L774 359 L757 432 L700 421 L660 440 L609 390 L550 411 L510 449 L461 489 L403 471 L358 437 L306 413 L258 398 L194 381 L145 371 L105 346 L79 310 L56 256 L45 198 L53 151 L39 105 Z";

export const regionById = (id: string) =>
  regions.find((region) => region.id === id) ?? regions[5];

export const carbonColor = (value: number) => {
  if (value < 150) return "#42d39a";
  if (value < 300) return "#a7cf62";
  if (value < 450) return "#e8b552";
  if (value < 600) return "#e8794f";
  return "#d34f53";
};

export const formatHour = (offset: number, baseHour = 0) => {
  const hour = (baseHour + offset + 24) % 24;
  if (offset === 0) return "Now";
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:00 ${suffix}`;
};

export type ScheduledJob = {
  id: string;
  name: string;
  type: string;
  status: "waiting" | "running";
  regionId: string;
  startOffset: number;
  duration: number;
  power: number;
  carbonSaved: number;
  costSaved: number;
  progress?: number;
};

export const initialJobs: ScheduledJob[] = [
  {
    id: "job-001",
    name: "Nightly feature pipeline",
    type: "Data Processing",
    status: "waiting",
    regionId: "northwest",
    startOffset: 3,
    duration: 2.5,
    power: 8.4,
    carbonSaved: 9.7,
    costSaved: 1.62,
  },
  {
    id: "job-002",
    name: "Render / product launch",
    type: "Rendering",
    status: "running",
    regionId: "caiso",
    startOffset: 0,
    duration: 3,
    power: 6.8,
    carbonSaved: 6.2,
    costSaved: 0.94,
    progress: 78,
  },
];
