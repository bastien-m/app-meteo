import { ColumnDef } from "@tanstack/react-table";
import { data } from "wailsjs/go/models";

export const columns: ColumnDef<data.LoadedDpt>[] = [
  {
    accessorKey: "filename",
    header: "Fichier",
  },
  {
    accessorKey: "dpt",
    header: "Département",
  },
  {
    accessorKey: "lines",
    header: "Nb lignes",
  },
  {
    accessorKey: "startDate",
    header: "Première date",
  },
  {
    accessorKey: "endDate",
    header: "Dernière date",
  },
];
