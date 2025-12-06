#!/bin/bash

# Script de test pour le webhook PBS Notify

API_URL="${1:-http://localhost:3000}"

echo "╔════════════════════════════════════════╗"
echo "║     PBS Notify - Webhook Test         ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Target: $API_URL/webhook"
echo ""

# Test 1: Notification de succès
echo "📤 Test 1: Sending SUCCESS notification..."
curl -X POST "$API_URL/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Backup of VM 100 completed successfully - 2.5GB transferred in 3m 42s",
    "status": "success"
  }'
echo -e "\n"

sleep 2

# Test 2: Notification d'erreur
echo "📤 Test 2: Sending ERROR notification..."
curl -X POST "$API_URL/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Backup of VM 200 failed - Connection timeout to storage",
    "status": "error"
  }'
echo -e "\n"

sleep 2

# Test 3: Autre notification de succès
echo "📤 Test 3: Sending another SUCCESS notification..."
curl -X POST "$API_URL/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Backup of Container 101 completed - All files verified",
    "status": "success"
  }'
echo -e "\n"

echo ""
echo "✅ Tests completed!"
echo ""
echo "Check your notifications and visit $API_URL to see the history."
