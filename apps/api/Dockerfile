# ============================
# Stage 1: Build
# ============================
FROM golang:1.27-alpine AS builder

RUN apk add --no-cache ca-certificates git

WORKDIR /app

# Cache dependencies first
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build a static binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /finplan-api ./cmd/api

# ============================
# Stage 2: Runtime (minimal)
# ============================
FROM gcr.io/distroless/static:nonroot

COPY --from=builder /finplan-api /finplan-api

# Default port — override via PORT env var at runtime
ENV PORT=8080
EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/finplan-api"]
