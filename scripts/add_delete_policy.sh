#!/bin/bash

# Script to add delete policy for products using Supabase Management API

PROJECT_REF="fdxxynnsxgiozaiiexlm"
SQL_FILE="supabase/add_admin_delete_products_simple.sql"

echo "🔧 Adding delete policy for products..."
echo "📋 Project: $PROJECT_REF"
echo ""

# Read SQL file
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL file not found: $SQL_FILE"
    exit 1
fi

SQL_CONTENT=$(cat "$SQL_FILE")

echo "📝 SQL to execute:"
echo "============================================================"
echo "$SQL_CONTENT"
echo "============================================================"
echo ""

# Check if we have access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN not set"
    echo ""
    echo "📝 To execute SQL automatically, you need:"
    echo "   1. Get access token from: https://supabase.com/dashboard/account/tokens"
    echo "   2. Export it: export SUPABASE_ACCESS_TOKEN=your-token"
    echo "   3. Run this script again"
    echo ""
    echo "🔗 Or execute manually:"
    echo "   https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
    echo ""
    exit 0
fi

echo "🚀 Executing SQL via Management API..."
echo ""

# Use Management API to execute SQL
RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$SQL_CONTENT\"}")

if [ $? -eq 0 ]; then
    echo "✅ SQL executed successfully!"
    echo "📋 Response: $RESPONSE"
else
    echo "❌ Failed to execute SQL"
    echo "📝 Please execute manually:"
    echo "   https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
fi

