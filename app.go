package main

import (
	"app-meteo/data"
	"context"
	"database/sql"
	"fmt"
)

// App struct
type App struct {
	ctx context.Context
	cfg *data.UserConfig
	db  *sql.DB
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	db, err := data.InitDB()
	if err != nil {
		panic(err)
	}
	cfg, err := data.LoadUserConfig()

	if err != nil {
		panic(err)
	}

	a.ctx = ctx
	a.db = db
	a.cfg = cfg
}

func (a *App) DownloadAllDepartmentsWeatherData() error {
	data.DownloadAllDpt(a.db)

	loadedDpts := make(map[string]bool)
	for _, ld := range a.cfg.LoadedDpts {
		loadedDpts[ld.Dpt] = true
	}

	for _, dpt := range data.MetropolitanDpts {
		if loadedDpts[dpt] {
			continue
		}
		loadedDpt, err := data.QueryDptMetadata(a.db, dpt)
		if err != nil {
			return fmt.Errorf("erreur lors du chargement du département %s: %w", dpt, err)
		}
		if err := a.cfg.AddLoadedDpt([]data.LoadedDpt{loadedDpt}); err != nil {
			return err
		}
	}
	return nil
}

func (a *App) DownloadDptWeatherData(dpt string) error {
	dptChan := make(chan string, 1)
	data.DownloadParquetFileForDpt(dpt, dptChan, a.db)
	completedDpt := <-dptChan
	data.BuildParquetFile(completedDpt, a.db)
	loadedDpt, err := data.QueryDptMetadata(a.db, completedDpt)
	if err != nil {
		return err
	}
	return a.cfg.AddLoadedDpt([]data.LoadedDpt{loadedDpt})
}

func (a *App) GetLoadedSource() ([]data.LoadedDpt, error) {
	if a.cfg == nil {
		return nil, fmt.Errorf("Config not loaded")
	}
	return a.cfg.LoadedDpts, nil
}

func (a *App) GetUsername() string {
	if a.cfg == nil {
		return ""
	}
	return a.cfg.Profile.Username
}

func (a *App) GetStations() ([]data.StationInfo, error) {
	return data.GetStations(a.db)
}

func (a *App) GetStationRain(station string) ([]data.RainByStation, error) {
	return data.GetRainByStation(a.db, station)
}

func (a *App) GetStationRainData(station string) ([]data.WeatherData, error) {
	return data.GetStationRainData(a.db, station)
}

func (a *App) GetAvgRainAllStations() ([]data.StationAvgRain, error) {
	return data.GetAvgRainAllStations(a.db)
}
