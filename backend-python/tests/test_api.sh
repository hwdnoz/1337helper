#!/bin/bash

# API Test Script
# Usage: ./test_api.sh [base_url]
# Example: ./test_api.sh http://localhost:5102

BASE_URL="${1:-http://localhost:5102}"
PASSED=0
FAILED=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test helper function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $description (expected $expected_status, got $http_code)"
        echo "   Response: $body"
        ((FAILED++))
        return 1
    fi
}

echo "Testing API at: $BASE_URL"
echo "================================"

# Health endpoint
test_endpoint "GET" "/health" "200" "GET /health - Health check"
test_endpoint "GET" "/type" "200" "GET /type - Get backend type"

# Code routes
test_endpoint "GET" "/api/code" "200" "GET /api/code - Get default code"
test_endpoint "GET" "/api/available-models" "200" "GET /api/available-models - List models"
test_endpoint "POST" "/api/run" "200" "POST /api/run - Execute code" '{"code":"print(\"test\")"}'

# Admin routes - Observability
test_endpoint "GET" "/api/observability/metrics" "200" "GET /api/observability/metrics - Get metrics"
test_endpoint "GET" "/api/observability/summary" "200" "GET /api/observability/summary - Get summary"
test_endpoint "GET" "/api/observability/call/1" "200" "GET /api/observability/call/1 - Get call details"

# Admin routes - Model
test_endpoint "GET" "/api/current-model" "200" "GET /api/current-model - Get current model"
test_endpoint "POST" "/api/current-model" "200" "POST /api/current-model - Set model" '{"model":"test-model"}'

# Admin routes - Prompts
test_endpoint "GET" "/api/prompts" "200" "GET /api/prompts - List prompts"
test_endpoint "GET" "/api/prompts/test_prompt" "200" "GET /api/prompts/<name> - Get prompt"
test_endpoint "POST" "/api/prompts/test_prompt" "200" "POST /api/prompts/<name> - Update prompt" '{"content":"test"}'
test_endpoint "DELETE" "/api/prompts/test_prompt" "200" "DELETE /api/prompts/<name> - Reset prompt"

# Jobs routes (skipped - require Celery/Redis)
echo -e "${YELLOW}⊘${NC} POST /api/jobs/leetcode - Skipped (requires Celery/Redis)"
echo -e "${YELLOW}⊘${NC} POST /api/jobs/test-cases - Skipped (requires Celery/Redis)"
echo -e "${YELLOW}⊘${NC} POST /api/jobs/code-modification - Skipped (requires Celery/Redis)"
echo -e "${YELLOW}⊘${NC} GET /api/jobs/<job_id> - Skipped (requires Celery/Redis)"

# Cache routes
test_endpoint "GET" "/api/cache/stats" "200" "GET /api/cache/stats - Get cache stats"
test_endpoint "GET" "/api/cache/entries" "200" "GET /api/cache/entries - Get cache entries"
test_endpoint "GET" "/api/cache/enabled" "200" "GET /api/cache/enabled - Get enabled status"
test_endpoint "POST" "/api/cache/enabled" "200" "POST /api/cache/enabled - Set enabled status" '{"enabled":true}'
test_endpoint "GET" "/api/cache/model-aware" "200" "GET /api/cache/model-aware - Get model-aware status"
test_endpoint "POST" "/api/cache/model-aware" "200" "POST /api/cache/model-aware - Set model-aware" '{"model_aware":true}'
test_endpoint "GET" "/api/cache/semantic-enabled" "200" "GET /api/cache/semantic-enabled - Get semantic status"
test_endpoint "POST" "/api/cache/semantic-enabled" "200" "POST /api/cache/semantic-enabled - Set semantic" '{"semantic_enabled":false}'
test_endpoint "POST" "/api/cache/clear" "200" "POST /api/cache/clear - Clear cache"
test_endpoint "POST" "/api/cache/clear-expired" "200" "POST /api/cache/clear-expired - Clear expired"

# Summary
echo "================================"
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
