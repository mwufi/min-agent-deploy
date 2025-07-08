#!/bin/bash

set -e

echo "🚀 Setting up development PostgreSQL database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Stop and remove existing container if it exists
echo "🧹 Cleaning up existing containers..."
docker compose -f docker-compose.dev.yml down 2>/dev/null || true

# Start PostgreSQL container
echo "🐘 Starting PostgreSQL container..."
docker compose -f docker-compose.dev.yml up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker compose -f docker-compose.dev.yml exec postgres pg_isready -U devuser -d minimal_agent_dev > /dev/null 2>&1; do
  sleep 1
done

echo "✅ PostgreSQL is ready!"
echo ""
echo "📋 Connection details:"
echo "-------------------"
echo "Set DB_URL to this:"
echo ""
echo "postgresql://devuser:devpass@localhost:5432/minimal_agent_dev"
echo ""
echo "🔧 To stop the database: docker compose -f docker-compose.dev.yml down"
echo "💾 To stop and remove data: docker compose -f docker-compose.dev.yml down -v"