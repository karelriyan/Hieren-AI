#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Testing RAG Deployment${NC}\n"

# Get Railway URL
echo "📡 Getting Railway URL..."
RAILWAY_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*' | cut -d'"' -f4)

if [ -z "$RAILWAY_URL" ]; then
    echo -e "${RED}❌ Could not get Railway URL. Make sure you're in the RAG directory.${NC}"
    echo "Run: cd /home/karel/code/hieren-ai/RAG"
    exit 1
fi

echo -e "${GREEN}✅ Railway URL: $RAILWAY_URL${NC}\n"

# Test 1: Health Check
echo "🏥 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$RAILWAY_URL/health")

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

# Test 2: Chat Endpoint
echo -e "\n💬 Testing chat endpoint..."
CHAT_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/chat" \
    -H "Content-Type: application/json" \
    -d '{"text": "Apa itu energi terbarukan?", "user_id": "test"}')

if echo "$CHAT_RESPONSE" | grep -q "response"; then
    echo -e "${GREEN}✅ Chat endpoint working${NC}"
    echo "Sample response: $(echo $CHAT_RESPONSE | cut -c1-100)..."
else
    echo -e "${RED}❌ Chat endpoint failed${NC}"
    echo "Response: $CHAT_RESPONSE"
fi

# Show next steps
echo -e "\n${YELLOW}📋 Next Steps:${NC}"
echo "1. Add this to Vercel environment variables:"
echo -e "   ${GREEN}RAG_BACKEND_URL=$RAILWAY_URL${NC}"
echo ""
echo "2. Upload documents to Pinecone:"
echo -e "   ${GREEN}railway run python -m app.builder${NC}"
echo ""
echo "3. Redeploy Vercel project"

echo -e "\n${GREEN}🎉 Deployment test complete!${NC}"
