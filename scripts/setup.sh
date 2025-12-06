# #!/bin/bash

# echo "Setting up EHR Blockchain Project..."

# # Kill any existing hardhat node
# echo " Stopping any existing Hardhat node..."
# pkill -f "hardhat node" || true

# # Start hardhat node in background
# echo "Starting Hardhat node..."
# npx hardhat node > hardhat.log 2>&1 &
# HARDHAT_PID=$!
# echo " Hardhat node started (PID: $HARDHAT_PID)"

# # Wait for node to start
# sleep 3

# # Deploy contracts
# echo " Deploying contracts..."
# npx hardhat run scripts/deploy-all.js --network localhost

# # Reset would be manual (MetaMask)
# echo ""
# echo " Setup complete!"
# echo ""
# echo " Next steps:"
# echo "1. Reset MetaMask (Settings → Advanced → Reset Account)"
# echo "2. Run: npm run dev"
# echo "3. Start testing!"
# echo ""
# echo "To stop Hardhat node: kill $HARDHAT_PID"
#!/bin/bash

# Enhanced EHR Blockchain - Quick Setup Script
# This script automates the deployment and setup process

set -e  # Exit on error

echo "=========================================="
echo " Enhanced EHR Blockchain Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}Dependencies installed${NC}"
else
    echo -e "${GREEN}Dependencies already installed${NC}"
fi

# Stop any existing Hardhat node
echo ""
echo -e "${YELLOW}Stopping existing Hardhat node...${NC}"
pkill -f "hardhat node" 2>/dev/null || true
sleep 2
echo -e "${GREEN}Existing nodes stopped${NC}"

# Clean old artifacts
echo ""
echo -e "${YELLOW} Cleaning old artifacts...${NC}"
npx hardhat clean
echo -e "${GREEN} Artifacts cleaned${NC}"

# Compile contracts
echo ""
echo -e "${YELLOW}Compiling smart contracts...${NC}"
npx hardhat compile
echo -e "${GREEN}Contracts compiled${NC}"

# Start Hardhat node in background
echo ""
echo -e "${YELLOW}Starting Hardhat node...${NC}"
npx hardhat node > hardhat.log 2>&1 &
HARDHAT_PID=$!
echo -e "${GREEN}Hardhat node started (PID: $HARDHAT_PID)${NC}"

# Wait for node to be ready
echo ""
echo -e "${YELLOW}Waiting for node to be ready...${NC}"
sleep 5

# Deploy contracts
echo ""
echo -e "${YELLOW}Deploying contracts...${NC}"
npx hardhat run scripts/deploy-enhanced.js --network localhost

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}🎉 SETUP COMPLETED SUCCESSFULLY! 🎉${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo "   4. Run: npm run dev"
    echo "   5. Visit: http://localhost:3000"
    echo ""
    echo -e "${YELLOW} Admin Account:${NC}"
    echo "   Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    echo ""
    echo -e "${YELLOW}Logs:${NC}"
    echo "   Hardhat node logs: tail -f hardhat.log"
    echo ""
    echo -e "${YELLOW}To stop Hardhat node:${NC}"
    echo "   kill $HARDHAT_PID"
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    
    # Save PID for later use
    echo $HARDHAT_PID > .hardhat.pid
else
    echo ""
    echo -e "${RED}Deployment failed!${NC}"
    echo -e "${RED}Check hardhat.log for details${NC}"
    kill $HARDHAT_PID 2>/dev/null || true
    exit 1
fi