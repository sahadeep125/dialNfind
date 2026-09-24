import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tick = { fontSize: 11, fill: "var(--muted-foreground)" };
const dayLabel = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;

export function TrendChart({ data, color = "var(--chart-1)", height = 220, format = (v: number) => v.toLocaleString("en-IN"), id }: { data: { date: string; value: number }[]; color?: string; height?: number; format?: (v: number) => string; id: string }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -16, right: 4, top: 8 }}>
          <defs>
            <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={dayLabel} tick={tick} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
            labelFormatter={(d) => new Date(String(d)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            formatter={(v) => [format(Number(v)), ""]}
            separator=""
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#g-${id})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarList({ items, format = (v: number) => v.toLocaleString("en-IN") }: { items: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">No data for this period.</p>;
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{i.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{format(i.value)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({ data, height = 220 }: { data: { label: string; value: number }[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -16, right: 4, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
          <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
