package data

import (
	"compress/gzip"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

var Log logger.Logger = logger.NewDefaultLogger()

func SetLogger(l logger.Logger) {
	Log = l
}

// limit concurrent DuckDB COPY operations to avoid OOM
var csvConversionSem = make(chan struct{}, 2)

type ResourceFileType int

const (
	RRTVent ResourceFileType = iota
	ExtraParams
)

const (
	datasetURLPrefix       = "https://www.data.gouv.fr/api/1/datasets"
	datasetID              = "6569b51ae64326786e4e8e1a"
	parquetFilePropertyKey = "analysis:parsing:parquet_url"
	tmpDirectory           = "data/tmp"
	outDirectory           = "data/parquet"
)

var MetropolitanDpts = []string{
	"01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
	"11", "12", "13", "14", "15", "16", "17", "18", "19", "21",
	"22", "23", "24", "25", "26", "27", "28", "29",
	"30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
	"40", "41", "42", "43", "44", "45", "46", "47", "48", "49",
	"50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
	"60", "61", "62", "63", "64", "65", "66", "67", "68", "69",
	"70", "71", "72", "73", "74", "75", "76", "77", "78", "79",
	"80", "81", "82", "83", "84", "85", "86", "87", "88", "89",
	"90", "91", "92", "93", "94", "95",
}

// var MetropolitanDpts = []string{
// 	"01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
// }

type FileResource struct {
	Dpt        string
	ResourceId string
}

func DownloadAllDpt(db *sql.DB) {
	dptChan := make(chan string)

	for _, dpt := range MetropolitanDpts {
		DownloadParquetFileForDpt(dpt, dptChan, db)
	}

	for range MetropolitanDpts {
		dpt := <-dptChan
		BuildParquetFile(dpt, db)
	}
}

// Download parquet files for a dpt
func DownloadParquetFileForDpt(dpt string, resourceChan chan<- string, db *sql.DB) {
	if len(dpt) == 1 {
		dpt = "0" + dpt
	}

	if err := os.MkdirAll(outDirectory, 0755); err != nil {
		Log.Error(fmt.Sprintf("mkdir for %s: %v", dpt, err))
		return
	}

	dataset, err := downloadDatasetMetadata()
	if err != nil {
		Log.Error("Error while fetching metadata for dataset")
		return
	}

	go func() {
		lastYear := fmt.Sprintf("%d", time.Now().Year()-1)

		var wg sync.WaitGroup

		for _, resource := range dataset.Resources {
			if !strings.Contains(resource.Description, fmt.Sprintf("département %s", dpt)) {
				continue
			}
			isRightType := strings.Contains(resource.Description, "RR-T-Vent") || strings.Contains(resource.Description, "autres-parametres")
			isRightPeriod := strings.Contains(resource.Description, "1950") || strings.Contains(resource.Description, lastYear)
			if isRightType && isRightPeriod {
				wg.Add(1)
				if strings.Contains(resource.Description, "RR-T-Vent") {
					if resource.Extras[parquetFilePropertyKey] == "" {
						go downloadCsvGzFile(dpt, resource.Latest, resource.Id, RRTVent, db, &wg)
					} else {
						go downloadParquetFile(dpt, resource.Extras[parquetFilePropertyKey], resource.Id, RRTVent, &wg)
					}
				} else {
					if resource.Extras[parquetFilePropertyKey] == "" {
						go downloadCsvGzFile(dpt, resource.Latest, resource.Id, ExtraParams, db, &wg)
					} else {
						go downloadParquetFile(dpt, resource.Extras[parquetFilePropertyKey], resource.Id, ExtraParams, &wg)
					}
				}
			}
		}

		wg.Wait()
		resourceChan <- dpt
	}()
}

// Concatenate parquet file into one file
func BuildParquetFile(dpt string, db *sql.DB) {
	rrPath := fmt.Sprintf("%s/%s/%d/*.parquet", tmpDirectory, dpt, RRTVent)
	extraPath := fmt.Sprintf("%s/%s/%d/*.parquet", tmpDirectory, dpt, ExtraParams)
	outPath := fmt.Sprintf("%s/%s.parquet", outDirectory, dpt)

	query := fmt.Sprintf(`
		COPY (
			SELECT rr.*, extra.* EXCLUDE (NUM_POSTE, AAAAMMJJ, NOM_USUEL, LAT, LON, ALTI)
			FROM read_parquet('%s', union_by_name := true) rr
			JOIN read_parquet('%s', union_by_name := true) extra
				ON rr.NUM_POSTE = extra.NUM_POSTE AND rr.AAAAMMJJ = extra.AAAAMMJJ
			ORDER BY rr.NUM_POSTE, rr.AAAAMMJJ
		) TO '%s' (FORMAT PARQUET, COMPRESSION ZSTD)
	`, rrPath, extraPath, outPath)

	if _, err := db.Exec(query); err != nil {
		Log.Error(fmt.Sprintf("build parquet for %s: %v", dpt, err))
	}
}

// sometime parquet file are not available but a csv.gz file is
// so we download it, gunzip it and finally copy to tmp folder
func downloadCsvGzFile(dpt string, url string, resourceId string, resourceType ResourceFileType, db *sql.DB, wg *sync.WaitGroup) {
	defer wg.Done()

	dir := fmt.Sprintf("%s/%s/%d", tmpDirectory, dpt, resourceType)
	if err := os.MkdirAll(dir, 0755); err != nil {
		Log.Error(fmt.Sprintf("mkdir for %s: %v", dpt, err))
		return
	}

	resp, err := http.Get(url)
	if err != nil {
		Log.Error(fmt.Sprintf("download %s: %v", url, err))
		return
	}
	defer resp.Body.Close()

	gzReader, err := gzip.NewReader(resp.Body)
	if err != nil {
		Log.Error(fmt.Sprintf("gunzip %s: %v", url, err))
		return
	}
	defer gzReader.Close()

	csvPath := fmt.Sprintf("%s/%s/%d/%s.csv", tmpDirectory, dpt, resourceType, resourceId)
	csvFile, err := os.Create(csvPath)
	if err != nil {
		Log.Error(fmt.Sprintf("create csv %s: %v", csvPath, err))
		return
	}
	if _, err = io.Copy(csvFile, gzReader); err != nil {
		csvFile.Close()
		Log.Error(fmt.Sprintf("write csv %s: %v", csvPath, err))
		return
	}
	csvFile.Close()
	defer os.Remove(csvPath)

	parquetPath := fmt.Sprintf("%s/%s/%d/%s.parquet", tmpDirectory, dpt, resourceType, resourceId)

	csvConversionSem <- struct{}{}
	defer func() { <-csvConversionSem }()

	query := fmt.Sprintf(`COPY (
		SELECT * REPLACE (strptime(printf('%%d', AAAAMMJJ), '%%Y%%m%%d')::DATE AS AAAAMMJJ)
		FROM read_csv('%s', auto_detect=true, header=true)
	) TO '%s' (FORMAT PARQUET, COMPRESSION ZSTD)`, csvPath, parquetPath)
	if _, err = db.Exec(query); err != nil {
		Log.Error(fmt.Sprintf("csv to parquet %s: %v", csvPath, err))
	}
}

// Download parquet file
// Under tmp > {dpt} > {ResourceType} > files
func downloadParquetFile(dpt string, url string, resourceId string, resourceType ResourceFileType, wg *sync.WaitGroup) {
	defer wg.Done()
	path := fmt.Sprintf("%s/%s/%d/%s.parquet", tmpDirectory, dpt, resourceType, resourceId)
	if err := os.MkdirAll(fmt.Sprintf("%s/%s/%d", tmpDirectory, dpt, resourceType), 0755); err != nil {
		Log.Error(fmt.Sprintf("mkdir for %s: %v", dpt, err))
		return
	}
	out, err := os.Create(path)
	if err != nil {
		Log.Error(fmt.Sprintf("create file %s: %v", path, err))
		return
	}
	defer out.Close()

	resp, err := http.Get(url)
	if err != nil {
		Log.Error(fmt.Sprintf("download %s: %v", url, err))
		return
	}
	defer resp.Body.Close()
	if _, err = io.Copy(out, resp.Body); err != nil {
		Log.Error(fmt.Sprintf("write %s: %v", path, err))
	}
}

func downloadDatasetMetadata() (*DataGouvDataset, error) {
	url := datasetURLPrefix + "/" + datasetID
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

	return &dataset, nil
}
