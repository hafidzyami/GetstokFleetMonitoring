# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod files dan download dependensi
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Generate dokumentasi Swagger
RUN go install github.com/swaggo/swag/cmd/swag@latest
RUN swag init -g main.go --output docs

# Build aplikasi
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage untuk production
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary dan docs dari builder
COPY --from=builder /app/main .
COPY --from=builder /app/docs ./docs

# Expose port
EXPOSE 8080

# Command untuk menjalankan aplikasi
CMD ["./main"]