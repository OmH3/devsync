#!/bin/bash
echo "🚀 Preparing DevSync V2 Production Deployment..."

# 1. Ensure Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️ Docker is not installed. Please install Docker and Docker Compose first."
    exit 1
fi

# 2. Check for RSA Certificates (needed for JWT)
if [ ! -f "./v2_backend/certs/private.pem" ]; then
    echo "🔑 Generating RSA Keys for JWT Auth..."
    mkdir -p ./v2_backend/certs
    openssl genrsa -out ./v2_backend/certs/private.pem 2048
    openssl rsa -in ./v2_backend/certs/private.pem -pubout > ./v2_backend/certs/public.pem
fi

# 3. Securely set database password if not set
if [ -z "$DB_PASSWORD" ]; then
    echo "🔒 DB_PASSWORD not set. Generating a random secure password..."
    export DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 24)
    echo "DB_PASSWORD=$DB_PASSWORD" > .env.prod
fi

# 4. Spin up the cluster
echo "🐳 Starting Docker Compose..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

echo "✅ Deployment Successful!"
echo "📡 Your backend is now running on Port 8080."
echo "Go to Vercel and set NEXT_PUBLIC_API_URL=http://<YOUR_SERVER_IP>:8080"
