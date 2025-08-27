# 🚀 Railway Deployment Guide

## ❌ Commands Not Showing in Discord?

If your bot is running but you can't see the slash commands, you need to deploy them first.

### 🔧 **Quick Fix:**

#### **Option 1: Deploy from Local Machine (Recommended)**

1. **Clone your Railway project locally:**
   ```bash
   git clone your-railway-repo-url
   cd cs2-scrim-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create .env file with your bot credentials:**
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=1410184494526238737
   GUILD_ID=your_server_id_here
   ```

4. **Deploy commands:**
   ```bash
   node deploy-commands.js
   ```

5. **You should see output like:**
   ```
   🚀 Started refreshing 7 application (/) commands.
   ✅ Successfully reloaded 7 guild application (/) commands for guild YOUR_GUILD_ID.
   
   📋 Deployed Commands:
      • /scrim - Create a new scrim request
      • /scrimlist - View all active scrim requests
      • /profile - Manage your team profile for quick scrim creation
      • /alert - Manage your scrim alert notifications
      • /setup - Configure bot settings (Admin only)
      • /editmaps - Manage the available maps for scrims (Admin only)
      • /scrimclear - Manually cleanup expired or completed scrims (Admin only)
   ```

#### **Option 2: Add to Railway Build Process**

1. **Update your Railway project's build command:**
   - Go to Railway dashboard
   - Select your project
   - Go to Settings → Deploy
   - Set **Build Command** to: `npm install && node deploy-commands.js`
   - Set **Start Command** to: `node bot.js`

2. **Redeploy your Railway service**

### 🔍 **Troubleshooting:**

#### **Commands Still Not Showing?**

1. **Check Guild ID:**
   - Make sure `GUILD_ID` in your .env matches your Discord server ID
   - Right-click your server → Copy Server ID (need Developer Mode enabled)

2. **Global vs Guild Commands:**
   - Guild commands appear instantly but only in that server
   - Global commands take up to 1 hour but work in all servers
   - For testing, use guild commands (faster)

3. **Bot Permissions:**
   - Make sure bot has "Use Slash Commands" permission
   - Re-invite bot if needed with proper permissions

4. **Check Discord Developer Portal:**
   - Go to https://discord.com/developers/applications
   - Select your application → OAuth2 → URL Generator
   - Select "bot" and "applications.commands" scopes
   - Use generated URL to re-invite bot

### 📋 **Environment Variables for Railway:**

Make sure these are set in Railway dashboard:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=1410184494526238737
GUILD_ID=your_server_id_here
CLEANUP_INTERVAL=0 */6 * * *
```

### ✅ **Verification Steps:**

1. **Commands deployed successfully** ✅
2. **Bot online in Discord** ✅ (you have this)
3. **Commands visible in Discord** ❌ (this is the issue)
4. **Bot responds to commands** (after step 3)

### 🎯 **Quick Test:**

After deploying commands, try typing `/` in your Discord server. You should see all the bot commands appear in the autocomplete menu.

---

## 🔄 **For Future Updates:**

When you update commands, always run:
```bash
node deploy-commands.js
```

This ensures Discord knows about any changes to your slash commands.