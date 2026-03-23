package data

import (
	"database/sql"
	"time"
)

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
