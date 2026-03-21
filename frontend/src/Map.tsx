import { LatLngExpression, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import {
  Map,
  MapLayerGroup,
  MapLayers,
  MapLayersControl,
  MapMarker,
  MapPopup,
  MapTileLayer,
  MapZoomControl,
} from "./components/ui/map";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./components/ui/command";
import {
  ArrowDown,
  ArrowUp,
  MapPin,
  PinIcon,
  PinOff,
  SquareActivity,
} from "lucide-react";
import { GetStationRain, GetStations } from "wailsjs/go/main/App";
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

const FRANCE_CENTER = [46.2276, 2.2137] satisfies LatLngExpression;

function MapView() {
  const [selected, setSelected] = useState<data.StationInfo | null>(null);

  const [stations, setStations] = useState<data.StationInfo[]>([]);
  const markerRefs = useRef<Record<string, Marker>>({});

  useEffect(() => {
    (async () => {
      const stationList = await GetStations();
      LogPrint(`loaded station with ${stationList.length} stations`);
      setStations(stationList);
    })();
  }, []);

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
          <MapLayerGroup key="station" name="Station">
            {stations.map((station) => (
              <MapMarker
                key={station.NumPost}
                ref={(marker) => {
                  if (marker) markerRefs.current[station.NumPost] = marker;
                  else delete markerRefs.current[station.NumPost];
                }}
                position={[station.Lat, station.Lon] satisfies LatLngExpression}
                icon={<MapPin />}
                eventHandlers={{ click: () => setSelected(station) }}
              >
                <MapPopup className="w-80">
                  <StationTooltip station={station} />
                </MapPopup>
              </MapMarker>
            ))}
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
  const { selectedStations, addSelectedStation, removeSelectedStation } =
    useAppContext();
  const [maxRain, setMaxRain] = useState<YearRain | undefined>(undefined);
  const [minRain, setMinRain] = useState<YearRain | undefined>(undefined);

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
        <Button variant="outline">
          <SquareActivity />
          Afficher
        </Button>
      </ButtonGroup>
    </div>
  );
}

export default MapView;
