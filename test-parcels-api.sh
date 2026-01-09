#!/bin/bash

# Test script to verify API authentication and parcels endpoint

echo "=== Testing Parcels API ==="
echo ""

# Step 1: Login to get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@shipping.com",
    "password": "Admin123!"
  }')

echo "Login response:"
echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token"
  exit 1
fi

echo "✅ Access token obtained"
echo ""

# Step 2: Test parcels/search endpoint
echo "2. Testing /api/parcels/search..."
PARCELS_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/parcels/search" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Parcels response:"
echo "$PARCELS_RESPONSE" | jq '.'
echo ""

# Count parcels
PARCEL_COUNT=$(echo "$PARCELS_RESPONSE" | jq '.data | length')
echo "✅ Found $PARCEL_COUNT parcels"
