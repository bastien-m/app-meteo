package data

import (
	"database/sql"
	"fmt"

	_ "github.com/duckdb/duckdb-go/v2"
)

type StationInfo struct {
	NumPost    string
	CommonName string
	Lat        float64
	Lon        float64
	Alti       float64
}

type DatasetResource struct {
	Description string            `json:"description"`
	Extras      map[string]string `json:"extras"`
	Id          string            `json:"id"`
	Format      string            `json:"format"`
	Latest      string            `json:"latest"`
}

type DataGouvDataset struct {
	Resources []DatasetResource `json:"resources"`
}

func InitDB() (*sql.DB, error) {
	db, err := sql.Open("duckdb", "")
	if err != nil {
		return nil, err
	}
	settings := []string{
		"SET threads=2",
		"SET memory_limit='4GB'",
		"SET preserve_insertion_order=false",
	}
	for _, s := range settings {
		if _, err := db.Exec(s); err != nil {
			return nil, fmt.Errorf("duckdb setting %q: %w", s, err)
		}
	}
	return db, nil
}

func QueryDptMetadata(db *sql.DB, dpt string) (LoadedDpt, error) {
	parquetPath := fmt.Sprintf("%s/%s.parquet", outDirectory, dpt)
	var startDate, endDate string
	var lines int
	row := db.QueryRow(fmt.Sprintf(`
		SELECT
			MIN(CAST(AAAAMMJJ AS VARCHAR)),
			MAX(CAST(AAAAMMJJ AS VARCHAR)),
			COUNT(*)
		FROM read_parquet('%s')
	`, parquetPath))
	if err := row.Scan(&startDate, &endDate, &lines); err != nil {
		return LoadedDpt{}, err
	}
	return LoadedDpt{
		Dpt:       dpt,
		Filename:  parquetPath,
		Lines:     lines,
		StartDate: startDate,
		EndDate:   endDate,
	}, nil
}
