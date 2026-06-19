import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface HistoryChartProps {
  chartData: any[];
  formatYAxis: (val: number) => string;
  t: (key: string) => string;
}

export default function HistoryChart({ chartData, formatYAxis, t }: HistoryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(0.22 0.012 264)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 8 }}
          angle={-45}
          textAnchor="end"
          height={50}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 5]}
          tickCount={6}
          tickFormatter={formatYAxis}
          tick={{ fill: "oklch(0.55 0.012 264)", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const data = payload[0].payload;
            return (
              <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-xl space-y-1">
                <p className="text-muted-foreground">{data.date}</p>
                <p className="font-bold text-foreground">
                  {t("historyPage.tableState")}: {data.emoji} {data.stateName}
                </p>
                <p className="text-primary font-semibold">
                  {t("historyPage.tableConf")}: {data.confidence}%
                </p>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="stateValue"
          stroke="#10b981"
          strokeWidth={3}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
