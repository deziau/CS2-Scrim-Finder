const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scrimclear')
        .setDescription('Manually cleanup expired or completed scrims (Admin only)'),

    async execute(interaction, database) {
        // Check if user has admin permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ 
                content: '❌ You need Administrator permissions to use this command.', 
                ephemeral: true 
            });
            return;
        }

        try {
            // Get expired scrims
            const expiredScrims = await database.getExpiredScrims();
            const activeScrims = await database.getAllActiveScrims();

            const embed = new EmbedBuilder()
                .setColor('#ffa500')
                .setTitle('🧹 Scrim Cleanup')
                .addFields(
                    { name: '📊 Current Status', value: `**Active Scrims:** ${activeScrims.length}\n**Expired Scrims:** ${expiredScrims.length}`, inline: false }
                );

            if (expiredScrims.length === 0) {
                embed.setDescription('✅ No expired scrims found. All active scrims are still valid.')
                    .setColor('#00ff00');
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            // Show expired scrims details
            const expiredList = expiredScrims.slice(0, 10).map((scrim, index) => {
                const createdDate = new Date(scrim.created_at).toLocaleDateString();
                return `${index + 1}. **${scrim.team_name}** - ${scrim.scrim_date} (Posted: ${createdDate})`;
            }).join('\n');

            embed.setDescription(`Found ${expiredScrims.length} expired scrim(s) that can be cleaned up:\n\n${expiredList}${expiredScrims.length > 10 ? `\n\n*...and ${expiredScrims.length - 10} more*` : ''}`)
                .setColor('#ff6b35');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('cleanup_confirm')
                        .setLabel(`Cleanup ${expiredScrims.length} Scrims`)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️'),
                    new ButtonBuilder()
                        .setCustomId('cleanup_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❌')
                );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        } catch (error) {
            console.error('Error in scrimclear command:', error);
            await interaction.reply({ 
                content: '❌ Failed to check for expired scrims. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async handleCleanupConfirmation(interaction, database, action) {
        if (action === 'cleanup_cancel') {
            const embed = new EmbedBuilder()
                .setColor('#6c757d')
                .setTitle('❌ Cleanup Cancelled')
                .setDescription('No scrims were removed.');

            await interaction.update({ embeds: [embed], components: [] });
            return;
        }

        if (action === 'cleanup_confirm') {
            try {
                const expiredScrims = await database.getExpiredScrims();
                let cleanedCount = 0;
                let errorCount = 0;

                // Get the scrim channel
                const scrimChannelId = await database.getSetting('SCRIM_CHANNEL_ID') || process.env.SCRIM_CHANNEL_ID;
                const scrimChannel = scrimChannelId ? interaction.guild.channels.cache.get(scrimChannelId) : null;

                for (const scrim of expiredScrims) {
                    try {
                        // Delete the message and thread
                        if (scrimChannel) {
                            try {
                                const message = await scrimChannel.messages.fetch(scrim.message_id);
                                if (message) {
                                    await message.delete();
                                }
                            } catch (msgError) {
                                console.log(`Message ${scrim.message_id} already deleted or not found`);
                            }

                            // Delete thread if it exists
                            if (scrim.thread_id) {
                                try {
                                    const thread = await scrimChannel.threads.fetch(scrim.thread_id);
                                    if (thread) {
                                        await thread.delete();
                                    }
                                } catch (threadError) {
                                    console.log(`Thread ${scrim.thread_id} already deleted or not found`);
                                }
                            }
                        }

                        // Update database status
                        await database.updateScrimStatus(scrim.message_id, 'cleaned');
                        cleanedCount++;

                    } catch (scrimError) {
                        console.error(`Error cleaning scrim ${scrim.id}:`, scrimError);
                        errorCount++;
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Cleanup Complete')
                    .setDescription(`Successfully cleaned up ${cleanedCount} expired scrim(s).${errorCount > 0 ? `\n\n⚠️ ${errorCount} scrim(s) had errors during cleanup.` : ''}`)
                    .addFields(
                        { name: '📊 Results', value: `**Cleaned:** ${cleanedCount}\n**Errors:** ${errorCount}`, inline: true }
                    )
                    .setFooter({ text: `Cleanup performed by ${interaction.user.displayName}` })
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });

            } catch (error) {
                console.error('Error during cleanup:', error);
                
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Cleanup Failed')
                    .setDescription('An error occurred during the cleanup process. Please try again or contact support.');

                await interaction.update({ embeds: [embed], components: [] });
            }
        }
    }
};