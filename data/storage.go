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

type StationInfo struct {
	NumPost    string
	CommonName string
	Lat        float64
	Lon        float64
	Alti       float64
}

type RainByStation struct {
	NumPost string
	Year    string
	Rain    float64
}

type RainData struct {
	NumPost string
	Date    time.Time
	Rain    float64
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

func GetStationRainData(db *sql.DB, numPost string) ([]RainData, error) {
	stmt, err := db.Prepare(`
		SELECT NUM_POSTE, AAAAMMJJ as DATE, CAST(RR AS DOUBLE) as RAIN
		FROM read_parquet('data/parquet/*.parquet')
		WHERE CAST(NUM_POSTE AS VARCHAR) = ?
	`)

	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	rows, err := stmt.Query(numPost)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	response := make([]RainData, 0, 1000)

	var (
		numPoste string
		date     time.Time
		rain     float64
	)

	for {
		if rows.Next() {
			rows.Scan(&numPoste, &date, &rain)
			response = append(response, RainData{
				NumPost: numPoste,
				Date:    date,
				Rain:    rain,
			})
		} else {
			break
		}
	}
	return response, nil
}

func GetRainByStation(db *sql.DB, numPost string) ([]RainByStation, error) {
	stmt, err := db.Prepare(`
		SELECT NUM_POSTE, substr(CAST(AAAAMMJJ AS VARCHAR), 1, 4) as YEAR, sum(CAST(RR AS DOUBLE)) as RAIN
		FROM read_parquet('data/parquet/*.parquet')
		WHERE CAST(NUM_POSTE AS VARCHAR) = ?
		GROUP BY NUM_POSTE, YEAR
		HAVING count(1) > 365 * 0.95
		ORDER BY YEAR ASC
	`)

	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	rows, err := stmt.Query(numPost)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	response := make([]RainByStation, 0, 1000)

	var (
		numPoste, year string
		rain           float64
	)

	for {
		if rows.Next() {
			rows.Scan(&numPoste, &year, &rain)
			response = append(response, RainByStation{
				NumPost: numPoste,
				Year:    year,
				Rain:    rain,
			})
		} else {
			break
		}
	}
	return response, nil
}

func GetStationRain(db *sql.DB, station string) []RainByStation {
	stmt, err := db.Prepare("SELECT NUM_POSTE, NOM_USUEL, AAAAMMJJ, RR FROM read_parquet('data/parquet/*.parquet') WHERE CAST(NUM_POSTE AS VARCHAR) LIKE ?")
	if err != nil {
		return nil
	}
	defer stmt.Close()
	rows, err := stmt.Query(station + "%")

	if err != nil {
		return nil
	}

	defer rows.Close()

	response := make([]RainByStation, 0, 1000)

	var (
		numPoste, nomUsuelle, date string
		rr                         float64
	)

	for {
		if rows.Next() {
			rows.Scan(&numPoste, &nomUsuelle, &date, &rr)
			response = append(response, RainByStation{
				NumPost: numPoste,
				Year:    date[:4],
				Rain:    rr,
			})
		} else {
			break
		}
	}
	return response
}

func GetStations(db *sql.DB) ([]StationInfo, error) {
	stmt, err := db.Prepare("SELECT DISTINCT NUM_POSTE, NOM_USUEL, LAT, LON, ALTI FROM read_parquet('data/parquet/*.parquet')")
	if err != nil {
		return nil, err
	}
	defer stmt.Close()

	rows, err := stmt.Query()

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var numPoste, nomUsuel string
	var lat, long, alti float64

	response := make([]StationInfo, 0, 1000)

	for {
		if rows.Next() {
			rows.Scan(&numPoste, &nomUsuel, &lat, &long, &alti)
			response = append(response, StationInfo{
				NumPost:    numPoste,
				CommonName: nomUsuel,
				Lat:        lat,
				Lon:        long,
				Alti:       alti,
			})
		} else {
			break
		}
	}

	return response, nil
}

func GetClosestStation(db *sql.DB, lat, long float64) (*StationInfo, error) {
	stmt, err := db.Prepare(`
		SELECT NUM_POSTE, NOM_USUEL, LON, LAT, ALTI, ((LAT - ?) * 111)*((LAT - ?)*111) + ((LON - ?)*111*COS((LON + ?) / 2))*((LON - ?)*111*COS((LON + ?) / 2)) as D
		FROM read_parquet('data/parquet/*.parquet') 
		WHERE D < 10*10
		ORDER BY D LIMIT 1
	`)

	if err != nil {
		return nil, err
	}

	defer stmt.Close()

	var numPoste, nomUsuel string
	var latPoste, longPoste, alti, d float64

	rows := stmt.QueryRow(lat, lat, long, long, long, long)
	err = rows.Scan(&numPoste, &nomUsuel, &latPoste, &longPoste, &alti, &d)
	if err != nil {
		return nil, err
	}

	return &StationInfo{
		NumPost:    numPoste,
		CommonName: nomUsuel,
		Lat:        latPoste,
		Lon:        longPoste,
		Alti:       alti,
	}, nil

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
	rainDatasetId := "6569b51ae64326786e4e8e1a"
	url := fmt.Sprintf("https://www.data.gouv.fr/api/1/datasets/%s/", rainDatasetId)

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

	response := make([]string, 0)

	lastYear := fmt.Sprintf("%d", time.Now().Year()-1)

	for _, resource := range dataset.Resources {
		if strings.Contains(resource.Description, fmt.Sprintf("département %s", dpt)) {
			if strings.Contains(resource.Description, "RR-T-Vent") && strings.Contains(resource.Description, "1950") {
				// historical file is provided in csv.gz. Field "latest" at root level. Description like %1950% and RR-T-Vent
				// so we need to fetch this archive first, uncompress and transform it to parquet file
				// we can then move to data/parquet folder
				filename, err := downloadHistoricalFile(resource)
				if err == nil {
					csvPath, err := gunzipFile(filename)

					if err == nil {
						parquetPath, err := convertToParquetFile(db, csvPath)
						if err == nil {
							response = append(response, parquetPath)
						}
					}
				}

			} else if strings.Contains(resource.Description, "RR-T-Vent") && strings.Contains(resource.Description, lastYear) {
				// last year can be retrieved directly in parquet format
				// so we just need to move it to data/parquet folder
				parquetPropertyKey := "analysis:parsing:parquet_url"
				filename := fmt.Sprintf("data/parquet/%s.parquet", resource.Id)
				out, err := os.Create(filename)
				if err == nil {
					defer out.Close()
					resp, err := http.Get(resource.Extras[parquetPropertyKey])
					if err == nil {
						defer resp.Body.Close()
						if _, err = io.Copy(out, resp.Body); err == nil {
							response = append(response, filename)
						}
					}
				}
			}
		}
	}

	return response, nil
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
