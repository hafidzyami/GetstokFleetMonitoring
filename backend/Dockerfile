# Base stage dengan dependensi umum
FROM golang:1.20-alpine AS base

WORKDIR /app

# Install tools yang diperlukan
RUN go install github.com/swaggo/swag/cmd/swag@latest

# Copy file go mod dan download dependensi
COPY go.mod go.sum ./
RUN go mod download

# Stage development
FROM base AS dev

# Install air untuk hot-reload
RUN go install github.com/cosmtrek/air@latest

# Copy source code untuk development
COPY . .

# Command untuk menjalankan dengan hot reload
CMD ["air"]

# Stage builder untuk kompilasi
FROM base AS builder

# Copy source code
COPY . .

# Generate dokumentasi Swagger
RUN swag init -g main.go --output docs

# Build aplikasi
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Stage final untuk production
FROM alpine:latest AS prod

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary dan dokumentasi dari builder
COPY --from=builder /app/main .
COPY --from=builder /app/docs ./docs

# Expose port
EXPOSE 3000

# Command untuk menjalankan aplikasi
CMD ["./main"]