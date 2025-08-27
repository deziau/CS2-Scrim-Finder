const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`🎮 Serving ${client.guilds.cache.size} server(s)`);
        console.log(`👥 Connected to ${client.users.cache.size} users`);
        
        // Set bot activity
        client.user.setActivity('CS2 Scrims | /scrim', { 
            type: ActivityType.Watching 
        });

        // Log some useful information
        console.log('\n📋 Bot Information:');
        console.log(`   • Bot ID: ${client.user.id}`);
        console.log(`   • Invite URL: https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);
        
        if (process.env.SCRIM_CHANNEL_ID) {
            console.log(`   • Scrim Channel ID: ${process.env.SCRIM_CHANNEL_ID}`);
        } else {
            console.log('   ⚠️  SCRIM_CHANNEL_ID not set in environment variables');
        }

        if (process.env.ADMIN_IDS) {
            const adminCount = process.env.ADMIN_IDS.split(',').length;
            console.log(`   • Admin Users: ${adminCount} configured`);
        } else {
            console.log('   ⚠️  ADMIN_IDS not set in environment variables');
        }

        console.log('\n🚀 CS2 Scrim Bot is now online and ready to coordinate scrims!');
        console.log('   Use /scrim to create scrim requests');
        console.log('   Use /editmaps to manage available maps (admin only)');
        console.log('   Use /scrimlist to view active scrims');
        console.log('   Use /alert to manage notifications');
        console.log('   Use /profile to save team information\n');
    },
};