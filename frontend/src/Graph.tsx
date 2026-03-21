import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./components/ui/chart";
import { useAppContext } from "./AppContext";
import { useEffect, useState } from "react";
import { SearchStationComponent } from "./components/features/SearchStation";
import { data } from "wailsjs/go/models";
import { GetStations } from "wailsjs/go/main/App";
import { StationBadge } from "./components/features/StationBadge";

type SelectedStation = {
  shown: boolean;
  station: data.StationInfo;
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

  useEffect(() => {
    (async () => {
      const stationList = await GetStations();
      setStations(stationList);
    })();
  }, []);

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

  const data = [
    {
      year: "2000",
      value: 1000,
    },
    {
      year: "2001",
      value: 100,
    },
    {
      year: "2002",
      value: 1200,
    },
    {
      year: "2003",
      value: 1000,
    },
    {
      year: "2004",
      value: 800,
    },
    {
      year: "2005",
      value: 700,
    },
    {
      year: "2006",
      value: 1200,
    },
  ];
  return (
    <div>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-51 w-72">
        <SearchStationComponent stations={stations} onSelect={handleOnSelect} />
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
        <ChartContainer config={{}}>
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="Année"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <Bar dataKey="value" fill="var(--color-primary)" />
            <ChartTooltip content={<ChartTooltipContent />} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
