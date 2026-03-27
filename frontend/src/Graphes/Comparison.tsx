import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";
import { useAppContext } from "../AppContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchStationComponent } from "../components/features/SearchStation";
import { data } from "wailsjs/go/models";
import { GetStationRainData, GetStations } from "wailsjs/go/main/App";
import { StationBadge } from "../components/features/StationBadge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Button } from "../components/ui/button";
import { ButtonGroup } from "../components/ui/button-group";
import { ExternalLink } from "lucide-react";

type SelectedStation = {
  shown: boolean;
  station: data.StationInfo;
};

type RainByPeriod = {
  date: Date;
  rain: number;
};

type ViewMode = "day" | "month" | "year";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function GraphComparisonView() {
  const {
    selectedStations: selectedStationsPostNum,
    addSelectedStation,
    removeSelectedStation,
    setSelectedStationsDetails,
  } = useAppContext();
  const navigate = useNavigate();
  const [stations, setStations] = useState<data.StationInfo[]>([]);

  const [selectedStations, setSelectedStations] = useState<SelectedStation[]>(
    selectedStationsPostNum.map((s) => ({
      shown: true,
      station: s,
    })),
  );

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [grouped, setGrouped] = useState(false);
  const [deltaStation1, setDeltaStation1] = useState<string | null>(null);
  const [deltaStation2, setDeltaStation2] = useState<string | null>(null);

  useEffect(() => {
    const shown = selectedStations.filter((s) => s.shown);
    if (shown.length >= 2) {
      setDeltaStation1((prev) => prev ?? shown[0]!.station.NumPost);
      setDeltaStation2((prev) => prev ?? shown[1]!.station.NumPost);
    }
  }, [selectedStations]);

  useEffect(() => {
    (async () => {
      const stationList = await GetStations();
      setStations(stationList);
    })();
  }, []);

  const { rainByStation, rainByMonthByStation, rainByYearByStation } =
    useStationData(selectedStations, stations);

  const handleOnSelect = (s: data.StationInfo) => {
    addSelectedStation(s);
    setSelectedStations((selectedStations) => [
      {
        shown: true,
        station: s,
      },
      ...selectedStations,
    ]);
  };

  const handleShownChanged = (station: SelectedStation) => () => {
    setSelectedStations((stations) => {
      return stations.map((s) => {
        if (station.station.NumPost === s.station.NumPost) {
          return {
            shown: !s.shown,
            station: s.station,
          };
        }
        return s;
      });
    });
  };

  const handleRemoveClicked = (station: SelectedStation) => () => {
    removeSelectedStation(station.station.NumPost);
    setSelectedStations((prev) =>
      prev.filter((s) => s.station.NumPost !== station.station.NumPost),
    );
  };

  const getGlobalTimeline = (): { key: string; label: string }[] => {
    if (viewMode === "day") {
      let minDate: Date | null = null;
      let maxDate: Date | null = null;
      for (const records of rainByStation.values()) {
        for (const r of records) {
          const d = new Date(r.Date);
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
      }
      if (!minDate || !maxDate) return [];
      const result: { key: string; label: string }[] = [];
      const cur = new Date(
        minDate.getFullYear(),
        minDate.getMonth(),
        minDate.getDate(),
      );
      const end = new Date(
        maxDate.getFullYear(),
        maxDate.getMonth(),
        maxDate.getDate(),
      );
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        result.push({
          key,
          label: cur.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        });
        cur.setDate(cur.getDate() + 1);
      }
      return result;
    }

    if (viewMode === "month") {
      let minDate: Date | null = null;
      let maxDate: Date | null = null;
      for (const periods of rainByMonthByStation.values()) {
        for (const p of periods) {
          if (!minDate || p.date < minDate) minDate = p.date;
          if (!maxDate || p.date > maxDate) maxDate = p.date;
        }
      }
      if (!minDate || !maxDate) return [];
      const result: { key: string; label: string }[] = [];
      const cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
        result.push({
          key,
          label: cur.toLocaleDateString("fr-FR", {
            month: "short",
            year: "numeric",
          }),
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      return result;
    }

    let minYear: number | null = null;
    let maxYear: number | null = null;
    for (const periods of rainByYearByStation.values()) {
      for (const p of periods) {
        const y = p.date.getFullYear();
        if (minYear === null || y < minYear) minYear = y;
        if (maxYear === null || y > maxYear) maxYear = y;
      }
    }
    if (minYear === null || maxYear === null) return [];
    const result: { key: string; label: string }[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      result.push({ key: String(y), label: String(y) });
    }
    return result;
  };

  const getGroupedChartData = () => {
    const timeline = getGlobalTimeline();
    const shownStations = selectedStations.filter((s) => s.shown);

    const stationMaps = new Map<string, Map<string, number>>();
    for (const s of shownStations) {
      const numPost = s.station.NumPost;
      const dataMap = new Map<string, number>();
      if (viewMode === "day") {
        for (const record of rainByStation.get(numPost) ?? []) {
          const d = new Date(record.Date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          dataMap.set(key, record.Rain);
        }
      } else if (viewMode === "month") {
        for (const entry of rainByMonthByStation.get(numPost) ?? []) {
          const key = `${entry.date.getFullYear()}-${String(entry.date.getMonth() + 1).padStart(2, "0")}`;
          dataMap.set(key, entry.rain);
        }
      } else {
        for (const entry of rainByYearByStation.get(numPost) ?? []) {
          dataMap.set(String(entry.date.getFullYear()), entry.rain);
        }
      }
      stationMaps.set(numPost, dataMap);
    }

    return timeline.map(({ key, label }) => {
      const entry: Record<string, string | number> = { label };
      for (const s of shownStations) {
        entry[s.station.NumPost] =
          stationMaps.get(s.station.NumPost)?.get(key) ?? 0;
      }
      return entry;
    });
  };

  const getChartData = (numPost: string) => {
    const timeline = getGlobalTimeline();

    if (viewMode === "day") {
      const dataMap = new Map<string, number>();
      for (const record of rainByStation.get(numPost) ?? []) {
        const d = new Date(record.Date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        dataMap.set(key, record.Rain);
      }
      return timeline.map(({ key, label }) => ({
        label,
        rain: dataMap.get(key) ?? 0,
      }));
    }

    if (viewMode === "month") {
      const dataMap = new Map<string, number>();
      for (const entry of rainByMonthByStation.get(numPost) ?? []) {
        const key = `${entry.date.getFullYear()}-${String(entry.date.getMonth() + 1).padStart(2, "0")}`;
        dataMap.set(key, entry.rain);
      }
      return timeline.map(({ key, label }) => ({
        label,
        rain: dataMap.get(key) ?? 0,
      }));
    }

    const dataMap = new Map<string, number>();
    for (const entry of rainByYearByStation.get(numPost) ?? []) {
      dataMap.set(String(entry.date.getFullYear()), entry.rain);
    }
    return timeline.map(({ key, label }) => ({
      label,
      rain: dataMap.get(key) ?? 0,
    }));
  };

  const buildRainMap = (numPost: string): Map<string, number> => {
    const map = new Map<string, number>();
    if (viewMode === "day") {
      for (const r of rainByStation.get(numPost) ?? []) {
        const d = new Date(r.Date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        map.set(key, r.Rain);
      }
    } else if (viewMode === "month") {
      for (const e of rainByMonthByStation.get(numPost) ?? []) {
        const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}`;
        map.set(key, e.rain);
      }
    } else {
      for (const e of rainByYearByStation.get(numPost) ?? []) {
        map.set(String(e.date.getFullYear()), e.rain);
      }
    }
    return map;
  };

  const getDeltaChartData = () => {
    if (!deltaStation1 || !deltaStation2) return [];
    const timeline = getGlobalTimeline();
    const map1 = buildRainMap(deltaStation1);
    const map2 = buildRainMap(deltaStation2);
    return timeline.map(({ key, label }) => ({
      label,
      delta: (map1.get(key) ?? 0) - (map2.get(key) ?? 0),
    }));
  };

  const shownStations = selectedStations.filter((s) => s.shown);
  const station1Name =
    shownStations.find((s) => s.station.NumPost === deltaStation1)?.station
      .CommonName ?? "";
  const station2Name =
    shownStations.find((s) => s.station.NumPost === deltaStation2)?.station
      .CommonName ?? "";

  const deltaData = getDeltaChartData();

  const getStationStats = (numPost: string) => {
    const years = rainByYearByStation.get(numPost) ?? [];
    if (years.length === 0) return null;
    const values = years.map((y) => y.rain);
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2
        : sorted[Math.floor(sorted.length / 2)]!;
    return { mean, median, min: sorted[0]!, max: sorted[sorted.length - 1]! };
  };

  const openStationDetailsView = (station: data.StationInfo) => () => {
    setSelectedStationsDetails(station);
    navigate("/graphs/station");
  };

  return (
    <ScrollArea className="h-full">
      <div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-51 w-72">
          <SearchStationComponent
            stations={stations}
            onSelect={handleOnSelect}
          />
        </div>
        <div className="mt-20">
          <div>
            {selectedStations.map((selectedStation, i) => (
              <StationBadge
                label={selectedStation.station.CommonName}
                key={selectedStation.station.NumPost}
                shown={selectedStation.shown}
                color={
                  grouped ? CHART_COLORS[i % CHART_COLORS.length] : undefined
                }
                toggleShow={handleShownChanged(selectedStation)}
                removeFromSelection={handleRemoveClicked(selectedStation)}
              />
            ))}
          </div>
          <div className="flex justify-center items-center gap-3 my-4">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGrouped((g) => !g)}
            >
              {grouped ? "Dégrouper" : "Grouper"}
            </Button>
          </div>
          <div className="flex flex-col gap-8 p-4">
            {grouped
              ? (() => {
                  const shownStations = selectedStations.filter((s) => s.shown);
                  const chartConfig = Object.fromEntries(
                    shownStations.map((s, i) => [
                      s.station.NumPost,
                      {
                        label: s.station.CommonName,
                        color: CHART_COLORS[i % CHART_COLORS.length],
                      },
                    ]),
                  );
                  const chartData = getGroupedChartData();
                  return (
                    <ChartContainer
                      config={chartConfig}
                      className="h-64 w-full"
                    >
                      <BarChart data={chartData} syncId="rainBarchart">
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
                        {shownStations.map((s, i) => (
                          <Bar
                            key={s.station.NumPost}
                            dataKey={s.station.NumPost}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                            activeBar={{ fillOpacity: 0.6 }}
                          />
                        ))}
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
                  );
                })()
              : selectedStations
                  .filter((s) => s.shown)
                  .map((selectedStation) => {
                    const numPost = selectedStation.station.NumPost;
                    const chartData = getChartData(numPost);
                    return (
                      <div key={numPost}>
                        <div className="flex items-baseline gap-3 mb-2">
                          <h2 className="text-sm font-semibold flex justify-baseline">
                            <div>{selectedStation.station.CommonName}</div>
                            <ExternalLink
                              className="h-3 cursor-pointer"
                              onClick={openStationDetailsView(
                                selectedStation.station,
                              )}
                            />
                          </h2>
                          {(() => {
                            const stats = getStationStats(numPost);
                            if (!stats) return null;
                            return (
                              <span className="text-xs text-muted-foreground">
                                moy. {stats.mean.toFixed(0)} mm · méd.{" "}
                                {stats.median.toFixed(0)} mm · min{" "}
                                {stats.min.toFixed(0)} mm · max{" "}
                                {stats.max.toFixed(0)} mm
                              </span>
                            );
                          })()}
                        </div>
                        <ChartContainer config={{}} className="h-64 w-full">
                          <BarChart data={chartData} syncId={"rainBarchart"}>
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
                      </div>
                    );
                  })}
          </div>
          {shownStations.length >= 2 && (
            <div className="p-4 border-t mt-4">
              <h2 className="text-sm font-semibold mb-3">Comparaison</h2>
              <div className="flex items-center gap-2 mb-4 text-sm">
                <select
                  className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  value={deltaStation1 ?? ""}
                  onChange={(e) => setDeltaStation1(e.target.value || null)}
                >
                  {shownStations.map((s) => (
                    <option key={s.station.NumPost} value={s.station.NumPost}>
                      {s.station.CommonName}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">−</span>
                <select
                  className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  value={deltaStation2 ?? ""}
                  onChange={(e) => setDeltaStation2(e.target.value || null)}
                >
                  {shownStations.map((s) => (
                    <option key={s.station.NumPost} value={s.station.NumPost}>
                      {s.station.CommonName}
                    </option>
                  ))}
                </select>
              </div>
              {deltaStation1 && deltaStation2 && (
                <ChartContainer config={{}} className="h-64 w-full">
                  <BarChart data={deltaData} syncId="rainBarchart">
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
                    <ReferenceLine y={0} stroke="var(--border)" />
                    <Bar dataKey="delta" fill="var(--chart-1)" />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [
                            `${Number(value).toFixed(1)} mm`,
                            `${station1Name} − ${station2Name}`,
                          ]}
                        />
                      }
                    />
                    <Brush
                      dataKey="label"
                      height={24}
                      stroke="var(--border)"
                      fill="var(--background)"
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function useStationData(
  selectedStations: SelectedStation[],
  stations: data.StationInfo[],
) {
  const [rainByStation, setRainByStation] = useState<
    Map<string, data.WeatherData[]>
  >(new Map());
  const [rainByMonthByStation, setRainByMonthByStation] = useState<
    Map<string, RainByPeriod[]>
  >(new Map());
  const [rainByYearByStation, setRainByYearByStation] = useState<
    Map<string, RainByPeriod[]>
  >(new Map());

  useEffect(() => {
    (async () => {
      const response = await Promise.all(
        selectedStations.map((station) =>
          GetStationRainData(station.station.NumPost),
        ),
      );
      for (const stationRecords of response) {
        if (stationRecords.length > 0) {
          setRainByStation((v) =>
            v.set(stationRecords[0]!.NumPost, stationRecords),
          );
        }
      }
      for (const stationRecords of response) {
        if (stationRecords.length === 0) continue;
        const numPost = stationRecords[0]!.NumPost;

        const monthMap = new Map<string, RainByPeriod>();
        const yearMap = new Map<string, RainByPeriod>();

        for (const record of stationRecords) {
          const d = new Date(record.Date);

          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const existingMonth = monthMap.get(monthKey);
          if (existingMonth) {
            existingMonth.rain += record.Rain;
          } else {
            monthMap.set(monthKey, {
              date: new Date(d.getFullYear(), d.getMonth(), 1),
              rain: record.Rain,
            });
          }

          const yearKey = `${d.getFullYear()}`;
          const existingYear = yearMap.get(yearKey);
          if (existingYear) {
            existingYear.rain += record.Rain;
          } else {
            yearMap.set(yearKey, {
              date: new Date(d.getFullYear(), 0, 1),
              rain: record.Rain,
            });
          }
        }

        const sortedMonths = Array.from(monthMap.values()).sort(
          (a, b) => a.date.getTime() - b.date.getTime(),
        );
        const sortedYears = Array.from(yearMap.values()).sort(
          (a, b) => a.date.getTime() - b.date.getTime(),
        );

        setRainByMonthByStation((prev) =>
          new Map(prev).set(numPost, sortedMonths),
        );
        setRainByYearByStation((prev) =>
          new Map(prev).set(numPost, sortedYears),
        );
      }
    })();
  }, [selectedStations, stations]);

  return {
    rainByStation,
    rainByMonthByStation,
    rainByYearByStation,
  };
}
