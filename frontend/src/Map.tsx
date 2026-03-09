import { LatLngExpression } from "leaflet";
import { useState } from "react";
import {
  Map,
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

type Station = { id: string; name: string; lat: number; lon: number };

const STATIONS: Station[] = [
  { id: "1", name: "Rennes", lat: 48.117, lon: -1.678 },
  { id: "2", name: "Liffré", lat: 48.205, lon: -1.504 },
  { id: "3", name: "Paris-Montsouris", lat: 48.822, lon: 2.337 },
  { id: "4", name: "Lyon-Bron", lat: 45.727, lon: 5.081 },
  { id: "5", name: "Bordeaux-Mérignac", lat: 44.829, lon: -0.691 },
  { id: "6", name: "Marseille-Marignane", lat: 43.437, lon: 5.215 },
  { id: "7", name: "Brest-Guipavas", lat: 48.447, lon: -4.419 },
  { id: "8", name: "Strasbourg-Entzheim", lat: 48.538, lon: 7.628 },
];

const liffre_lat = 48.205347;
const liffre_long = -1.503642;

const position = [liffre_lat, liffre_long] satisfies LatLngExpression;

function MapView() {
  const [selected, setSelected] = useState<Station | null>(null);
  const center = selected
    ? ([selected.lat, selected.lon] satisfies LatLngExpression)
    : position;

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-51 w-72">
        <SearchStationComponent onSelect={setSelected} />
      </div>
      <Map center={center} className="flex-1 relative">
        <MapTileLayer />
        <MapZoomControl position="top-1 right-1" />
        {selected && (
          <MapMarker position={[selected.lat, selected.lon]}>
            <MapPopup>{selected.name}</MapPopup>
          </MapMarker>
        )}
      </Map>
    </div>
  );
}

function SearchStationComponent({
  onSelect,
}: {
  onSelect: (s: Station) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput
        placeholder="Search station..."
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <CommandList>
          <CommandEmpty>No station found.</CommandEmpty>
          <CommandGroup heading="Stations">
            {STATIONS.map((station) => (
              <CommandItem
                key={station.id}
                value={station.name}
                onSelect={() => {
                  onSelect(station);
                  setOpen(false);
                }}
              >
                {station.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      )}
    </Command>
  );
}

export default MapView;
