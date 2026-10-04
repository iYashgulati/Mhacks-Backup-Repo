"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  BatteryCharging,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  CloudCog,
  Cpu,
  DollarSign,
  Leaf,
  MapPin,
  Menu,
  Plus,
  Radar,
  RefreshCw,
  ServerCog,
  Sparkles,
  Trash2,
  TrendingDown,
  X,
  Zap,
} from "lucide-react";
import {
  REGION_OUTLINE,
  LiveRegionUpdate,
  ScheduledJob,
  applyLiveRegionUpdates,
  carbonColor,
  formatHour,
  initialJobs,
  regionById,
  regions,
} from "@/lib/grid-data";
import {
  OptimizerInput,
  ScheduleOption,
  immediateOption,
  runOptimizer,
} from "@/lib/grid-service";

type View = "grid" | "region" | "workloads" | "impact";
type Panel = "closed" | "form" | "results";
type FeedMode = "loading" | "live" | "demo";
type GridApiResponse = {
  mode: "live" | "demo";
  updatedAt?: string;
  oldestObservationHours?: number;
  regions: LiveRegionUpdate[];
  error?: string;
};

type ToastMessage = {
  title: string;
  message: string;
};

function formatObservation(period?: string) {
  if (!period) return "Not available";
  const date = new Date(`${period}:00:00Z`);
  return `${date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })} UTC`;
}

const initialInput: OptimizerInput = {
  name: "AI Training",
  type: "GPU",
  power: 4.2,
  duration: 4,
  earliestOffset: 0,
  deadlineOffset: 12,
  regionMode: "anywhere",
  currentRegionId: "ercot",
  selectedRegionIds: ["ercot", "spp", "caiso"],
  carbonPriority: 74,
};

const impactSeries = [
  { day: "SEP 21", saved: 12 },
  { day: "SEP 23", saved: 29 },
  { day: "SEP 25", saved: 51 },
  { day: "SEP 27", saved: 78 },
  { day: "SEP 29", saved: 116 },
  { day: "OCT 01", saved: 149 },
  { day: "TODAY", saved: 184 },
];

