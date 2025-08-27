# CS2 Scrim Bot 🎮

A comprehensive Discord bot designed to help CS2 teams find and coordinate scrimmages. Built with Discord.js v14 and SQLite for reliable scrim management.

## ✨ Features

### 🎯 Core Functionality
- **Interactive Scrim Creation**: Step-by-step form to create scrim requests
- **Smart Map Selection**: Admin-configurable map pool with multi-select options
- **Team Profiles**: Save team information for quick scrim posting
- **Interest System**: Teams can show interest with automatic DM notifications
- **Thread Management**: Auto-created discussion threads for each scrim

### 🛠️ Admin Tools
- **Map Management**: Add, remove, and list available maps
- **Manual Cleanup**: Force cleanup of expired scrims
- **Scrim Overview**: View all active scrim requests

### 🔔 Smart Features
- **Alert System**: Optional DM notifications for new scrims
- **Auto Cleanup**: Automatic removal of expired scrims (7 days or past date)
- **Status Management**: Mark scrims as filled or cancelled
- **Pagination**: Easy navigation through scrim lists

## 🚀 Commands

| Command | Description | Access |
|---------|-------------|---------|
| `/scrim` | Create a new scrim request | Everyone |
| `/scrimlist` | View all active scrim requests | Everyone |
| `/profile view/edit` | Manage your team profile | Everyone |
| `/alert on/off/status` | Manage scrim notifications | Everyone |
| `/setup channel/info` | Configure bot settings | Admin Only |
| `/editmaps add/remove/list` | Manage available maps | Admin Only |
| `/scrimclear` | Manual cleanup of expired scrims | Admin Only |

## 📋 Scrim Post Format

```
📢 Scrim Request
🏷 Team: Apex Predators
🎯 Division: Main
📅 When: 29 Aug 2025, 7:00PM ACDT
🗺 Maps: Mirage, Ancient
🌐 Server: Yes
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 16.9.0 or higher
- A Discord application with bot token
- Discord server with appropriate permissions

### Installation

1. **Clone and Install**
   ```bash
   cd cs2-scrim-bot
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here
   CLEANUP_INTERVAL=0 */6 * * *
   ```

3. **Deploy Commands**
   ```bash
   node deploy-commands.js
   ```

4. **Start the Bot**
   ```bash
   npm start
   ```

5. **Configure the Bot in Discord**
   - Use `/setup channel #your-scrim-channel` to set where scrims will be posted
   - Use `/setup info` to view current configuration

### Discord Bot Setup

1. **Create Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create new application
   - Go to "Bot" section and create bot
   - Copy the token for `DISCORD_TOKEN`

2. **Bot Permissions**
   Required permissions:
   - Send Messages
   - Use Slash Commands
   - Manage Messages
   - Create Public Threads
   - Send Messages in Threads
   - Embed Links
   - Read Message History

3. **Invite Bot**
   Use this URL format:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
   ```

## 🗄️ Database Schema

The bot uses SQLite with the following tables:
- `scrims` - Active and historical scrim data
- `maps` - Available map pool
- `profiles` - User team profiles
- `alert_preferences` - User notification settings

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DISCORD_TOKEN` | Bot token from Discord | ✅ | - |
| `CLIENT_ID` | Application ID from Discord | ✅ | - |
| `GUILD_ID` | Server ID for guild commands | ❌ | - |
| `CLEANUP_INTERVAL` | Cron expression for cleanup | ❌ | `0 */6 * * *` |

**Note:** Admin permissions are now handled via Discord Administrator role. The scrim channel can be set using `/setup channel` command.

### Default Maps
The bot comes pre-configured with CS2 competitive maps:
- Mirage
- Dust2
- Inferno
- Cache
- Overpass
- Vertigo
- Ancient
- Anubis
- Nuke

## 🔄 Auto Cleanup System

The bot automatically cleans up expired scrims:
- **Trigger**: Every 6 hours (configurable)
- **Criteria**: 
  - Scrims older than 7 days
  - Scrims with past date/time
- **Actions**:
  - Deletes Discord message
  - Removes discussion thread
  - Updates database status

## 🎮 Usage Flow

1. **Team posts scrim** using `/scrim`
2. **Form completion**: Team name, division, date/time, maps, server
3. **Auto-post creation** in designated channel with discussion thread
4. **Other teams show interest** via button interaction
5. **DM notifications** sent to both teams
6. **Coordination** happens in the thread
7. **Status updates** (filled/cancelled) or auto-cleanup

## 🛡️ Error Handling

- Comprehensive error logging
- Graceful degradation for missing permissions
- Database transaction safety
- Rate limit protection
- Automatic retry mechanisms

## 📊 Monitoring

The bot logs:
- Command usage
- Cleanup operations
- Error occurrences
- Database operations
- User interactions

## 🔒 Security Features

- Admin-only commands with ID verification
- Input validation and sanitization
- SQL injection prevention
- Rate limiting protection
- Secure environment variable handling

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with proper error handling
4. Test thoroughly
5. Submit pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
1. Check the logs for error messages
2. Verify environment configuration
3. Ensure bot has proper permissions
4. Check Discord API status

## 🔄 Updates

To update the bot:
1. Pull latest changes
2. Run `npm install` for new dependencies
3. Redeploy commands if needed
4. Restart the bot

---

**Made for the CS2 community** 🎯

*Happy fragging!* 💥