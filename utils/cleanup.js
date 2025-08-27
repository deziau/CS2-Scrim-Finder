const cron = require('node-cron');

class CleanupService {
    constructor(client, database) {
        this.client = client;
        this.database = database;
        this.isRunning = false;
    }

    start() {
        // Run cleanup every 6 hours (or based on CLEANUP_INTERVAL env var)
        const cronExpression = process.env.CLEANUP_INTERVAL || '0 */6 * * *';
        
        console.log(`🧹 Cleanup service started with schedule: ${cronExpression}`);
        
        cron.schedule(cronExpression, async () => {
            if (this.isRunning) {
                console.log('⏳ Cleanup already running, skipping this cycle');
                return;
            }

            console.log('🧹 Starting automatic cleanup...');
            await this.performCleanup();
        });

        // Also run cleanup on startup (after a short delay)
        setTimeout(async () => {
            console.log('🧹 Running initial cleanup on startup...');
            await this.performCleanup();
        }, 30000); // 30 seconds delay
    }

    async performCleanup() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        let cleanedCount = 0;
        let errorCount = 0;

        try {
            const expiredScrims = await this.database.getExpiredScrims();
            
            if (expiredScrims.length === 0) {
                console.log('✅ No expired scrims found during cleanup');
                this.isRunning = false;
                return;
            }

            console.log(`🗑️  Found ${expiredScrims.length} expired scrims to clean up`);

            // Get the scrim channel
            const scrimChannelId = await this.database.getSetting('SCRIM_CHANNEL_ID') || process.env.SCRIM_CHANNEL_ID;
            if (!scrimChannelId) {
                console.error('❌ SCRIM_CHANNEL_ID not configured, cannot perform cleanup');
                this.isRunning = false;
                return;
            }

            const scrimChannel = this.client.channels.cache.get(scrimChannelId);
            if (!scrimChannel) {
                console.error('❌ Scrim channel not found, cannot perform cleanup');
                this.isRunning = false;
                return;
            }

            // Process each expired scrim
            for (const scrim of expiredScrims) {
                try {
                    await this.cleanupScrim(scrim, scrimChannel);
                    cleanedCount++;
                    
                    // Add a small delay between deletions to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (scrimError) {
                    console.error(`❌ Error cleaning scrim ${scrim.id}:`, scrimError.message);
                    errorCount++;
                }
            }

            console.log(`✅ Cleanup completed: ${cleanedCount} cleaned, ${errorCount} errors`);

        } catch (error) {
            console.error('❌ Error during cleanup process:', error);
        } finally {
            this.isRunning = false;
        }
    }

    async cleanupScrim(scrim, scrimChannel) {
        // Delete the message
        try {
            const message = await scrimChannel.messages.fetch(scrim.message_id);
            if (message) {
                await message.delete();
                console.log(`🗑️  Deleted message for scrim: ${scrim.team_name}`);
            }
        } catch (msgError) {
            if (msgError.code !== 10008) { // Unknown Message error
                console.log(`⚠️  Message ${scrim.message_id} already deleted or not found`);
            }
        }

        // Delete the thread if it exists
        if (scrim.thread_id) {
            try {
                const thread = await scrimChannel.threads.fetch(scrim.thread_id);
                if (thread) {
                    await thread.delete();
                    console.log(`🧵 Deleted thread for scrim: ${scrim.team_name}`);
                }
            } catch (threadError) {
                if (threadError.code !== 10003) { // Unknown Channel error
                    console.log(`⚠️  Thread ${scrim.thread_id} already deleted or not found`);
                }
            }
        }

        // Update database status
        await this.database.updateScrimStatus(scrim.message_id, 'auto_cleaned');
    }

    // Manual cleanup method for admin commands
    async manualCleanup() {
        console.log('🧹 Manual cleanup requested...');
        return await this.performCleanup();
    }

    // Get cleanup statistics
    async getCleanupStats() {
        try {
            const activeScrims = await this.database.getAllActiveScrims();
            const expiredScrims = await this.database.getExpiredScrims();
            
            return {
                active: activeScrims.length,
                expired: expiredScrims.length,
                total: activeScrims.length + expiredScrims.length
            };
        } catch (error) {
            console.error('Error getting cleanup stats:', error);
            return { active: 0, expired: 0, total: 0 };
        }
    }
}

module.exports = CleanupService;