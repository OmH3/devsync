package utils

import "net/http"

// AppError represents a centralized API error holding the status code and safe message.
type AppError struct {
	StatusCode int    `json:"status_code"`
	Message    string `json:"message"`
	Err        error  `json:"-"` // Hidden from JSON frontend response, kept for internal Grafana logging
}

// Error implements the standard Go error interface
func (e *AppError) Error() string {
	return e.Message
}

// Pre-configured Error Generators for the Controllers to use instantly

func NewBadRequest(msg string) *AppError {
	return &AppError{StatusCode: http.StatusBadRequest, Message: msg}
}

func NewUnauthorized(msg string) *AppError {
	return &AppError{StatusCode: http.StatusUnauthorized, Message: msg}
}

func NewForbidden(msg string) *AppError {
	return &AppError{StatusCode: http.StatusForbidden, Message: msg}
}

func NewNotFound(msg string) *AppError {
	return &AppError{StatusCode: http.StatusNotFound, Message: msg}
}

// NewInternal expects the actual Go error (e.g., DB crash) so we can log it secretly
func NewInternal(msg string, err error) *AppError {
	return &AppError{StatusCode: http.StatusInternalServerError, Message: msg, Err: err}
}
