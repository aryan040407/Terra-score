"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { HistoryPoint } from "@/lib/types";
import { fmt, RISK_META } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

const axis = { stroke: "#b8bac3", fontSize: 11, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid strokeDasharray="3 3" stroke="#eeeef0" vertical={false} />;
const tooltipStyle = { borderRadius: 12, border: "1px solid #eeeef0", boxShadow: "0 4px 16px -4px rgba(16,24,40,.12)", fontSize: 12 };

export function TerraScoreTrend({ data, height = 240 }: { data: { month: string; terra_score?: number; avg_terra_score?: number }[]; height?: number }) {
  const key = data[0] && "avg_terra_score" in data[0] ? "avg_terra_score" : "terra_score";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs><linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity=".35" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>
        {grid}
        <XAxis dataKey="month" tickFormatter={fmt.month} {...axis} minTickGap={24} />
        <YAxis domain={[0, 1000]} {...axis} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmt.month(String(l))} formatter={(v: number) => [Math.round(v), "TerraScore"]} />
        <ReferenceLine y={400} stroke="#ea580c" strokeDasharray="4 4" label={{ value: "High-risk threshold", fontSize: 10, fill: "#ea580c", position: "insideTopRight" }} />
        <Area type="monotone" dataKey={key} stroke="#059669" strokeWidth={2.2} fill="url(#tsGrad)" isAnimationActive animationDuration={900} dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function WeatherTrend({ data, height = 240 }: { data: HistoryPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        {grid}
        <XAxis dataKey="month" tickFormatter={fmt.month} {...axis} minTickGap={24} />
        <YAxis yAxisId="l" {...axis} />
        <YAxis yAxisId="r" orientation="right" {...axis} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmt.month(String(l))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Line yAxisId="r" type="monotone" dataKey="precipitation" name="Rainfall (mm)" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={900} />
        <Line yAxisId="l" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} animationDuration={900} />
        <Line yAxisId="l" type="monotone" dataKey="soil_moisture" name="Soil moisture (%)" stroke="#3e805b" strokeWidth={2} dot={false} animationDuration={900} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function YieldRiskTrend({ data, height = 240 }: { data: HistoryPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs><linearGradient id="rpGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity=".3" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></linearGradient></defs>
        {grid}
        <XAxis dataKey="month" tickFormatter={fmt.month} {...axis} minTickGap={24} />
        <YAxis yAxisId="l" {...axis} />
        <YAxis yAxisId="r" orientation="right" domain={[0, 1]} {...axis} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmt.month(String(l))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Area yAxisId="r" type="monotone" dataKey="risk_probability" name="Risk probability" stroke="#ef4444" strokeWidth={2} fill="url(#rpGrad)" dot={false} animationDuration={900} />
        <Line yAxisId="l" type="monotone" dataKey="yield_t_ha" name="Yield (t/ha)" stroke="#1e4230" strokeWidth={2} dot={false} animationDuration={900} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ImportanceBars({ data, height = 280, color = "#3e805b" }: { data: { label: string; importance: number }[]; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eeeef0" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} {...axis} />
        <YAxis type="category" dataKey="label" width={150} {...axis} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Importance"]} cursor={{ fill: "#f6f8f4" }} />
        <Bar dataKey="importance" radius={[0, 6, 6, 0]} animationDuration={900} label={{ position: "right", fontSize: 10, fill: "#6f7282", formatter: (v: number) => `${(v * 100).toFixed(0)}%` }}>
          {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={1 - i * 0.055} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskDistribution({ data, height = 220 }: { data: { level: RiskLevel; count: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
        {grid}
        <XAxis dataKey="level" tickFormatter={(l) => String(l).replace(" Risk", "")} {...axis} />
        <YAxis {...axis} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f6f8f4" }} formatter={(v: number) => [v, "Farms"]} />
        <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={900} label={{ position: "top", fontSize: 11, fill: "#6f7282" }}>
          {data.map((d) => <Cell key={d.level} fill={RISK_META[d.level].hex} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 220 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} animationDuration={900} stroke="none">
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({ data, xKey, yKey, name, color = "#1e4230", height = 220, format }: { data: Record<string, unknown>[]; xKey: string; yKey: string; name: string; color?: string; height?: number; format?: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: -10, bottom: 0 }}>
        {grid}
        <XAxis dataKey={xKey} {...axis} interval={0} angle={data.length > 8 ? -25 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 60 : 30} />
        <YAxis {...axis} tickFormatter={format} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f6f8f4" }} formatter={(v: number) => [format ? format(v) : v, name]} />
        <Bar dataKey={yKey} name={name} fill={color} radius={[6, 6, 0, 0]} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  );
}
