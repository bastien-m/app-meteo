package data

import (
	"compress/gzip"
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/duckdb/duckdb-go/v2"
)

const (
	datasetId = "6569b51ae64326786e4e8e1a"
)

type StationInfo struct {
	NumPost    string
	CommonName string
	Lat        float64
	Lon        float64
	Alti       float64
}

func InitDB() (*sql.DB, error) {
	db, err := sql.Open("duckdb", "")
	if err != nil {
		return nil, err
	}
	return db, nil
}

func LoadDepartment(ctx context.Context, db *sql.DB, dpt string) ([]LoadedDpt, error) {
	parquetFiles, err := downloadDataGouvDataset(db, dpt)
	if err != nil {
		return nil, err
	}

	if len(parquetFiles) == 0 {
		return nil, fmt.Errorf("no parquet resources found for department %q", dpt)
	}

	if len(dpt) == 1 {
		dpt = "0" + dpt
	}

	response := make([]LoadedDpt, 0, len(parquetFiles))

	for _, parquetFile := range parquetFiles {
		var startDate, endDate string
		var lines int
		row := db.QueryRow(fmt.Sprintf(`
			SELECT
				MIN(CAST(AAAAMMJJ AS VARCHAR)),
				MAX(CAST(AAAAMMJJ AS VARCHAR)),
				COUNT(*)
			FROM read_parquet('%s')
		`, parquetFile))
		if err := row.Scan(&startDate, &endDate, &lines); err == nil {
			response = append(response, LoadedDpt{
				Dpt:       dpt,
				Filename:  parquetFile,
				Lines:     lines,
				StartDate: startDate,
				EndDate:   endDate,
			})
		}
	}

	return response, nil
}

type DataGouvFile struct {
	id          string
	title       string
	description string
}

func readDataGouvFile() ([]DataGouvFile, error) {
	f, err := os.Open("./data/liens-datagouv-meteo.csv")
	if err != nil {
		return nil, err
	}
	defer f.Close()

	csvReader := csv.NewReader(f)
	csvReader.Comma = ','

	// id,title,description,format,url,latest,filesize
	data := make([]DataGouvFile, 0, 100)

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		data = append(data, DataGouvFile{
			id:          record[0],
			title:       record[1],
			description: record[2],
		})
	}

	return data, nil
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

func downloadDataGouvDataset(db *sql.DB, dpt string) ([]string, error) {

	url := fmt.Sprintf("https://www.data.gouv.fr/api/1/datasets/%s/", datasetId)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	var dataset DataGouvDataset
	json.NewDecoder(resp.Body).Decode(&dataset)

	if len(dpt) == 1 {
		dpt = "0" + dpt
	}

	lastYear := fmt.Sprintf("%d", time.Now().Year()-1)

	var historicalRRTVent, historicalAutresParams *DatasetResource
	var recentRRTVent, recentAutresParams *DatasetResource

	for i, resource := range dataset.Resources {
		if !strings.Contains(resource.Description, fmt.Sprintf("département %s", dpt)) {
			continue
		}
		r := &dataset.Resources[i]
		switch {
		case strings.Contains(resource.Description, "RR-T-Vent") && strings.Contains(resource.Description, "1950"):
			historicalRRTVent = r
		case strings.Contains(resource.Description, "autres-parametres") && strings.Contains(resource.Description, "1950"):
			historicalAutresParams = r
		case strings.Contains(resource.Description, "RR-T-Vent") && strings.Contains(resource.Description, lastYear):
			recentRRTVent = r
		case strings.Contains(resource.Description, "autres-parametres") && strings.Contains(resource.Description, lastYear):
			recentAutresParams = r
		}
	}

	var historicalParquet, recentParquet string

	// Historical: csv.gz → parquet, then enrich with SIGMA from autres-parametres csv.gz
	if historicalRRTVent != nil {
		filename, err := downloadHistoricalFile(*historicalRRTVent)
		if err == nil {
			csvPath, err := gunzipFile(filename)
			if err == nil {
				parquetPath, err := convertToParquetFile(db, csvPath)
				if err == nil {
					if historicalAutresParams != nil {
						extraFilename, err := downloadHistoricalFile(*historicalAutresParams)
						if err == nil {
							extraCSVPath, err := gunzipFile(extraFilename)
							if err == nil {
								if err := enrichParquetWithExtraObservablesFromCSV(db, parquetPath, extraCSVPath); err == nil {
									os.Remove(extraCSVPath)
								}
							}
						}
					}
					historicalParquet = parquetPath
				}
			}
		}
	}

	// Recent: parquet directly, then enrich with SIGMA from autres-parametres parquet
	if recentRRTVent != nil {
		parquetPropertyKey := "analysis:parsing:parquet_url"
		filename := fmt.Sprintf("data/tmp/%s.parquet", recentRRTVent.Id)
		if err := downloadFile(recentRRTVent.Extras[parquetPropertyKey], filename); err == nil {
			if recentAutresParams != nil {
				extraFilename := fmt.Sprintf("data/tmp/%s.parquet", recentAutresParams.Id)
				if err := downloadFile(recentAutresParams.Extras[parquetPropertyKey], extraFilename); err == nil {
					if err := enrichParquetWithExtraObservablesFromParquet(db, filename, extraFilename); err == nil {
						os.Remove(extraFilename)
					}
				}
			}
			recentParquet = filename
		}
	}

	if historicalParquet != "" && recentParquet != "" {
		mergedPath := fmt.Sprintf("data/parquet/%s.parquet", dpt)
		if err := mergeParquetFiles(db, mergedPath, historicalParquet, recentParquet); err == nil {
			os.Remove(historicalParquet)
			os.Remove(recentParquet)
			return []string{mergedPath}, nil
		}
	}

	// Fallback: return whatever we have if merge failed or one file is missing
	response := make([]string, 0, 2)
	if historicalParquet != "" {
		response = append(response, historicalParquet)
	}
	if recentParquet != "" {
		response = append(response, recentParquet)
	}
	return response, nil
}

