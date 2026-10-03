package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/devsync/v2_backend/internal/api/controllers"
	"github.com/devsync/v2_backend/internal/api/middleware"
	"github.com/devsync/v2_backend/internal/auth"
	"github.com/devsync/v2_backend/internal/config"
	"github.com/devsync/v2_backend/internal/logger"
	"github.com/devsync/v2_backend/internal/repository"
	"github.com/pion/webrtc/v3"
)

func main() {
	// 1. Setup
	logger.Setup()
	auth.LoadKeys()
	ctx := context.Background()
	config.ConnectDB(ctx, config.LoadConfig().DatabaseURL)
	defer config.DB.Close()

	// 2. Setup Test Data
	userID, _ := repository.CreateUser(ctx, fmt.Sprintf("rtc_%d@example.com", time.Now().Unix()), "hash")
	ws, _ := repository.CreateWorkspace(ctx, "Audio Room", userID)
	token, _ := auth.GenerateAccessToken(userID, "coder")

	// 3. GENERATE A REAL MOCK SDP OFFER (Pretending to be the browser)
	pc, _ := webrtc.NewPeerConnection(webrtc.Configuration{})
	// Create a dummy audio track so it generates a valid offer
	track, _ := webrtc.NewTrackLocalStaticSample(webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeOpus}, "audio", "pion")
	pc.AddTrack(track)
	
	offer, _ := pc.CreateOffer(nil)
	pc.SetLocalDescription(offer)
	
	// Wait for ICE gathering
	gatherComplete := webrtc.GatheringCompletePromise(pc)
	<-gatherComplete
	
	mockOfferSDP := pc.LocalDescription().SDP

	// 4. Wrap Route in Gateway
	rtcRoute := middleware.AuthGateway(controllers.JoinAudioRoom)

	// --- TEST: JOIN AUDIO ROOM ---
	fmt.Println("--- TESTING: WEBRTC SDP SIGNALING ---")
	
	reqBody, _ := json.Marshal(map[string]string{
		"workspace_id": ws.ID,
		"offer_sdp":    mockOfferSDP,
	})
	
	req, _ := http.NewRequest("POST", "/webrtc/join", bytes.NewBuffer(reqBody))
	req.Header.Set("Authorization", "Bearer "+token)
	
	rec := httptest.NewRecorder()
	rtcRoute.ServeHTTP(rec, req)
	
	fmt.Printf("HTTP Status: %d\n", rec.Code)
	// We only print the first 100 chars of the SDP answer because they are MASSIVE strings
	responseStr := rec.Body.String()
	if len(responseStr) > 200 {
		fmt.Printf("JSON Response (Truncated): %s...\n", responseStr[:200])
	} else {
		fmt.Printf("JSON Response: %s\n", responseStr)
	}
}
