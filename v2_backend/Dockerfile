# Build stage
FROM golang:alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Production stage
FROM alpine:latest

WORKDIR /app

# Install docker CLI so the Go backend can execute Docker commands for the code sandbox
RUN apk add --no-cache docker-cli

# Copy binary from builder
COPY --from=builder /app/main .
COPY --from=builder /app/certs ./certs

EXPOSE 8080

CMD ["./main"]
