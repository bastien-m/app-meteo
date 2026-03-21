package data

import (
	"encoding/json"
	"fmt"
	"os"
)

const userConfigPath = "data/userconfig.json"

type LoadedDpt struct {
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
	Lines     int    `json:"lines"`
	Dpt       string `json:"dpt"`
	Filename  string `json:"filename"`
}

type UserProfile struct {
	Username string `json:"username"`
}

type UserConfig struct {
	Schema     string      `json:"$schema"`
	Profile    UserProfile `json:"profile"`
	LoadedDpts []LoadedDpt `json:"loadedDpts"`
}

func LoadUserConfig() (*UserConfig, error) {
	f, err := os.ReadFile(userConfigPath)
	if err != nil {
		return nil, fmt.Errorf("read userconfig: %w", err)
	}
	var cfg UserConfig
	if err := json.Unmarshal(f, &cfg); err != nil {
		return nil, fmt.Errorf("parse userconfig: %w", err)
	}
	return &cfg, nil
}

func saveUserConfig(cfg *UserConfig) error {
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal userconfig: %w", err)
	}
	return os.WriteFile(userConfigPath, b, 0644)
}

func (cfg *UserConfig) UpdateUsername(username string) error {
	cfg.Profile.Username = username
	return saveUserConfig(cfg)
}

func (cfg *UserConfig) AddLoadedDpt(dpts []LoadedDpt) error {
	existing := make(map[string]bool)
	for _, d := range cfg.LoadedDpts {
		existing[d.Dpt] = true
	}
	for _, dpt := range dpts {
		if existing[dpt.Dpt] {
			return fmt.Errorf("dpt %q is already loaded", dpt.Dpt)
		}
	}
	cfg.LoadedDpts = append(cfg.LoadedDpts, dpts...)
	return saveUserConfig(cfg)
}

func (cfg *UserConfig) RemoveLoadedDpt(dpt string) error {
	filtered := cfg.LoadedDpts[:0]
	for _, d := range cfg.LoadedDpts {
		if d.Dpt != dpt {
			filtered = append(filtered, d)
		}
	}
	if len(filtered) == len(cfg.LoadedDpts) {
		return fmt.Errorf("dpt %q not found", dpt)
	}
	cfg.LoadedDpts = filtered
	return saveUserConfig(cfg)
}