function Metric({
  label,
  value,
  unit,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  tone?: "green" | "amber" | "neutral";
}) {
  return (
    <div className="metric-card">
      <div className="eyebrow">{label}</div>
      <div className="metric-value">
        <span className={tone === "green" ? "text-clean" : tone === "amber" ? "text-warm" : ""}>
          {value}
        </span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {detail && (
        <div className={`metric-detail ${tone === "green" ? "positive" : ""}`}>
          {tone === "green" && <TrendingDown size={13} />}
          {detail}
        </div>
      )}
    </div>
  );
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const points = values
    .slice(0, 14)
    .map((value, index, list) => {
      const min = Math.min(...list);
      const max = Math.max(...list);
      const y = 32 - ((value - min) / Math.max(1, max - min)) * 26;
      return `${(index / (list.length - 1)) * 94 + 3},${y + 3}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 38" className="sparkline" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function GridMap({
  selectedId,
  onSelect,
  destinationId,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  destinationId?: string;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = hoveredId ? regionById(hoveredId) : null;
  const source = regionById(selectedId);
  const destination = destinationId ? regionById(destinationId) : null;
  const routePath = destination
    ? `M ${source.center[0]} ${source.center[1]} Q ${(source.center[0] + destination.center[0]) / 2} ${Math.min(source.center[1], destination.center[1]) - 90} ${destination.center[0]} ${destination.center[1]}`
    : "";

  return (
    <div className="map-wrap">
      <div className="map-grid" />
      <svg
        className="us-map"
        viewBox="0 0 930 525"
        role="img"
        aria-label="Interactive map of US electricity regions colored by carbon intensity"
      >
        <defs>
          <clipPath id="us-clip"><path d={REGION_OUTLINE} /></clipPath>
          <filter id="destination-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d={REGION_OUTLINE} className="map-shadow" />
        <g clipPath="url(#us-clip)">
          {regions.map((region) => {
            const isDestination = destinationId === region.id;
            return (
              <path
                key={region.id}
                d={region.path}
                fill={carbonColor(region.carbon)}
                fillOpacity={selectedId === region.id || isDestination ? 0.95 : 0.72}
                stroke={isDestination ? "#d8ffe9" : "#0d1a24"}
                strokeWidth={isDestination ? 4 : 2}
                className="region-shape"
                filter={isDestination ? "url(#destination-glow)" : undefined}
                onMouseEnter={() => setHoveredId(region.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(region.id)}
                onBlur={() => setHoveredId(null)}
                onClick={() => onSelect(region.id)}
                tabIndex={0}
                role="button"
                aria-label={`${region.name}, ${region.carbon} grams CO2 per kilowatt-hour`}
              />
            );
          })}
        </g>
        <path d={REGION_OUTLINE} fill="none" stroke="#8795a1" strokeOpacity=".5" strokeWidth="2.5" />
        {regions.map((region) => (
          <g key={`${region.id}-label`} className="map-label" aria-hidden="true">
            <circle cx={region.center[0]} cy={region.center[1] - 8} r="3.5" fill="#071118" stroke="#fff" strokeWidth="1.4" />
            <text x={region.center[0]} y={region.center[1] + 11} textAnchor="middle">{region.name}</text>
            <text className="map-label-value" x={region.center[0]} y={region.center[1] + 27} textAnchor="middle">{region.carbon}</text>
          </g>
        ))}
        {destination && (
          <g className="route-layer" aria-hidden="true">
            <path d={routePath} className="shift-route" />
            <circle r="7" className="route-dot"><animateMotion dur="2.1s" repeatCount="indefinite" path={routePath} /></circle>
            <circle cx={destination.center[0]} cy={destination.center[1] - 8} r="19" className="destination-ring" />
          </g>
        )}
      </svg>
      {hovered && (
        <div className="map-tooltip" role="status">
          <div className="tooltip-title">
            <span className="status-dot" style={{ background: carbonColor(hovered.carbon) }} />
            <strong>{hovered.name}</strong><span>{hovered.area}</span>
          </div>
          <div className="tooltip-grid">
            <div><small>Carbon</small><b>{hovered.carbon} <em>gCO₂/kWh</em></b></div>
            <div><small>Price</small><b>${hovered.price} <em>/MWh</em></b></div>
            <div><small>Demand</small><b>{hovered.demand} <em>GW</em></b></div>
            <div><small>Renewable</small><b>{hovered.renewable}<em>%</em></b></div>
          </div>
          <div className={hovered.trend < 0 ? "tooltip-trend down" : "tooltip-trend up"}>
            {hovered.trend < 0 ? "↓" : "↑"} {Math.abs(hovered.trend)}% carbon vs prior observation
          </div>
          {hovered.dataSource === "eia" && <div className="tooltip-source">EIA-930 · {formatObservation(hovered.observedAt)}</div>}
        </div>
      )}
    </div>
  );
}

function GridView({
  selectedId,
  onRegion,
  destinationId,
  onSchedule,
  feedMode,
  liveRegionCount,
  updatedAt,
  baseHour,
  clockLabel,
  onRefresh,
  isRefreshing,
}: {
  selectedId: string;
  onRegion: (id: string) => void;
  destinationId?: string;
  onSchedule: () => void;
  feedMode: FeedMode;
  liveRegionCount: number;
  updatedAt?: string;
  baseHour: number;
  clockLabel: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const selected = regionById(selectedId);
  const cleanestRegions = [...regions].sort((a, b) => a.carbon - b.carbon);
  const cleanest = cleanestRegions[0];
  const nationalAverage = Math.round(
    regions.reduce((sum, region) => sum + region.carbon, 0) / regions.length,
  );
  return (
    <div className="page-shell grid-view">
      <section className="section-heading map-heading">
        <div>
          <div className="breadcrumb"><span>GRID OPERATIONS</span><ChevronRight size={12} /><b>UNITED STATES</b></div>
          <h1>National Grid Carbon Monitor</h1>
          <p>{feedMode === "live" ? "EIA-powered regional signals for carbon-aware compute placement." : "Regional signals for carbon-aware compute placement."}</p>
        </div>
        <div className="heading-status">
          <span className="live-pulse" />
          <div><small>GRID SIGNAL</small><b>{feedMode === "live" ? "EIA connected" : feedMode === "loading" ? "Connecting…" : "Demo fallback"}</b></div>
          <span className="heading-separator" />
          <div><small>LAST REFRESH</small><b>{updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Waiting"}</b></div>
        </div>
      </section>

      <section className="national-layout">
        <aside className="map-rail left-rail">
          <div className="rail-block">
            <div className="eyebrow">US GRID SNAPSHOT</div>
            <div className="big-stat">{nationalAverage} <span>gCO₂/kWh</span></div>
            <div className="trend-pill down"><TrendingDown size={13} /> 4.8% last hour</div>
            <MiniSparkline values={[351, 346, 342, 339, 331, 325, 329, 321, 316, 313, 318, 311, 309, 314]} color="#6dd9b3" />
          </div>
          <div className="rail-block">
            <div className="eyebrow">CLEANEST NOW</div>
            <button className="clean-region" onClick={() => onRegion(cleanest.id)}>
              <span className="rank">01</span><div><b>{cleanest.name}</b><small>{cleanest.area}</small></div><strong>{cleanest.carbon}</strong>
            </button>
            {cleanestRegions.slice(1, 3).map((region, index) => (
              <button className="clean-region subdued" key={region.id} onClick={() => onRegion(region.id)}>
                <span className="rank">0{index + 2}</span><div><b>{region.name}</b><small>{region.area}</small></div><strong>{region.carbon}</strong>
              </button>
            ))}
          </div>
          <div className="rail-block legend-block">
            <div className="eyebrow">GRID CARBON INTENSITY</div>
            <div className="legend-bar" />
            <div className="legend-scale"><span>0</span><span>300</span><span>600+</span></div>
            <div className="legend-labels"><span>Very clean</span><span>Moderate</span><span>Intensive</span></div>
          </div>
        </aside>

        <div className="map-panel">
          <div className="map-toolbar">
            <div className="segmented"><button className="active">Carbon intensity</button><button>Price</button><button>Demand</button></div>
            <div className="map-toolbar-right">
              <div className="map-time"><Clock3 size={13} /> NOW · {clockLabel}</div>
              <button className="refresh-button" onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh EIA grid data" title="Refresh EIA grid data">
                <RefreshCw size={13} className={isRefreshing ? "spinning" : ""} />
                {isRefreshing ? "REFRESHING" : "REFRESH EIA"}
              </button>
            </div>
          </div>
          <GridMap selectedId={selectedId} onSelect={onRegion} destinationId={destinationId} />
          <div className="map-footer"><span><CircleDot size={12} /> Click a region to inspect forecast and generation mix</span><span>{feedMode === "live" ? `${liveRegionCount} EIA balancing areas live` : "10 balancing areas monitored"}</span></div>
        </div>

        <aside className="map-rail right-rail">
          <div className="selected-region-head">
            <div><div className="eyebrow">SELECTED REGION</div><h2>{selected.name}</h2><p><MapPin size={13} /> {selected.area}</p></div>
            <span className={`grid-status ${selected.status}`}>{selected.status}</span>
          </div>
          <div className="signal-score">
            <div className="score-ring" style={{ "--score-color": carbonColor(selected.carbon) } as React.CSSProperties}><strong>{selected.carbon}</strong><span>gCO₂/kWh</span></div>
            <div><small>CARBON SIGNAL</small><b>{selected.carbon < 300 ? "Favorable" : selected.carbon < 450 ? "Moderate" : "Constrained"}</b><em>{selected.trend < 0 ? "Improving" : "Rising"}</em></div>
          </div>
          <div className="region-mini-grid">
            <div><small>POWER PRICE</small><b>${selected.price}<em>/MWh</em></b></div>
            <div><small>GRID DEMAND</small><b>{selected.demand}<em> GW</em></b></div>
            <div><small>RENEWABLE</small><b>{selected.renewable}<em>%</em></b></div>
            <div><small>1H TREND</small><b className={selected.trend < 0 ? "text-clean" : "text-hot"}>{selected.trend > 0 ? "+" : ""}{selected.trend}<em>%</em></b></div>
          </div>
          {selected.dataSource === "eia" && (
            <div className="source-provenance">
              <div><small>LIVE SOURCE</small><b>EIA-930 · {selected.balancingAuthority}</b></div>
              <div><small>OBSERVED</small><b>{formatObservation(selected.observedAt)}</b></div>
              <span className={(selected.sourceDelayHours ?? 0) > 6 ? "stale" : "fresh"}>{Math.round(selected.sourceDelayHours ?? 0)}H DELAY</span>
            </div>
          )}
          <div className="window-callout"><div><Sparkles size={15} /><span>Next clean window</span></div><b>{formatHour(2, baseHour)} – {formatHour(5, baseHour)}</b><p>Up to 43% lower carbon intensity</p></div>
          <button className="primary-button full" onClick={() => onRegion(selected.id)}>Open region dashboard <ArrowRight size={15} /></button>
          <button className="secondary-button full" onClick={onSchedule}><Plus size={15} /> Schedule workload here</button>
        </aside>
      </section>
    </div>
  );
}

function RegionView({
  regionId,
  onBack,
  onSchedule,
  feedMode,
  baseHour,
}: {
  regionId: string;
  onBack: () => void;
  onSchedule: () => void;
  feedMode: FeedMode;
  baseHour: number;
}) {
  const region = regionById(regionId);
  const chartData = (() => {
    const history = [region.carbon + 42, region.carbon + 29, region.carbon + 18, region.carbon + 10];
    return [
      ...history.map((value, index) => ({ hour: formatHour(index - 4, baseHour), actual: value, forecast: undefined as number | undefined, index: index - 4 })),
      ...region.carbonForecast.slice(0, 21).map((value, index) => ({ hour: formatHour(index, baseHour), actual: index === 0 ? value : undefined, forecast: value, index })),
    ];
  })();
  const minCarbon = Math.min(...region.carbonForecast);
  const minIndex = region.carbonForecast.indexOf(minCarbon);

  return (
    <div className="page-shell detail-page">
      <section className="detail-header">
        <button className="back-button" onClick={onBack}><ArrowLeft size={16} /> US Grid</button>
        <div className="detail-title"><span className="region-mark" style={{ background: carbonColor(region.carbon) }} /><div><div className="breadcrumb"><span>REGION</span><ChevronRight size={12} /><b>{region.id.toUpperCase()}</b></div><h1>{region.name} <span>— {region.area}</span></h1></div></div>
        <div className="detail-actions"><span className={`demo-data ${feedMode === "live" ? "is-live" : ""}`}><span className="live-pulse" /> {feedMode === "live" ? `EIA-930 · ${Math.round(region.sourceDelayHours ?? 0)}H SOURCE DELAY` : feedMode === "loading" ? "CONNECTING TO EIA" : "SIMULATED GRID FEED"}</span><button className="primary-button" onClick={onSchedule}><Plus size={15} /> Schedule workload</button></div>
      </section>
      <section className="metrics-row">
        <Metric label="Carbon intensity" value={String(region.carbon)} unit="gCO₂/kWh" detail={`${Math.abs(region.trend)}% carbon vs prior observation`} tone={region.trend < 0 ? "green" : "amber"} />
        <Metric label="Electricity price" value={`$${region.price}`} unit="/MWh" detail="Simulated market signal" />
        <Metric label="Grid demand" value={region.demand.toFixed(1)} unit="GW" detail={region.dataSource === "eia" ? `Observed ${formatObservation(region.observedAt)}` : "81% of forecast peak"} />
        <Metric label="Renewable generation" value={`${region.renewable}%`} detail={region.renewable > 30 ? "Above 7-day average" : "Below 7-day average"} tone={region.renewable > 30 ? "green" : "neutral"} />
      </section>

      <section className="detail-grid">
        <div className="chart-card carbon-chart-card">
          <div className="card-heading"><div><div className="eyebrow">{feedMode === "live" ? "EIA-ANCHORED RECENT-HOUR MODEL" : "CARBON FORECAST"}</div><h2>Carbon Intensity — Next 24 Hours</h2></div><div className="chart-legend"><span><i className="actual" /> Historical</span><span><i className="forecast" /> Forecast</span></div></div>
          <div className="clean-window-label"><Sparkles size={14} /><div><small>CLEANEST WINDOW</small><b>{formatHour(minIndex, baseHour)} – {formatHour(minIndex + 3, baseHour)}</b><span>{minCarbon} gCO₂/kWh</span></div></div>
          <div className="chart-container large-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 4, right: 16, top: 14, bottom: 0 }}>
                <defs><linearGradient id="carbonArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70dba8" stopOpacity={0.28} /><stop offset="100%" stopColor="#70dba8" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#23323d" strokeDasharray="2 6" vertical={false} />
                <XAxis dataKey="hour" stroke="#6d7b87" fontSize={10} tickLine={false} axisLine={false} interval={3} />
                <YAxis stroke="#6d7b87" fontSize={10} tickLine={false} axisLine={false} width={40} domain={[0, "dataMax + 80"]} />
                <Tooltip contentStyle={{ background: "#0c171f", border: "1px solid #2b3a45", borderRadius: 3, fontSize: 12 }} labelStyle={{ color: "#8fa0ac" }} />
                <ReferenceArea x1={formatHour(minIndex, baseHour)} x2={formatHour(minIndex + 3, baseHour)} fill="#45d89b" fillOpacity={0.07} stroke="#45d89b" strokeOpacity={0.25} />
                <ReferenceLine x="Now" stroke="#d8e3e8" strokeDasharray="3 4" label={{ value: "NOW", position: "top", fill: "#d8e3e8", fontSize: 9 }} />
                <Area type="monotone" dataKey="forecast" stroke="#70dba8" strokeWidth={2.3} fill="url(#carbonArea)" connectNulls />
                <Line type="monotone" dataKey="actual" stroke="#d8e3e8" strokeWidth={1.8} dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card generation-card">
          <div className="card-heading"><div><div className="eyebrow">GENERATION MIX · {feedMode === "live" ? "EIA-930" : "DEMO"}</div><h2>Current Supply</h2></div><span className="capacity">{region.demand.toFixed(1)} GW LOAD</span></div>
          <div className="generation-visual">
            <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={region.generation} dataKey="value" innerRadius={56} outerRadius={74} paddingAngle={2} stroke="none">{region.generation.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie></PieChart></ResponsiveContainer><div className="donut-center"><b>{region.renewable}%</b><span>renewable</span></div></div>
            <div className="generation-list">{region.generation.map((item) => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><b>{item.value}%</b></div>)}</div>
          </div>
          <div className="mix-bar">{region.generation.map((item) => <span key={item.name} style={{ width: `${item.value}%`, background: item.color }} />)}</div>
        </div>

        <div className="chart-card market-card">
          <div className="card-heading"><div><div className="eyebrow">MARKET SIGNAL</div><h2>Electricity Price</h2></div><span className="price-now">${region.price}<small>/MWh</small></span></div>
          <div className="chart-container small-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={region.priceForecast.map((price, index) => ({ hour: formatHour(index, baseHour), price }))} margin={{ left: -25, right: 8, top: 10 }}><CartesianGrid stroke="#23323d" strokeDasharray="2 6" vertical={false} /><XAxis dataKey="hour" stroke="#6d7b87" fontSize={9} tickLine={false} axisLine={false} interval={5} /><YAxis stroke="#6d7b87" fontSize={9} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: "#0c171f", border: "1px solid #2b3a45", borderRadius: 3, fontSize: 11 }} /><Line type="monotone" dataKey="price" stroke="#e8b552" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
        </div>

        <div className="chart-card dispatch-card">
          <div className="card-heading"><div><div className="eyebrow">COMPUTE DISPATCH</div><h2>Best time to run</h2></div></div>
          <div className="dispatch-window"><div className="dispatch-icon"><Zap size={20} /></div><div><small>RECOMMENDED START</small><b>{formatHour(minIndex, baseHour)}</b><p>Carbon intensity falls to <strong>{minCarbon} gCO₂/kWh</strong></p></div></div>
          <button className="primary-button full" onClick={onSchedule}>Optimize a workload <ArrowRight size={15} /></button>
        </div>
      </section>
    </div>
  );
}

function WorkloadsView({
  jobs,
  onSchedule,
  onDelete,
  onClear,
  baseHour,
}: {
  jobs: ScheduledJob[];
  onSchedule: () => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  baseHour: number;
}) {
  return (
    <div className="page-shell workloads-page">
      <section className="section-heading"><div><div className="breadcrumb"><span>OPERATIONS</span><ChevronRight size={12} /><b>WORKLOADS</b></div><h1>Compute Dispatch Queue</h1><p>Flexible workloads automatically aligned to cleaner, lower-cost grid windows.</p></div><div className="workload-actions"><button className="danger-button" onClick={onClear} disabled={!jobs.length}><Trash2 size={14} /> Clear queue</button><button className="primary-button" onClick={onSchedule}><Plus size={15} /> Schedule workload</button></div></section>
      <section className="queue-summary">
        <Metric label="Waiting" value={String(jobs.filter((job) => job.status === "waiting").length)} detail="Queued for cleaner grid" tone="green" />
        <Metric label="Running" value={String(jobs.filter((job) => job.status === "running").length)} detail="Across 2 regions" />
        <Metric label="Energy queued" value={jobs.reduce((sum, job) => sum + job.power * job.duration, 0).toFixed(1)} unit="kWh" detail="Next 12 hours" />
        <Metric label="Carbon avoided" value={jobs.reduce((sum, job) => sum + job.carbonSaved, 0).toFixed(1)} unit="kg CO₂" detail="Across active queue" tone="green" />
      </section>
      <section className="table-card">
        <div className="table-title"><div><div className="eyebrow">ACTIVE WORKLOADS</div><h2>Dispatch schedule</h2></div><span>{jobs.length} JOBS</span></div>
        <div className="jobs-table">
          <div className="job-row job-header"><span>Workload</span><span>Status</span><span>Schedule</span><span>Region</span><span>Energy</span><span>Carbon saved</span><span>Progress</span><span>Actions</span></div>
          {jobs.map((job) => {
            const region = regionById(job.regionId);
            return (
              <div className="job-row" key={job.id}>
                <div className="job-name"><span className="job-icon"><Cpu size={15} /></span><div><b>{job.name}</b><small>{job.type} · {job.id}</small></div></div>
                <div><span className={`job-status ${job.status}`}><i />{job.status === "waiting" ? "Waiting for cleaner grid" : "Running"}</span></div>
                <div className="job-time"><b>{formatHour(job.startOffset, baseHour)}</b><small>{job.duration}h duration</small></div>
                <div className="job-region"><i style={{ background: carbonColor(region.carbon) }} /><div><b>{region.name}</b><small>{region.area}</small></div></div>
                <div><b>{(job.power * job.duration).toFixed(1)} kWh</b></div>
                <div className="saved"><b>{job.carbonSaved.toFixed(1)} kg</b><small>${job.costSaved.toFixed(2)} saved</small></div>
                <div>{job.status === "running" ? <div className="progress-cell"><div><span style={{ width: `${job.progress}%` }} /></div><b>{job.progress}%</b></div> : <div className="countdown"><Clock3 size={13} /> Starts in {job.startOffset}h 00m</div>}</div>
                <div><button className="delete-job" onClick={() => onDelete(job.id)} aria-label={`Delete ${job.name}`} title={`Delete ${job.name}`}><Trash2 size={14} /></button></div>
              </div>
            );
          })}
          {!jobs.length && <div className="empty-queue"><ServerCog size={24} /><div><b>Dispatch queue is empty</b><p>Schedule a flexible workload to generate a carbon-aware run plan.</p></div><button className="secondary-button" onClick={onSchedule}><Plus size={14} /> Schedule workload</button></div>}
        </div>
      </section>
    </div>
  );
}

function ImpactView({ jobs }: { jobs: ScheduledJob[] }) {
  const additions = jobs.filter((job) => !job.id.startsWith("job-00"));
  const addedCarbon = additions.reduce((sum, job) => sum + job.carbonSaved, 0);
  const addedEnergy = additions.reduce((sum, job) => sum + job.power * job.duration, 0);
  const addedCost = additions.reduce((sum, job) => sum + job.costSaved, 0);
  const data = impactSeries.map((point, index) => index === impactSeries.length - 1 ? { ...point, saved: point.saved + addedCarbon } : point);
  return (
    <div className="page-shell impact-page">
      <section className="section-heading"><div><div className="breadcrumb"><span>ANALYTICS</span><ChevronRight size={12} /><b>IMPACT</b></div><h1>Carbon & Cost Impact</h1><p>Verified savings from shifting flexible compute across space and time.</p></div><div className="period-select">LAST 30 DAYS <ChevronRight size={13} /></div></section>
      <section className="impact-hero-grid">
        <div className="impact-stat primary-impact"><div className="impact-icon"><Leaf size={20} /></div><div className="eyebrow">CARBON AVOIDED</div><strong>{(184 + addedCarbon).toFixed(1)}</strong><span>kg CO₂e</span><p><TrendingDown size={14} /> Equivalent to {Math.round((184 + addedCarbon) * 2.5)} miles not driven</p></div>
        <div className="impact-stat"><div className="impact-icon"><BatteryCharging size={20} /></div><div className="eyebrow">COMPUTE SHIFTED</div><strong>{Math.round(312 + addedEnergy)}</strong><span>kWh</span><p>Across {23 + additions.length} optimized runs</p></div>
        <div className="impact-stat"><div className="impact-icon"><BadgeDollarSign size={20} /></div><div className="eyebrow">MONEY SAVED</div><strong>${(47.21 + addedCost).toFixed(2)}</strong><span>USD</span><p>18.4% below baseline</p></div>
        <div className="impact-stat"><div className="impact-icon"><CloudCog size={20} /></div><div className="eyebrow">WORKLOADS OPTIMIZED</div><strong>{23 + additions.length}</strong><span>jobs</span><p>92% completed on schedule</p></div>
      </section>
      <section className="impact-layout">
        <div className="chart-card impact-chart"><div className="card-heading"><div><div className="eyebrow">CUMULATIVE PERFORMANCE</div><h2>Carbon Saved Over Time</h2></div><div className="impact-change">+31% <small>vs prior period</small></div></div><div className="chart-container impact-chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ left: 5, right: 10, top: 20 }}><defs><linearGradient id="impactArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#45d89b" stopOpacity={0.28} /><stop offset="100%" stopColor="#45d89b" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#23323d" strokeDasharray="2 6" vertical={false} /><XAxis dataKey="day" stroke="#6d7b87" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#6d7b87" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: "#0c171f", border: "1px solid #2b3a45", borderRadius: 3 }} /><Area type="monotone" dataKey="saved" stroke="#45d89b" strokeWidth={2.4} fill="url(#impactArea)" /></AreaChart></ResponsiveContainer></div></div>
        <div className="chart-card region-impact"><div className="card-heading"><div><div className="eyebrow">BY DESTINATION</div><h2>Carbon avoided by region</h2></div></div><div className="chart-container region-bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={[{ name: "Northwest", value: 68 }, { name: "SPP", value: 52 }, { name: "CAISO", value: 37 }, { name: "NYISO", value: 19 }, { name: "Other", value: 8 }]} margin={{ left: 12, right: 12 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" stroke="#8fa0ac" fontSize={10} tickLine={false} axisLine={false} width={68} /><Bar dataKey="value" fill="#45d89b" radius={[0, 2, 2, 0]} barSize={13} /></BarChart></ResponsiveContainer></div></div>
      </section>
    </div>
  );
}

function OptimizerPanel({
  panel,
  input,
  setInput,
  results,
  selectedResult,
  setSelectedResult,
  onClose,
  onRun,
  onSchedule,
  baseHour,
}: {
  panel: Panel;
  input: OptimizerInput;
  setInput: React.Dispatch<React.SetStateAction<OptimizerInput>>;
  results: ScheduleOption[];
  selectedResult: number;
  setSelectedResult: (index: number) => void;
  onClose: () => void;
  onRun: () => void;
  onSchedule: () => void;
  baseHour: number;
}) {
  if (panel === "closed") return null;
  const immediate = immediateOption(input);
  const best = results[selectedResult];
  const carbonReduction = best ? Math.round((1 - best.emissions / immediate.emissions) * 100) : 0;
  const costReduction = best ? Math.round((1 - best.cost / immediate.cost) * 100) : 0;
  return (
    <div className="panel-backdrop" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <aside className="optimizer-panel" role="dialog" aria-modal="true" aria-label="Schedule a workload">
        <div className="panel-header"><div><div className="eyebrow">CARBON-AWARE DISPATCH</div><h2>{panel === "form" ? "Schedule a Workload" : "Optimization Results"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {panel === "form" ? (
          <div className="panel-body form-body">
            <div className="form-section"><label>Workload name</label><input value={input.name} onChange={(event) => setInput((state) => ({ ...state, name: event.target.value }))} placeholder="Train recommendation model" /></div>
            <div className="form-grid">
              <div className="form-section"><label>Compute type</label><select value={input.type} onChange={(event) => setInput((state) => ({ ...state, type: event.target.value }))}>{["GPU", "CPU", "Batch", "Rendering", "Data Processing"].map((type) => <option key={type}>{type}</option>)}</select></div>
              <div className="form-section"><label>Estimated power</label><div className="input-unit"><input type="number" min="0.1" step="0.1" value={input.power} onChange={(event) => setInput((state) => ({ ...state, power: Number(event.target.value) }))} /><span>kW</span></div></div>
              <div className="form-section"><label>Duration</label><div className="input-unit"><input type="number" min="1" max="12" value={input.duration} onChange={(event) => setInput((state) => ({ ...state, duration: Number(event.target.value) }))} /><span>hours</span></div></div>
              <div className="form-section"><label>Earliest start</label><select value={input.earliestOffset} onChange={(event) => setInput((state) => ({ ...state, earliestOffset: Number(event.target.value) }))}><option value={0}>Now</option><option value={1}>In 1 hour</option><option value={2}>In 2 hours</option></select></div>
            </div>
            <div className="form-section"><label>Deadline</label><select value={input.deadlineOffset} onChange={(event) => setInput((state) => ({ ...state, deadlineOffset: Number(event.target.value) }))}><option value={8}>Tomorrow 4:00 AM</option><option value={12}>Tomorrow 8:00 AM</option><option value={16}>Tomorrow 12:00 PM</option><option value={23}>Within 24 hours</option></select></div>
            <div className="form-section"><label>Region flexibility</label><div className="radio-cards">{([{ value: "current", label: "Current region only", sub: regionById(input.currentRegionId).name }, { value: "selected", label: "Selected regions", sub: `${input.selectedRegionIds.length} regions` }, { value: "anywhere", label: "Anywhere in US", sub: "10 regions" }] as const).map((option) => <button key={option.value} className={input.regionMode === option.value ? "active" : ""} onClick={() => setInput((state) => ({ ...state, regionMode: option.value }))}><span className="radio-mark">{input.regionMode === option.value && <i />}</span><div><b>{option.label}</b><small>{option.sub}</small></div></button>)}</div></div>
            {input.regionMode === "selected" && <div className="region-chips">{regions.map((region) => <button key={region.id} className={input.selectedRegionIds.includes(region.id) ? "active" : ""} onClick={() => setInput((state) => ({ ...state, selectedRegionIds: state.selectedRegionIds.includes(region.id) ? state.selectedRegionIds.filter((id) => id !== region.id) : [...state.selectedRegionIds, region.id] }))}>{input.selectedRegionIds.includes(region.id) && <Check size={11} />}{region.name}</button>)}</div>}
            <div className="form-section priority-section"><div className="priority-head"><label>Optimization priority</label><span>{input.carbonPriority}% carbon</span></div><div className="range-labels"><span><Leaf size={13} /> Lowest carbon</span><span><DollarSign size={13} /> Lowest cost</span></div><input className="priority-slider" type="range" min="0" max="100" value={input.carbonPriority} onChange={(event) => setInput((state) => ({ ...state, carbonPriority: Number(event.target.value) }))} /></div>
            <div className="energy-preview"><Zap size={16} /><div><small>ESTIMATED ENERGY</small><b>{(input.power * input.duration).toFixed(1)} kWh</b></div><span>GridShift will evaluate up to {Math.max(1, input.deadlineOffset - Math.ceil(input.duration) + 1) * (input.regionMode === "anywhere" ? 10 : input.regionMode === "selected" ? input.selectedRegionIds.length : 1)} possible schedules</span></div>
            <button className="optimize-button" onClick={onRun} disabled={!input.name || input.power <= 0 || input.duration <= 0}><Radar size={17} /> Find Optimal Schedule <ArrowRight size={16} /></button>
            <p className="simulation-note">Results use deterministic simulated grid forecasts for this demo.</p>
          </div>
        ) : best ? (
          <div className="panel-body results-body">
            <div className="route-summary"><div className="route-label"><span className="live-pulse" /> MOVING WORKLOAD TO A CLEANER GRID</div><div className="route-regions"><div><small>FROM</small><b>{immediate.region.name}</b><span>{Math.round(immediate.averageCarbon)} gCO₂/kWh</span></div><div className="route-arrow"><span /><ArrowRight size={20} /><span /></div><div className="destination"><small>TO</small><b>{best.region.name}</b><span>{Math.round(best.averageCarbon)} gCO₂/kWh</span></div></div><div className="cleaner-badge"><Leaf size={14} /> {carbonReduction}% cleaner electricity</div></div>
            <div className="comparison-grid"><div><span>IF RUN NOW</span><b>{immediate.emissions.toFixed(1)} <em>kg CO₂</em></b><small>{immediate.region.name} · ${immediate.cost.toFixed(2)}</small></div><div className="recommended-compare"><span>GRIDSHIFT</span><b>{best.emissions.toFixed(1)} <em>kg CO₂</em></b><small>{best.region.name} · ${best.cost.toFixed(2)}</small></div></div>
            <div className="savings-banner"><div><strong>{carbonReduction}%</strong><span>less carbon</span></div><i /><div><strong>{Math.abs(costReduction)}%</strong><span>{costReduction >= 0 ? "cheaper" : "cost premium"}</span></div></div>
            <div className="eyebrow results-label">TOP SCHEDULES</div>
            <div className="result-options">{results.map((result, index) => <button className={selectedResult === index ? "active" : ""} key={`${result.region.id}-${result.startOffset}`} onClick={() => setSelectedResult(index)}><div className="result-rank"><span>{index === 0 ? "RECOMMENDED" : `OPTION 0${index + 1}`}</span><i>{selectedResult === index && <Check size={11} />}</i></div><div className="result-main"><div><b>{result.region.name}</b><small>{result.region.area}</small></div><div><b>{formatHour(result.startOffset, baseHour)}</b><small>{input.duration} hour run</small></div></div><div className="result-metrics"><span><Leaf size={12} /> {result.emissions.toFixed(1)} kg CO₂</span><span><DollarSign size={12} /> ${result.cost.toFixed(2)}</span><span><Zap size={12} /> {result.energy.toFixed(1)} kWh</span></div></button>)}</div>
            <button className="optimize-button" onClick={onSchedule}><Check size={17} /> Schedule Workload</button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("grid");
  const [selectedRegion, setSelectedRegion] = useState("ercot");
  const [panel, setPanel] = useState<Panel>("closed");
  const [input, setInput] = useState<OptimizerInput>(initialInput);
  const [results, setResults] = useState<ScheduleOption[]>([]);
  const [selectedResult, setSelectedResult] = useState(0);
  const [destinationId, setDestinationId] = useState<string>();
  const [jobs, setJobs] = useState<ScheduledJob[]>(initialJobs);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [feedMode, setFeedMode] = useState<FeedMode>("loading");
  const [feedUpdatedAt, setFeedUpdatedAt] = useState<string>();
  const [liveRegionCount, setLiveRegionCount] = useState(0);
  const [refreshRequest, setRefreshRequest] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clock, setClock] = useState<Date | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("gridshift-jobs");
    const restore = window.setTimeout(() => {
      if (saved) { try { setJobs(JSON.parse(saved)); } catch { /* preserve demo defaults */ } }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => { window.localStorage.setItem("gridshift-jobs", JSON.stringify(jobs)); }, [jobs]);

  useEffect(() => {
    const initialTick = window.setTimeout(() => setClock(new Date()), 0);
    const interval = window.setInterval(() => setClock(new Date()), 60_000);
    return () => {
      window.clearTimeout(initialTick);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadGridFeed = async () => {
      try {
        const response = await fetch("/api/grid", { cache: "no-store" });
        if (!response.ok) throw new Error("Live grid feed unavailable");
        const payload = (await response.json()) as GridApiResponse;
        if (payload.mode !== "live" || !payload.regions.length) {
          throw new Error(payload.error ?? "No live EIA regions returned");
        }
        if (cancelled) return;
        applyLiveRegionUpdates(payload.regions);
        setLiveRegionCount(payload.regions.length);
        setFeedUpdatedAt(payload.updatedAt ?? new Date().toISOString());
        setFeedMode("live");
      } catch {
        if (!cancelled) setFeedMode("demo");
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    };

    void loadGridFeed();
    const refresh = window.setInterval(loadGridFeed, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [refreshRequest]);

  const openRegion = (id: string) => {
    setSelectedRegion(id);
    setInput((state) => ({ ...state, currentRegionId: id }));
    setView("region");
    setDestinationId(undefined);
  };

  const navigate = (next: View) => {
    setView(next);
    setDestinationId(undefined);
    setMobileNav(false);
  };

  const run = () => {
    const nextResults = runOptimizer(input);
    setResults(nextResults);
    setSelectedResult(0);
    setDestinationId(nextResults[0]?.region.id);
    setView("grid");
    setPanel("results");
  };

  const schedule = () => {
    const best = results[selectedResult];
    if (!best) return;
    const baseline = immediateOption(input);
    const job: ScheduledJob = {
      id: `GS-${window.crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      name: input.name,
      type: input.type,
      status: "waiting",
      regionId: best.region.id,
      startOffset: best.startOffset,
      duration: input.duration,
      power: input.power,
      carbonSaved: Math.max(0, baseline.emissions - best.emissions),
      costSaved: Math.max(0, baseline.cost - best.cost),
    };
    setJobs((current) => [job, ...current]);
    setPanel("closed");
    setDestinationId(undefined);
    setView("workloads");
    setToast({ title: "Workload scheduled", message: `${input.name} scheduled in ${best.region.name} at ${formatHour(best.startOffset, baseHour)}` });
    window.setTimeout(() => setToast(null), 4200);
  };

  const refreshGrid = () => {
    setIsRefreshing(true);
    setRefreshRequest((request) => request + 1);
  };

  const deleteJob = (id: string) => {
    const job = jobs.find((item) => item.id === id);
    if (!job) return;
    setJobs((current) => current.filter((item) => item.id !== id));
    setToast({ title: "Workload removed", message: `${job.name} was removed from the dispatch queue.` });
    window.setTimeout(() => setToast(null), 4200);
  };

  const clearJobs = () => {
    if (!jobs.length || !window.confirm(`Remove all ${jobs.length} workloads from the dispatch queue?`)) return;
    setJobs([]);
    setToast({ title: "Queue cleared", message: "All scheduled workloads were removed." });
    window.setTimeout(() => setToast(null), 4200);
  };

  const baseHour = clock?.getHours() ?? 0;
  const clockLabel = clock
    ? clock.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  const dateLabel = clock
    ? clock.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase()
    : "—";

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate("grid")} aria-label="GridShift home"><span className="brand-mark"><i /><i /><i /></span><b>GRID<span>SHIFT</span></b><em>BETA</em></button>
        <nav className={mobileNav ? "open" : ""}>{(["grid", "workloads", "impact"] as View[]).map((item) => <button key={item} className={view === item || (item === "grid" && view === "region") ? "active" : ""} onClick={() => navigate(item)}>{item === "grid" && <Activity size={14} />}{item === "workloads" && <ServerCog size={14} />}{item === "impact" && <Leaf size={14} />}{item}</button>)}</nav>
        <div className="topbar-right"><span className={`demo-badge ${feedMode === "live" ? "live-data" : ""}`}><span className="live-pulse" /> {feedMode === "live" ? "EIA CONNECTED" : feedMode === "loading" ? "CONNECTING" : "DEMO FALLBACK"}</span><button className="schedule-top" onClick={() => setPanel("form")}><Plus size={15} /> Schedule Workload</button><button className="mobile-menu" onClick={() => setMobileNav((open) => !open)} aria-label="Toggle navigation"><Menu size={19} /></button></div>
      </header>
      <main>
        {view === "grid" && <GridView selectedId={selectedRegion} onRegion={openRegion} destinationId={destinationId} onSchedule={() => setPanel("form")} feedMode={feedMode} liveRegionCount={liveRegionCount} updatedAt={feedUpdatedAt} baseHour={baseHour} clockLabel={clockLabel} onRefresh={refreshGrid} isRefreshing={isRefreshing} />}
        {view === "region" && <RegionView regionId={selectedRegion} onBack={() => navigate("grid")} onSchedule={() => setPanel("form")} feedMode={feedMode} baseHour={baseHour} />}
        {view === "workloads" && <WorkloadsView jobs={jobs} onSchedule={() => setPanel("form")} onDelete={deleteJob} onClear={clearJobs} baseHour={baseHour} />}
        {view === "impact" && <ImpactView jobs={jobs} />}
      </main>
      <OptimizerPanel panel={panel} input={input} setInput={setInput} results={results} selectedResult={selectedResult} setSelectedResult={(index) => { setSelectedResult(index); setDestinationId(results[index]?.region.id); }} onClose={() => { setPanel("closed"); setDestinationId(undefined); }} onRun={run} onSchedule={schedule} baseHour={baseHour} />
      {toast && <div className="toast"><span><Check size={15} /></span><div><b>{toast.title}</b><p>{toast.message}</p></div><button onClick={() => setToast(null)}><X size={14} /></button></div>}
      <footer className="system-strip"><span><i className="online" /> SYSTEMS OPERATIONAL</span><span>10 REGIONS</span><span>24H FORECAST</span><span>GRID FEED: {feedMode === "live" ? "EIA + ESTIMATED CO₂" : feedMode === "loading" ? "CONNECTING" : "SIMULATED FALLBACK"}</span><span className="system-time">{dateLabel}</span></footer>
    </div>
  );
}
