import { data } from "wailsjs/go/models";

export default function findStationByNumPost(
  numPost: string,
  stations: data.StationInfo[],
): data.StationInfo | undefined {
  return stations.find((s) => s.NumPost === numPost);
}
