package auth

import (
	"crypto/rsa"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
)

// LoadKeys loads the RSA public and private keys from the disk.
func LoadKeys() error {
	privBytes, err := os.ReadFile("certs/private.pem")
	if err != nil {
		return fmt.Errorf("could not read private key: %v", err)
	}
	privateKey, err = jwt.ParseRSAPrivateKeyFromPEM(privBytes)
	if err != nil {
		return fmt.Errorf("could not parse private key: %v", err)
	}

	pubBytes, err := os.ReadFile("certs/public.pem")
	if err != nil {
		return fmt.Errorf("could not read public key: %v", err)
	}
	publicKey, err = jwt.ParseRSAPublicKeyFromPEM(pubBytes)
	if err != nil {
		return fmt.Errorf("could not parse public key: %v", err)
	}
	return nil
}

// Claims defines our strictly typed JSON payload inside the token
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// GenerateAccessToken creates a short-lived token using the Private Key
func GenerateAccessToken(userID, email string) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)), // Short-lived Access Token
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "devsync-v2",
		},
	}
	
	// Create the token structure specifying RS256 algorithm
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	
	// Sign the token exclusively with the Private Key
	return token.SignedString(privateKey)
}

// ValidateToken verifies a token using the Public Key
func ValidateToken(tokenStr string) (*Claims, error) {
	// Parse it and verify the signature
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Ensure hackers haven't tried to downgrade the algorithm to something weak
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		
		// Return the Public Key for verification
		return publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	// If successful, extract our typed claims
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	
	return nil, fmt.Errorf("invalid token")
}

// GenerateRefreshToken creates a long-lived token using the Private Key
func GenerateRefreshToken(userID, email string) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)), // 7 Days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "devsync-v2",
		},
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(privateKey)
}
