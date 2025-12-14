#!/bin/bash

echo "╔════════════════════════════════╗"
echo "║   💞 SELINA-ADMIN-BOT 💞      ║"
echo "║   Starting Bot...              ║"
echo "╚════════════════════════════════╝"

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed!"
    echo "📥 Please install Node.js from: https://nodejs.org/"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create logs directory
mkdir -p logs

# Check if PM2 is installed
if command -v pm2 &> /dev/null
then
    echo "🚀 Starting with PM2 (24/7 mode)..."
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ Bot started successfully!"
    echo "📊 Run 'pm2 monit' to monitor"
    echo "📋 Run 'pm2 logs selina-md' to view logs"
else
    echo "⚠️  PM2 not found. Starting in normal mode..."
    echo "💡 Install PM2 for 24/7: npm install -g pm2"
    node index.js
fi
