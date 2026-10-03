package main

import (
	"errors"
	"fmt"
	"net/http/httptest"

	"github.com/devsync/v2_backend/internal/api/utils"
	"github.com/devsync/v2_backend/internal/logger"
)

func main() {
	// 1. Setup the structured JSON logger (Grafana setup)
	logger.Setup()

	// 2. We simulate the frontend making a request
	recorder := httptest.NewRecorder()

	// 3. Scenario A: A controller throws a generic Bad Request (e.g., missing password)
	fmt.Println("--- SIMULATING BAD REQUEST ---")
	badReqErr := utils.NewBadRequest("Password must be at least 8 characters")
	utils.WriteError(recorder, badReqErr)
	fmt.Printf("Frontend JSON Response: %s\n", recorder.Body.String())
	recorder.Body.Reset()

	// 4. Scenario B: A controller throws a fatal 500 error (e.g., Database crash)
	fmt.Println("\n--- SIMULATING FATAL DB ERROR ---")
	// The real database error is "tcp timeout", but we hide that from the frontend
	realDBError := errors.New("tcp connection timeout on port 5432") 
	internalErr := utils.NewInternal("Our servers are currently busy, please try again later", realDBError)
	
	utils.WriteError(recorder, internalErr)
	fmt.Printf("Frontend JSON Response: %s\n", recorder.Body.String())
}