func downloadFile(url, dest string) error {
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

func mergeParquetFiles(db *sql.DB, destPath, path1, path2 string) error {
	query := fmt.Sprintf(`
		COPY (
			SELECT * FROM read_parquet('%s')
			UNION ALL
			SELECT * FROM read_parquet('%s')
			ORDER BY NUM_POSTE, AAAAMMJJ
		) TO '%s' (FORMAT PARQUET, COMPRESSION ZSTD)
	`, path1, path2, destPath)

	if _, err := db.Exec(query); err != nil {
		return fmt.Errorf("merge parquet files: %w", err)
	}
	return nil
}

func enrichParquetWithExtraObservablesFromCSV(db *sql.DB, parquetPath, csvPath string) error {
	tmpPath := parquetPath + ".tmp"
	query := fmt.Sprintf(`
		COPY (
			SELECT m.*, e.SIGMA, e.UM, e.DRR
			FROM read_parquet('%s') m
			LEFT JOIN (
				SELECT NUM_POSTE, strptime(CAST(AAAAMMJJ AS VARCHAR), '%%Y%%m%%d')::DATE AS AAAAMMJJ, SIGMA, UM, DRR
				FROM read_csv('%s', auto_detect=true, delim=';')
			) e ON m.NUM_POSTE = e.NUM_POSTE AND m.AAAAMMJJ = e.AAAAMMJJ
		) TO '%s' (FORMAT PARQUET, COMPRESSION ZSTD)
	`, parquetPath, csvPath, tmpPath)

	if _, err := db.Exec(query); err != nil {
		return fmt.Errorf("enrich parquet with SIGMA from CSV: %w", err)
	}

	return os.Rename(tmpPath, parquetPath)
}

func enrichParquetWithExtraObservablesFromParquet(db *sql.DB, parquetPath, extraParquetPath string) error {
	tmpPath := parquetPath + ".tmp"
	query := fmt.Sprintf(`
		COPY (
			SELECT m.*, e.SIGMA, e.UM, e.DRR
			FROM read_parquet('%s') m
			LEFT JOIN read_parquet('%s') e ON m.NUM_POSTE = e.NUM_POSTE AND m.AAAAMMJJ = e.AAAAMMJJ
		) TO '%s' (FORMAT PARQUET, COMPRESSION ZSTD)
	`, parquetPath, extraParquetPath, tmpPath)

	if _, err := db.Exec(query); err != nil {
		return fmt.Errorf("enrich parquet with SIGMA from parquet: %w", err)
	}

	return os.Rename(tmpPath, parquetPath)
}

func downloadHistoricalFile(resource DatasetResource) (string, error) {
	if resource.Format != "csv.gz" {
		return "", fmt.Errorf("expected csv.gz format, got %q", resource.Format)
	}

	if err := os.MkdirAll("data/tmp", 0755); err != nil {
		return "", fmt.Errorf("create tmp dir: %w", err)
	}

	filename := fmt.Sprintf("data/tmp/%s.csv.gz", resource.Id)
	out, err := os.Create(filename)
	if err != nil {
		return "", fmt.Errorf("create file: %w", err)
	}
	defer out.Close()

	resp, err := http.Get(resource.Latest)
	if err != nil {
		return "", fmt.Errorf("download file: %w", err)
	}
	defer resp.Body.Close()

	if _, err = io.Copy(out, resp.Body); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	return filename, nil
}

func gunzipFile(gzPath string) (string, error) {
	in, err := os.Open(gzPath)
	if err != nil {
		return "", fmt.Errorf("open gz file: %w", err)
	}
	defer in.Close()

	gzReader, err := gzip.NewReader(in)
	if err != nil {
		return "", fmt.Errorf("create gzip reader: %w", err)
	}
	defer gzReader.Close()

	csvPath := strings.TrimSuffix(gzPath, ".gz")
	out, err := os.Create(csvPath)
	if err != nil {
		return "", fmt.Errorf("create csv file: %w", err)
	}
	defer out.Close()

	if _, err = io.Copy(out, gzReader); err != nil {
		return "", fmt.Errorf("decompress file: %w", err)
	}

	if err := os.Remove(gzPath); err != nil {
		return "", fmt.Errorf("remove gz file: %w", err)
	}

	return csvPath, nil
}

func convertToParquetFile(db *sql.DB, csvPath string) (string, error) {
	if err := os.MkdirAll("data/parquet", 0755); err != nil {
		return "", fmt.Errorf("create parquet dir: %w", err)
	}

	name := strings.TrimSuffix(filepath.Base(csvPath), ".csv")
	parquetPath := fmt.Sprintf("data/parquet/%s.parquet", name)

	query := fmt.Sprintf(
		`COPY (SELECT * REPLACE (strptime(CAST(AAAAMMJJ AS VARCHAR), '%%Y%%m%%d')::DATE AS AAAAMMJJ) FROM read_csv('%s', auto_detect=true, delim=';')) TO '%s' (FORMAT PARQUET, COMPRESSION ZSTD)`,
		csvPath, parquetPath,
	)
	if _, err := db.Exec(query); err != nil {
		return "", fmt.Errorf("convert to parquet: %w", err)
	}

	if err := os.Remove(csvPath); err != nil {
		return "", fmt.Errorf("remove csv file: %w", err)
	}

	return parquetPath, nil
}
