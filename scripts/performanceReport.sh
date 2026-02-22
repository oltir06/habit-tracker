#!/bin/bash

echo "=== Habit Tracker API Performance Report ==="
echo "Date: $(date)"
echo ""

# Get token
echo "Logging in..."
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}' \
  | jq -r '.accessToken')

echo "✅ Authenticated"
echo ""

# Clear cache
echo "Clearing cache for baseline..."
redis-cli FLUSHDB > /dev/null
echo "✅ Cache cleared"
echo ""

# Test 1: Without cache
echo "=== Test 1: WITHOUT Cache (First Request) ==="
echo "GET /habits:"
time curl -s -o /dev/null -w "Time: %{time_total}s\n" \
  http://localhost:3000/habits \
  -H "Authorization: Bearer $TOKEN"

echo "GET /habits/stats:"
time curl -s -o /dev/null -w "Time: %{time_total}s\n" \
  http://localhost:3000/habits/stats \
  -H "Authorization: Bearer $TOKEN"

echo ""

# Test 2: With cache
echo "=== Test 2: WITH Cache (Second Request) ==="
echo "GET /habits:"
time curl -s -o /dev/null -w "Time: %{time_total}s\n" \
  http://localhost:3000/habits \
  -H "Authorization: Bearer $TOKEN"

echo "GET /habits/stats:"
time curl -s -o /dev/null -w "Time: %{time_total}s\n" \
  http://localhost:3000/habits/stats \
  -H "Authorization: Bearer $TOKEN"

echo ""

# Get metrics
echo "=== Cache Metrics ==="
curl -s http://localhost:3000/metrics | jq '{
  cache_connected,
  cache_hits,
  cache_misses,
  cache_hit_rate,
  cache_total_keys
}'

echo ""
echo "=== Report Complete ==="
