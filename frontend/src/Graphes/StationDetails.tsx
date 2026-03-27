import { useAppContext } from "@/AppContext";
import { SearchStationComponent } from "@/components/features/SearchStation";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";
import {
  GetStations,
  GetStationRain,
  GetStationRainData,
} from "wailsjs/go/main/App";
import { data } from "wailsjs/go/models";

type ViewMode = "day" | "month" | "year";

type RainByPeriod = { label: string; rain: number };

type Stats = {
  max: { rain: number; year: string };
  min: { rain: number; year: string };
  mean: number;
  median: number;
};

function computeStats(rainData: data.RainByStation[]): Stats | null {
  if (rainData.length === 0) return null;
  const sorted = [...rainData].sort((a, b) => a.Rain - b.Rain);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const mean = rainData.reduce((acc, r) => acc + r.Rain, 0) / rainData.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1]!.Rain + sorted[mid]!.Rain) / 2
      : sorted[mid]!.Rain;
  return {
    max: { rain: max.Rain, year: max.Year },
    min: { rain: min.Rain, year: min.Year },
    mean,
    median,
  };
}

function buildChartData(
  records: data.WeatherData[],
  viewMode: ViewMode,
): RainByPeriod[] {
  if (viewMode === "day") {
    return records.map((r) => {
      const d = new Date(r.Date);
      return {
        label: d.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        rain: r.Rain,
      };
    });
  }

  const map = new Map<string, { label: string; rain: number; sort: string }>();

  for (const r of records) {
    const d = new Date(r.Date);
    if (viewMode === "month") {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", {
        month: "short",
        year: "numeric",
      });
      const existing = map.get(key);
      if (existing) existing.rain += r.Rain;
      else map.set(key, { label, rain: r.Rain, sort: key });
    } else {
      const key = String(d.getFullYear());
      const existing = map.get(key);
      if (existing) existing.rain += r.Rain;
      else map.set(key, { label: key, rain: r.Rain, sort: key });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map(({ label, rain }) => ({ label, rain }));
}

import { MONTH_LABELS } from "@/lib/month";

type MonthlyAvg = {
  short: string;
  long: string;
  rain: number;
  temperature: number;
  sigma: number;
  rainDuration: number;
};

function buildMonthlyAvgData(records: data.WeatherData[]): MonthlyAvg[] {
  // Accumulate sums per (year, month) for rain, then per (month) for the rest
  const rainPerYearMonth = new Map<string, number>();
  const sums = Array.from({ length: 12 }, () => ({
    temp: 0,
    tempCount: 0,
    sigma: 0,
    sigmaCount: 0,
    drr: 0,
    drrCount: 0,
  }));

  for (const r of records) {
    const d = new Date(r.Date);
    const month = d.getMonth();
    const yearMonthKey = `${d.getFullYear()}-${month}`;
    rainPerYearMonth.set(
      yearMonthKey,
      (rainPerYearMonth.get(yearMonthKey) ?? 0) + r.Rain,
    );
    if (r.MeanTemperature != null) {
      sums[month].temp += r.MeanTemperature;
      sums[month].tempCount++;
    }
    if (r.Sigma != null) {
      sums[month].sigma += r.Sigma;
      sums[month].sigmaCount++;
    }
    if (r.RainDuration != null) {
      sums[month].drr += r.RainDuration;
      sums[month].drrCount++;
    }
  }

  const rainSums = new Array(12).fill(0);
  const rainCounts = new Array(12).fill(0);
  for (const [key, rain] of rainPerYearMonth) {
    const month = Number(key.split("-")[1]);
    rainSums[month] += rain;
    rainCounts[month]++;
  }

  return MONTH_LABELS.map(({ short, long }, i) => ({
    short,
    long,
    rain: rainCounts[i] > 0 ? rainSums[i] / rainCounts[i] : 0,
    temperature: sums[i].tempCount > 0 ? sums[i].temp / sums[i].tempCount : 0,
    sigma: sums[i].sigmaCount > 0 ? sums[i].sigma / sums[i].sigmaCount : 0,
    rainDuration: sums[i].drrCount > 0 ? sums[i].drr / sums[i].drrCount : 0,
  }));
}

function StatCard({
  title,
  value,
  year,
}: {
  title: string;
  value: string;
  year?: string;
}) {
  return (
    <Card className="bg-accent/30">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardFooter className="mt-auto">
        <p className="text-xs text-muted-foreground">{year ?? ""}</p>
      </CardFooter>
    </Card>
  );
}

