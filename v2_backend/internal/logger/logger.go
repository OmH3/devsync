package logger

import (
	"log/slog"
	"os"
)

// Setup configures the global logger to output strictly in JSON format.
func Setup() {
	// 1. Configure the JSON Handler to write to Standard Output (Console)
	// We set the default level to Info (which means it will log Info, Warn, and Error, but ignore Debug unless changed).
	options := &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}
	jsonHandler := slog.NewJSONHandler(os.Stdout, options)

	// 2. Create the new logger wrapping our JSON handler
	logger := slog.New(jsonHandler)

	// 3. Override Go's default global logger with our new JSON logger
	slog.SetDefault(logger)
}
