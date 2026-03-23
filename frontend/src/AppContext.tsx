import { produce } from "immer";
import { createContext, ReactNode, useContext, useState } from "react";
import { data } from "wailsjs/go/models";

type AppContext = {
  selectedStations: data.StationInfo[];
  addSelectedStation: (station: data.StationInfo) => void;
  removeSelectedStation: (numPost: string) => void;
  selectedStationDetails: data.StationInfo | undefined;
  setSelectedStationsDetails: (station?: data.StationInfo) => void;
};

const AppContext = createContext<AppContext | null>(null);

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [selectedStations, setSelectedStations] = useState<data.StationInfo[]>(
    [],
  );

  const [selectedStationDetails, setSelectedStationsDetails] =
    useState<data.StationInfo>();

  function addSelectedStation(station: data.StationInfo) {
    setSelectedStations(
      produce((draft) => {
        draft.push(station);
      }),
    );
  }

  function removeSelectedStation(numPost: string) {
    setSelectedStations(
      produce((draft) => draft.filter((s) => s.NumPost !== numPost)),
    );
  }

  return (
    <AppContext
      value={{
        selectedStations,
        addSelectedStation,
        removeSelectedStation,
        selectedStationDetails,
        setSelectedStationsDetails,
      }}
    >
      {children}
    </AppContext>
  );
}

export default AppContext;

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used inside AppContextProvider");
  }
  return ctx;
}
