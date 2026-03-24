import {
  LatLngBoundsExpression,
  LatLngExpression,
  Marker,
  Rectangle,
} from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import {
  Map,
  MapLayerGroup,
  MapLayers,
  MapLayersControl,
  MapMarker,
  MapMarkerClusterGroup,
  MapPopup,
  MapRectangle,
  MapTileLayer,
  MapTooltip,
  MapZoomControl,
} from "./components/ui/map";
import {
  ArrowDown,
  ArrowUp,
  MapPin,
  PinIcon,
  PinOff,
  SquareActivity,
} from "lucide-react";
import {
  GetAvgRainAllStations,
  GetStationRain,
  GetStations,
} from "wailsjs/go/main/App";
import { data } from "wailsjs/go/models";
import { LogPrint } from "wailsjs/runtime/runtime";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./components/ui/item";
import { ButtonGroup } from "./components/ui/button-group";
import { Button } from "./components/ui/button";
import { useAppContext } from "./AppContext";
import { SearchStationComponent } from "./components/features/SearchStation";
import { useNavigate } from "react-router-dom";

const FRANCE_CENTER = [46.2276, 2.2137] satisfies LatLngExpression;

function RainRectangle({
  bounds,
  color,
  children,
}: {
  bounds: LatLngBoundsExpression;
  color: string;
  children?: React.ReactNode;
}) {
  const [rect, setRect] = useState<Rectangle | null>(null);

  useEffect(() => {
    const el = rect?.getElement() as SVGElement | undefined;
    if (el) {
      el.style.fill = color;
      el.style.stroke = "none";
      el.style.fillOpacity = "0.65";
    }
  }, [rect, color]);

  return (
    <MapRectangle ref={setRect} bounds={bounds} pathOptions={{ weight: 0 }}>
      {children}
    </MapRectangle>
  );
}

function rainColor(value: number, min: number, max: number): string {
  const t = max === min ? 0.5 : (value - min) / (max - min);
  // Multi-stop gradient: dark red → yellow → forest green → dark blue
  const stops: [number, number, number, number][] = [
    [0, 139, 0, 0], // dark red   (min, driest)
    [0.35, 220, 180, 0], // yellow     (below average)
    [0.6, 34, 139, 34], // forest green (average)
    [1, 0, 0, 139], // dark blue  (max, wettest)
  ];
  let i = 0;
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
  const [t0, r0, g0, b0] = stops[i];
  const [t1, r1, g1, b1] = stops[i + 1];
  const u = (t - t0) / (t1 - t0);
  return `rgb(${Math.round(r0 + u * (r1 - r0))},${Math.round(g0 + u * (g1 - g0))},${Math.round(b0 + u * (b1 - b0))})`;
}

function MapView() {
  const [selected, setSelected] = useState<data.StationInfo | null>(null);

  const [stations, setStations] = useState<data.StationInfo[]>([]);
  const [avgRainStations, setAvgRainStations] = useState<data.StationAvgRain[]>(
    [],
  );
  const markerRefs = useRef<Record<string, Marker>>({});

  useEffect(() => {
    (async () => {
      const [stationList, avgRainList] = await Promise.all([
        GetStations(),
        GetAvgRainAllStations(),
      ]);
      LogPrint(`loaded station with ${stationList.length} stations`);
      setStations(stationList);
      setAvgRainStations(avgRainList);
    })();
  }, []);

  const rainMin = Math.min(...avgRainStations.map((s) => s.AvgRain));
  const rainMax = Math.max(...avgRainStations.map((s) => s.AvgRain));

  useEffect(() => {
    if (selected) {
      markerRefs.current[selected.NumPost]?.openPopup();
    }
  }, [selected]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-51 w-72">
        <SearchStationComponent stations={stations} onSelect={setSelected} />
      </div>
      <Map center={FRANCE_CENTER} zoom={6} className="flex-1 relative">
        <MapLayers defaultLayerGroups={["Station"]}>
          <MapLayersControl />
          <MapTileLayer />
          <MapLayerGroup key="rain" name="Pluie moyenne">
            {avgRainStations.map((s) => (
              <RainRectangle
                key={s.NumPost}
                bounds={[
                  [s.Lat - 0.07, s.Lon - 0.1],
                  [s.Lat + 0.07, s.Lon + 0.1],
                ]}
                color={rainColor(s.AvgRain, rainMin, rainMax)}
              >
                <MapTooltip>
                  <span className="font-semibold">{s.CommonName}</span>
                  <br />
                  {Math.round(s.AvgRain)} mm/an (moy.)
                </MapTooltip>
              </RainRectangle>
            ))}
          </MapLayerGroup>
          <MapLayerGroup key="station" name="Station">
            <MapMarkerClusterGroup
              icon={(count) => (
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-md">
                  {count}
                </div>
              )}
            >
              {stations.map((station) => (
                <MapMarker
                  key={station.NumPost}
                  ref={(marker) => {
                    if (marker) markerRefs.current[station.NumPost] = marker;
                    else delete markerRefs.current[station.NumPost];
                  }}
                  position={
                    [station.Lat, station.Lon] satisfies LatLngExpression
                  }
                  icon={<MapPin />}
                  eventHandlers={{ click: () => setSelected(station) }}
                >
                  <MapPopup className="w-80">
                    <StationTooltip station={station} />
                  </MapPopup>
                </MapMarker>
              ))}
            </MapMarkerClusterGroup>
          </MapLayerGroup>
          <MapZoomControl position="top-10 right-1" />
        </MapLayers>
        <MapFlyTo selected={selected} />
      </Map>
    </div>
  );
}

