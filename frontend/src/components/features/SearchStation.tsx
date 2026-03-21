import { useState } from "react";
import { data } from "wailsjs/go/models";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";

export function SearchStationComponent({
  stations,
  onSelect,
}: {
  stations: data.StationInfo[];
  onSelect: (s: data.StationInfo) => void;
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
            {stations.map((station) => (
              <CommandItem
                key={station.NumPost}
                value={station.CommonName}
                onSelect={() => {
                  onSelect(station);
                  setOpen(false);
                }}
              >
                {station.CommonName}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      )}
    </Command>
  );
}
