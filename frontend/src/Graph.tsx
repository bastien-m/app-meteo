import { Bar, BarChart, Brush, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./components/ui/chart";
import { useAppContext } from "./AppContext";
import { useEffect, useState } from "react";
import { SearchStationComponent } from "./components/features/SearchStation";
import { data } from "wailsjs/go/models";
import { GetStationRainData, GetStations } from "wailsjs/go/main/App";
import { StationBadge } from "./components/features/StationBadge";
import { ScrollArea } from "./components/ui/scroll-area";
import { Button } from "./components/ui/button";
import { ButtonGroup } from "./components/ui/button-group";

type SelectedStation = {
  shown: boolean;
  station: data.StationInfo;
};

type RainByPeriod = {
  date: Date;
  rain: number;
};

type ViewMode = "day" | "month" | "year";

export default function GraphView() {
  const {
    selectedStations: selectedStationsPostNum,
    addSelectedStation,
    removeSelectedStation,
  } = useAppContext();
  const [stations, setStations] = useState<data.StationInfo[]>([]);

  const [selectedStations, setSelectedStations] = useState<SelectedStation[]>(
    selectedStationsPostNum.map((s) => ({
      shown: true,
      station: s,
    })),
  );

  const [viewMode, setViewMode] = useState<ViewMode>("month");

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
            {selectedStations.map((selectedStation) => (
              <StationBadge
                label={selectedStation.station.CommonName}
                key={selectedStation.station.NumPost}
                shown={selectedStation.shown}
                toggleShow={handleShownChanged(selectedStation)}
                removeFromSelection={handleRemoveClicked(selectedStation)}
              />
            ))}
          </div>
          <div className="flex justify-center my-4">
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
          <div className="flex flex-col gap-8 p-4">
            {selectedStations
              .filter((s) => s.shown)
              .map((selectedStation) => {
                const numPost = selectedStation.station.NumPost;
                const chartData = getChartData(numPost);
                return (
                  <div key={numPost}>
                    <h2 className="text-sm font-semibold mb-2">
                      {selectedStation.station.CommonName}
                    </h2>
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
    Map<string, data.RainData[]>
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
