import { ColumnDef } from "@tanstack/react-table";
import { DataSourceDpt } from "./data";

export const columns: ColumnDef<DataSourceDpt>[] = [
  {
    accessorKey: "filename",
    header: "Fichier",
  },
  {
    accessorKey: "department",
    header: "Département",
  },
  {
    accessorKey: "records",
    header: "Nb lignes",
  },
  {
    accessorKey: "minDate",
    header: "Première date",
  },
  {
    accessorKey: "maxDate",
    header: "Dernière date",
  },
];
