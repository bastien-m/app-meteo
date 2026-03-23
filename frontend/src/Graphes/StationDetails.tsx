import { useAppContext } from "@/AppContext";

export default function GraphStationView() {
  const appContext = useAppContext();

  return (
    <h1>
      Station {appContext.selectedStations[0]?.CommonName ?? "non sélectionnée"}
    </h1>
  );
}