export default function GraphStationView() {
  const { selectedStationDetails, setSelectedStationsDetails } =
    useAppContext();
  const [stations, setStations] = useState<data.StationInfo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rawRecords, setRawRecords] = useState<data.WeatherData[]>([]);
  const [yearlyRecords, setYearlyRecords] = useState<data.RainByStation[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  useEffect(() => {
    (async () => {
      const stationList = await GetStations();
      setStations(stationList);
    })();
  }, []);

  useEffect(() => {
    if (!selectedStationDetails) {
      setStats(null);
      setRawRecords([]);
      setYearlyRecords([]);
      return;
    }
    (async () => {
      const [yearlyData, dailyData] = await Promise.all([
        GetStationRain(selectedStationDetails.NumPost),
        GetStationRainData(selectedStationDetails.NumPost),
      ]);
      setStats(computeStats(yearlyData));
      setYearlyRecords(yearlyData);
      setRawRecords(dailyData);
    })();
  }, [selectedStationDetails]);

  const chartData = buildChartData(rawRecords, viewMode);

  return (
    <ScrollArea className="h-full">
      <div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-51 w-72">
          <SearchStationComponent
            stations={stations}
            onSelect={(s) => setSelectedStationsDetails(s)}
          />
        </div>
        <div className="mt-20 px-6">
          {selectedStationDetails && (
            <h1 className="text-lg font-semibold mb-4">
              {selectedStationDetails.CommonName}
            </h1>
          )}
          {stats && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
              <StatCard
                title="Max annuel"
                value={`${stats.max.rain.toFixed(0)} mm`}
                year={stats.max.year}
              />
              <StatCard
                title="Min annuel"
                value={`${stats.min.rain.toFixed(0)} mm`}
                year={stats.min.year}
              />
              <StatCard title="Moyenne" value={`${stats.mean.toFixed(0)} mm`} />
              <StatCard
                title="Médiane"
                value={`${stats.median.toFixed(0)} mm`}
              />
            </div>
          )}
          {rawRecords.length > 0 && (
            <Card className="bg-accent/10">
              <div className="flex justify-center mb-4">
                <ButtonGroup>
                  <Button
                    variant={viewMode === "day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("day")}
                  >
                    Jour
                  </Button>
                  <Button
                    variant={viewMode === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("month")}
                  >
                    Mois
                  </Button>
                  <Button
                    variant={viewMode === "year" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("year")}
                  >
                    Année
                  </Button>
                </ButtonGroup>
              </div>
              <ChartContainer config={{}} className="h-64 w-full">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "mm",
                      position: "insideTopLeft",
                      offset: -5,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="rain"
                    fill="var(--color-primary)"
                    activeBar={{
                      fill: "var(--color-primary)",
                      fillOpacity: 0.6,
                    }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Brush
                    dataKey="label"
                    height={24}
                    stroke="var(--border)"
                    fill="var(--background)"
                  />
                </BarChart>
              </ChartContainer>
            </Card>
          )}
          {rawRecords.length > 0 && (
            <div className="mt-8">
              <Card className="bg-accent/10">
                <CardHeader>
                  <h2 className="text-sm font-semibold mb-4">
                    Pluie moyenne par mois
                  </h2>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-64 w-full">
                    <ComposedChart
                      data={buildMonthlyAvgData(rawRecords)}
                      margin={{ right: 32 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="short"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="rain"
                        tickLine={false}
                        axisLine={false}
                        label={{
                          value: "mm",
                          position: "insideTopLeft",
                          offset: 0,
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        yAxisId="temp"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        label={{
                          value: "°C",
                          position: "insideTopRight",
                          offset: 0,
                          fontSize: 12,
                        }}
                      />
                      <YAxis yAxisId="sigma" hide />
                      <YAxis yAxisId="drr" hide />
                      <Bar
                        yAxisId="rain"
                        dataKey="rain"
                        fill="var(--color-primary)"
                        fillOpacity={0.4}
                      />
                      <Line
                        yAxisId="temp"
                        dataKey="temperature"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="sigma"
                        dataKey="sigma"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="4 3"
                      />
                      <Line
                        yAxisId="drr"
                        dataKey="rainDuration"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="2 2"
                      />
                      <ChartTooltip
                        cursor={false}
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0]!.payload as MonthlyAvg;
                          return (
                            <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md space-y-1">
                              <p className="font-bold">{d.long}</p>
                              <p>Pluie : {d.rain.toFixed(1)} mm</p>
                              <p>Température : {d.temperature.toFixed(1)} °C</p>
                              <p>Sigma : {d.sigma.toFixed(2)}</p>
                              <p>Durée pluie : {d.rainDuration.toFixed(1)}</p>
                            </div>
                          );
                        }}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}
          {yearlyRecords.length > 0 && (
            <div className="mt-8">
              <Card className="bg-accent/10">
                <CardHeader>
                  <h2 className="text-sm font-semibold mb-4">
                    Pluie par année
                  </h2>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-64 w-full">
                    <ScatterChart margin={{ left: 16 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        type="number"
                        dataKey="rain"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        label={{
                          value: "mm",
                          position: "insideTopLeft",
                          offset: -5,
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="year"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => String(v)}
                        domain={["dataMin", "dataMax"]}
                      />
                      <Scatter
                        data={yearlyRecords.map((r) => ({
                          rain: r.Rain,
                          year: Number(r.Year),
                        }))}
                        fill="var(--color-primary)"
                      />
                      {stats && (
                        <>
                          <ReferenceLine
                            x={stats.mean}
                            stroke="var(--chart-1)"
                            strokeWidth={2}
                            strokeDasharray="4 3"
                            label={{
                              value: "moy.",
                              position: "insideTopRight",
                              fontSize: 10,
                              fill: "var(--chart-1)",
                            }}
                          />
                          <ReferenceLine
                            x={stats.median}
                            stroke="var(--chart-2)"
                            strokeWidth={2}
                            strokeDasharray="4 3"
                            label={{
                              value: "méd.",
                              position: "insideTopLeft",
                              fontSize: 10,
                              fill: "var(--chart-2)",
                            }}
                          />
                        </>
                      )}
                      <ChartTooltip
                        cursor={false}
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const { year, rain } = payload[0]!.payload;
                          return (
                            <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md flex">
                              <p className="font-bold mr-1">Année {year} : </p>
                              {Number(rain).toFixed(0)} mm
                            </div>
                          );
                        }}
                      />
                    </ScatterChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
