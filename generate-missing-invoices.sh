#!/bin/bash

# Script to generate missing invoices for parcels without invoices

echo "=== Generating Missing Invoices ==="
echo ""

# Login to get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@shipping.com",
    "password": "Admin123!"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token"
  exit 1
fi

echo "✅ Access token obtained"
echo ""

# Get all parcels
echo "2. Fetching all parcels..."
PARCELS_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/parcels/search" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

# Extract parcel IDs and user IDs
PARCEL_DATA=$(echo "$PARCELS_RESPONSE" | jq -r '.data[] | "\(.id)|\(.userId)"')

echo "Found $(echo "$PARCEL_DATA" | wc -l) parcels"
echo ""

# Generate invoice for each parcel
echo "3. Generating invoices..."
GENERATED=0
FAILED=0

while IFS='|' read -r PARCEL_ID USER_ID; do
  if [ -z "$PARCEL_ID" ] || [ -z "$USER_ID" ]; then
    continue
  fi
  
  echo "Generating invoice for parcel $PARCEL_ID..."
  
  INVOICE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/billing/invoices/generate \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"parcelIds\": [\"$PARCEL_ID\"]}")
  
  SUCCESS=$(echo "$INVOICE_RESPONSE" | jq -r '.success')
  
  if [ "$SUCCESS" = "true" ]; then
    GENERATED=$((GENERATED + 1))
    echo "  ✅ Invoice generated"
  else
    FAILED=$((FAILED + 1))
    ERROR=$(echo "$INVOICE_RESPONSE" | jq -r '.message')
    echo "  ❌ Failed: $ERROR"
  fi
done <<< "$PARCEL_DATA"

echo ""
echo "=== Summary ==="
echo "✅ Generated: $GENERATED invoices"
echo "❌ Failed: $FAILED invoices"