function MapFlyTo({ selected }: { selected: data.StationInfo | null }) {
  const map = useMap();
  useEffect(() => {
    if (selected) {
      map.setZoom(10);
      map.flyTo([selected.Lat, selected.Lon]);
    }
  }, [selected]);
  return null;
}

type YearRain = {
  year: string;
  rain: number;
};

function StationTooltip({ station }: { station: data.StationInfo }) {
  const {
    selectedStations,
    addSelectedStation,
    removeSelectedStation,
    setSelectedStationsDetails,
  } = useAppContext();
  const [maxRain, setMaxRain] = useState<YearRain | undefined>(undefined);
  const [minRain, setMinRain] = useState<YearRain | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const rainByYear = await GetStationRain(station.NumPost);
      const minRain = rainByYear.reduce(
        (min, curr) => {
          if (min === undefined) {
            return {
              year: curr.Year,
              rain: curr.Rain,
            };
          } else {
            if (min.rain > curr.Rain) {
              return {
                year: curr.Year,
                rain: curr.Rain,
              };
            }
          }
          return min;
        },
        undefined as YearRain | undefined,
      );

      const maxRain = rainByYear.reduce(
        (max, curr) => {
          if (max === undefined) {
            return {
              year: curr.Year,
              rain: curr.Rain,
            };
          } else {
            if (max.rain < curr.Rain) {
              return {
                year: curr.Year,
                rain: curr.Rain,
              };
            }
          }
          return max;
        },
        undefined as YearRain | undefined,
      );

      setMinRain(minRain);
      setMaxRain(maxRain);
    })();
  }, []);

  const navigateToStationDetails = (station: data.StationInfo) => () => {
    setSelectedStationsDetails(station);
    navigate("/graphs/station");
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold px-4 pt-2">{station.CommonName}</p>
      <ItemGroup>
        <Item variant="outline" size="sm">
          <ItemMedia variant="icon">
            <ArrowDown />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Pluie minimum (mm/an)</ItemTitle>
            <ItemDescription>
              {minRain
                ? `${Math.round(minRain.rain)} mm en ${minRain.year}`
                : "NA"}
            </ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item variant="outline" size="sm">
          <ItemMedia variant="icon">
            <ArrowUp />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Pluie maximum (mm/an)</ItemTitle>
            <ItemDescription>
              {maxRain
                ? `${Math.round(maxRain.rain)} mm en ${maxRain.year}`
                : "NA"}
            </ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
      <ButtonGroup>
        {selectedStations.find((s) => s.NumPost === station.NumPost) ? (
          <Button
            variant="outline"
            onClick={() => removeSelectedStation(station.NumPost)}
          >
            <PinOff />
            Retirer des graphes
          </Button>
        ) : (
          <Button variant="outline" onClick={() => addSelectedStation(station)}>
            <PinIcon />
            Ajouter aux graphes
          </Button>
        )}
        <Button variant="outline" onClick={navigateToStationDetails(station)}>
          <SquareActivity />
          Afficher
        </Button>
      </ButtonGroup>
    </div>
  );
}

export default MapView;
