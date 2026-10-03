package controllers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/devsync/v2_backend/internal/api/utils"
	"github.com/devsync/v2_backend/internal/auth"
	"github.com/devsync/v2_backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// AuthRequest forces strict JSON validation exactly as mandated by our rules.
type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse represents the exact JSON shape returning to the Next.js frontend.
type AuthResponse struct {
	AccessToken string `json:"access_token"`
	UserID      string `json:"user_id"`
}

// Signup handles registering a new user.
func Signup(w http.ResponseWriter, r *http.Request) {
	// 1. JSON Validation
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, utils.NewBadRequest("Invalid JSON format"))
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || len(req.Password) < 6 {
		utils.WriteError(w, utils.NewBadRequest("Valid email and password (min 6 chars) required"))
		return
	}

	// 2. Hash Password (bcrypt)
	hashBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to secure password", err))
		return
	}

	// 3. Database Insertion (Via Repository!)
	newUserID, err := repository.CreateUser(r.Context(), req.Email, string(hashBytes))
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key value") {
			utils.WriteError(w, utils.NewBadRequest("Email already exists"))
			return
		}
		utils.WriteError(w, utils.NewInternal("Database insertion failed", err))
		return
	}

	// 4. Generate the RS256 JWT
	token, err := auth.GenerateAccessToken(newUserID, req.Email)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to generate token", err))
		return
	}

	// 4.5 Generate Refresh Token & Set Cookie
	refreshToken, err := auth.GenerateRefreshToken(newUserID, req.Email)
	if err == nil {
		http.SetCookie(w, &http.Cookie{
			Name:     "refresh_token",
			Value:    refreshToken,
			Path:     "/",
			HttpOnly: true, // Crucial: Prevents XSS attacks from reading the token
			Secure:   false, // Set to true in production with HTTPS
			SameSite: http.SameSiteLaxMode,
			MaxAge:   7 * 24 * 60 * 60, // 7 days
		})
	}

	// 5. Send Success Response (Status 201 Created)
	utils.WriteJSON(w, http.StatusCreated, AuthResponse{
		AccessToken: token,
		UserID:      newUserID,
	})
}

// Login handles authenticating an existing user.
func Login(w http.ResponseWriter, r *http.Request) {
	// 1. JSON Validation
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, utils.NewBadRequest("Invalid JSON format"))
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	// 2. Fetch User from Database (Via Repository!)
	user, err := repository.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		utils.WriteError(w, utils.NewUnauthorized("Invalid email or password"))
		return
	}

	// 3. Verify Password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		utils.WriteError(w, utils.NewUnauthorized("Invalid email or password"))
		return
	}

	// 4. Generate the RS256 JWT
	token, err := auth.GenerateAccessToken(user.ID, req.Email)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to generate token", err))
		return
	}

	// 4.5 Generate Refresh Token & Set Cookie
	refreshToken, err := auth.GenerateRefreshToken(user.ID, req.Email)
	if err == nil {
		http.SetCookie(w, &http.Cookie{
			Name:     "refresh_token",
			Value:    refreshToken,
			Path:     "/",
			HttpOnly: true, // Crucial: Prevents XSS attacks
			Secure:   false, // Set to true in production with HTTPS
			SameSite: http.SameSiteLaxMode,
			MaxAge:   7 * 24 * 60 * 60, // 7 days
		})
	}

	// 5. Send Success Response (Status 200 OK)
	utils.WriteJSON(w, http.StatusOK, AuthResponse{
		AccessToken: token,
		UserID:      user.ID,
	})
}

// RefreshTokens handles POST /auth/refresh to issue a new Access Token.
func RefreshTokens(w http.ResponseWriter, r *http.Request) {
	// 1. Extract the Refresh Token from the HttpOnly Cookie
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		utils.WriteError(w, utils.NewUnauthorized("No refresh token found"))
		return
	}

	// 2. Validate the Refresh Token
	claims, err := auth.ValidateToken(cookie.Value)
	if err != nil {
		utils.WriteError(w, utils.NewUnauthorized("Invalid or expired refresh token"))
		return
	}

	// 3. Generate a NEW short-lived Access Token
	newAccessToken, err := auth.GenerateAccessToken(claims.UserID, claims.Email)
	if err != nil {
		utils.WriteError(w, utils.NewInternal("Failed to generate new access token", err))
		return
	}

	// 4. (Optional but recommended) Rotate the Refresh Token
	newRefreshToken, err := auth.GenerateRefreshToken(claims.UserID, claims.Email)
	if err == nil {
		http.SetCookie(w, &http.Cookie{
			Name:     "refresh_token",
			Value:    newRefreshToken,
			Path:     "/",
			HttpOnly: true,
			Secure:   false,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   7 * 24 * 60 * 60,
		})
	}

	// 5. Send the new Access Token to the client
	utils.WriteJSON(w, http.StatusOK, AuthResponse{
		AccessToken: newAccessToken,
		UserID:      claims.UserID,
	})
}

// Logout handles POST /auth/logout by clearing the refresh token cookie.
func Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1, // Immediately expire the cookie
	})
	utils.WriteJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}
