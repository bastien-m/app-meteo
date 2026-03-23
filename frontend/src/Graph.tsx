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
import findStationByNumPost from "./lib/findStationByNumPost";
import { LogDebug } from "wailsjs/runtime/runtime";
import { ScrollArea } from "./components/ui/scroll-area";

type SelectedStation = {
  shown: boolean;
  station: data.StationInfo;
};

type RainByMonth = {
  date: Date;
  rain: number;
};

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

  const [rainByStation, setRainByStation] = useState<
    Map<string, data.RainData[]>
  >(new Map());

  const [rainByMonthByStation, setRainByMonthByStation] = useState<
    Map<string, RainByMonth[]>
  >(new Map());



  useEffect(() => {
    (async () => {
      const stationList = await GetStations();
      setStations(stationList);
    })();
  }, []);

  // fetch rain data for each selected stations
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
        const monthMap = new Map<string, RainByMonth>();
        for (const record of stationRecords) {
          const d = new Date(record.Date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const existing = monthMap.get(key);
          if (existing) {
            existing.rain += record.Rain;
          } else {
            monthMap.set(key, {
              date: new Date(d.getFullYear(), d.getMonth(), 1),
              rain: record.Rain,
            });
          }
        }
        const sorted = Array.from(monthMap.values()).sort(
          (a, b) => a.date.getTime() - b.date.getTime(),
        );
        setRainByMonthByStation((prev) => new Map(prev).set(numPost, sorted));
      }
    })();
  }, [selectedStations, stations]);

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
          <div className="flex flex-col gap-8 p-4">
            {selectedStations
              .filter((s) => s.shown)
              .map((selectedStation) => {
                const numPost = selectedStation.station.NumPost;
                const chartData = (rainByMonthByStation.get(numPost) ?? [])
                  .map((entry) => ({
                    month: entry.date.toLocaleDateString("fr-FR", {
                      month: "short",
                      year: "numeric",
                    }),
                    rain: entry.rain,
                  }));
                return (
                  <div key={numPost}>
                    <h2 className="text-sm font-semibold mb-2">
                      {selectedStation.station.CommonName}
                    </h2>
                    <ChartContainer config={{}} className="h-64 w-full">
                      <BarChart data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          label={{ value: "mm", position: "insideTopLeft", offset: -5, fontSize: 12 }}
                        />
                        <Bar dataKey="rain" fill="var(--color-primary)" activeBar={{ fill: "var(--color-primary)", fillOpacity: 0.6 }} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <Brush
                          dataKey="month"
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
