#!/bin/bash

# Verify Backend Configuration Script
# This script checks if the backend is correctly configured for the new BatchTransfer contract

echo "🔍 Verifying Backend Configuration for BatchTransfer Contract"
echo "=============================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend file exists
BACKEND_FILE="backend/Web3PayrollGuardian.API/Services/MultiSendCallOnlyTransactionBuilder.cs"

if [ ! -f "$BACKEND_FILE" ]; then
    echo -e "${RED}❌ Error: Backend file not found: $BACKEND_FILE${NC}"
    exit 1
fi

echo "✅ Backend file found"
echo ""

# Check contract address
echo "📍 Checking contract address..."
if grep -q "0xb74546BD63B11C3955065B0A7fa4aF5B46D28475" "$BACKEND_FILE"; then
    echo -e "${GREEN}✅ Contract address is correct: 0xb74546BD63B11C3955065B0A7fa4aF5B46D28475${NC}"
else
    echo -e "${RED}❌ Contract address is incorrect or not found${NC}"
    echo "Expected: 0xb74546BD63B11C3955065B0A7fa4aF5B46D28475"
fi
echo ""

# Check function selector
echo "🔧 Checking function selector..."
if grep -q "0x2e, 0x1a, 0x7d, 0x4d" "$BACKEND_FILE"; then
    echo -e "${GREEN}✅ Function selector is correct: 0x2e1a7d4d (batchTransferFrom)${NC}"
else
    echo -e "${RED}❌ Function selector is incorrect or not found${NC}"
    echo "Expected: 0x2e, 0x1a, 0x7d, 0x4d (0x2e1a7d4d)"
fi
echo ""

# Check for EncodeBatchTransferFunctionCall method
echo "📝 Checking EncodeBatchTransferFunctionCall method..."
if grep -q "EncodeBatchTransferFunctionCall" "$BACKEND_FILE"; then
    echo -e "${GREEN}✅ EncodeBatchTransferFunctionCall method found${NC}"
else
    echo -e "${RED}❌ EncodeBatchTransferFunctionCall method not found${NC}"
fi
echo ""

# Check frontend configuration
FRONTEND_FILE="frontend/src/renderer/services/LocalStorageService.ts"

if [ ! -f "$FRONTEND_FILE" ]; then
    echo -e "${RED}❌ Error: Frontend file not found: $FRONTEND_FILE${NC}"
    exit 1
fi

echo "✅ Frontend file found"
echo ""

echo "📍 Checking frontend BSC Testnet configuration..."
if grep -q "0xb74546BD63B11C3955065B0A7fa4aF5B46D28475" "$FRONTEND_FILE"; then
    echo -e "${GREEN}✅ Frontend BSC Testnet contract address is correct${NC}"
else
    echo -e "${RED}❌ Frontend BSC Testnet contract address is incorrect or not found${NC}"
fi
echo ""

# Check for old contract address (should not exist)
echo "🔍 Checking for old contract address..."
if grep -q "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761" "$BACKEND_FILE"; then
    echo -e "${YELLOW}⚠️  Warning: Old contract address found in backend file${NC}"
    echo "This should be removed or updated"
else
    echo -e "${GREEN}✅ No old contract address found in backend${NC}"
fi
echo ""

# Summary
echo "=============================================================="
echo "📊 Verification Summary"
echo "=============================================================="
echo ""
echo "Backend Configuration:"
echo "  - Contract Address: 0xb74546BD63B11C3955065B0A7fa4aF5B46D28475"
echo "  - Function Selector: 0x2e1a7d4d (batchTransferFrom)"
echo "  - Network: BSC Testnet (Chain ID: 97)"
echo ""
echo "Frontend Configuration:"
echo "  - BSC Testnet Contract: 0xb74546BD63B11C3955065B0A7fa4aF5B46D28475"
echo ""
echo -e "${YELLOW}⚠️  Important: Users must clear browser cache!${NC}"
echo "   Run: open frontend/clear-cache.html"
echo ""
echo "For detailed instructions, see:"
echo "  - CONTRACT_ADDRESS_FIX_JP.md"
echo "  - BATCH_TRANSFER_MIGRATION_SUMMARY.md"
echo ""
