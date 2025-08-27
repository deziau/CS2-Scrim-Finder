#!/bin/bash

# CS2 Scrim Bot Setup Script
echo "🎮 CS2 Scrim Bot Setup Script"
echo "=============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16.9.0 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.9.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to $REQUIRED_VERSION or higher."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created from template"
    echo ""
    echo "⚠️  IMPORTANT: Please edit the .env file with your Discord bot configuration:"
    echo "   • DISCORD_TOKEN - Your bot token from Discord Developer Portal"
    echo "   • CLIENT_ID - Your application ID from Discord Developer Portal"
    echo "   • GUILD_ID - Your Discord server ID (optional, for faster command deployment)"
    echo ""
    echo "   Note: Admin permissions are now handled via Discord Administrator role"
    echo "   Use /setup channel #channel-name in Discord to set the scrim channel"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Create database directory
mkdir -p database
echo "✅ Database directory created"

# Check if .env is configured
if grep -q "your_bot_token_here" .env; then
    echo ""
    echo "⚠️  WARNING: .env file contains placeholder values"
    echo "   Please configure your .env file before running the bot"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Edit .env file with your Discord bot configuration"
    echo "   2. Run: node deploy-commands.js"
    echo "   3. Run: npm start"
    echo "   4. Use /setup channel #channel-name in Discord to configure scrim channel"
    echo ""
    echo "🔗 Useful links:"
    echo "   • Discord Developer Portal: https://discord.com/developers/applications"
    echo "   • Bot Permissions Calculator: https://discordapi.com/permissions.html"
    echo ""
else
    echo ""
    echo "🚀 Setup completed! You can now:"
    echo "   1. Deploy commands: node deploy-commands.js"
    echo "   2. Start the bot: npm start"
    echo ""
fi

echo "✅ Setup script completed successfully!"