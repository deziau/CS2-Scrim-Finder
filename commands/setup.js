const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure bot settings (Admin only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the scrim channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel where scrims will be posted')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View current bot configuration')),

    async execute(interaction, database) {
        // Check if user has admin permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ 
                content: '❌ You need Administrator permissions to use this command.', 
                ephemeral: true 
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'channel':
                    await this.setScrimChannel(interaction, database);
                    break;
                case 'info':
                    await this.showInfo(interaction, database);
                    break;
            }
        } catch (error) {
            console.error('Error in setup command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while processing the setup command.', 
                ephemeral: true 
            });
        }
    },

    async setScrimChannel(interaction, database) {
        const channel = interaction.options.getChannel('channel');
        
        // Validate channel type
        if (channel.type !== ChannelType.GuildText) {
            await interaction.reply({ 
                content: '❌ Please select a text channel.', 
                ephemeral: true 
            });
            return;
        }

        // Check if bot has permissions in the channel
        const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
        const permissions = channel.permissionsFor(botMember);
        
        const requiredPermissions = [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.CreatePublicThreads,
            PermissionFlagsBits.SendMessagesInThreads,
            PermissionFlagsBits.ManageMessages
        ];

        const missingPermissions = requiredPermissions.filter(perm => !permissions.has(perm));
        
        if (missingPermissions.length > 0) {
            const missingPermsText = missingPermissions.map(perm => {
                switch(perm) {
                    case PermissionFlagsBits.SendMessages: return 'Send Messages';
                    case PermissionFlagsBits.EmbedLinks: return 'Embed Links';
                    case PermissionFlagsBits.CreatePublicThreads: return 'Create Public Threads';
                    case PermissionFlagsBits.SendMessagesInThreads: return 'Send Messages in Threads';
                    case PermissionFlagsBits.ManageMessages: return 'Manage Messages';
                    default: return perm.toString();
                }
            }).join(', ');

            await interaction.reply({ 
                content: `❌ Bot is missing required permissions in ${channel}:\n\`${missingPermsText}\`\n\nPlease grant these permissions and try again.`, 
                ephemeral: true 
            });
            return;
        }

        try {
            // Save to database
            await database.setSetting('SCRIM_CHANNEL_ID', channel.id);
            
            // Update the global variable for immediate use
            process.env.SCRIM_CHANNEL_ID = channel.id;

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Scrim Channel Set Successfully')
                .setDescription(`Scrim requests will now be posted in ${channel}`)
                .addFields(
                    { name: '📍 Channel', value: `${channel} (${channel.id})`, inline: false },
                    { name: '✅ Permissions', value: 'All required permissions verified', inline: false },
                    { name: '🎮 Ready to Use', value: 'Users can now create scrims with `/scrim`', inline: false }
                )
                .setFooter({ text: `Configured by ${interaction.user.displayName}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Send a test message to the channel
            try {
                const testEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🎮 CS2 Scrim Bot Configured')
                    .setDescription('This channel has been set as the scrim channel!\n\nTeams can now use `/scrim` to post scrim requests here.')
                    .addFields(
                        { name: '🚀 Getting Started', value: 'Use `/scrim` to create your first scrim request', inline: false },
                        { name: '📋 View Scrims', value: 'Use `/scrimlist` to see all active scrims', inline: false },
                        { name: '🔔 Notifications', value: 'Use `/alert on` to get notified of new scrims', inline: false }
                    );

                await channel.send({ embeds: [testEmbed] });
            } catch (testError) {
                console.log('Could not send test message to channel:', testError.message);
            }

        } catch (error) {
            console.error('Error setting scrim channel:', error);
            await interaction.reply({ 
                content: '❌ Failed to set scrim channel. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async showInfo(interaction, database) {
        try {
            const scrimChannelId = await database.getSetting('SCRIM_CHANNEL_ID') || process.env.SCRIM_CHANNEL_ID;
            const scrimChannel = scrimChannelId ? interaction.guild.channels.cache.get(scrimChannelId) : null;
            
            const activeScrims = await database.getAllActiveScrims();
            const totalMaps = await database.getAllMaps();
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🔧 Bot Configuration')
                .setDescription('Current bot settings and status')
                .addFields(
                    { 
                        name: '📍 Scrim Channel', 
                        value: scrimChannel ? `${scrimChannel} (${scrimChannel.id})` : '❌ Not configured', 
                        inline: false 
                    },
                    { 
                        name: '👥 Admin Access', 
                        value: 'Anyone with Administrator permissions', 
                        inline: true 
                    },
                    { 
                        name: '📊 Statistics', 
                        value: `**Active Scrims:** ${activeScrims.length}\n**Available Maps:** ${totalMaps.length}`, 
                        inline: true 
                    }
                )
                .addFields(
                    { 
                        name: '🎮 Available Commands', 
                        value: '`/scrim` - Create scrim request\n`/scrimlist` - View active scrims\n`/profile` - Manage team profile\n`/alert` - Notification settings', 
                        inline: false 
                    },
                    { 
                        name: '⚙️ Admin Commands', 
                        value: '`/setup channel` - Set scrim channel\n`/editmaps` - Manage maps\n`/scrimclear` - Manual cleanup', 
                        inline: false 
                    }
                )
                .setFooter({ text: `Bot ID: ${interaction.client.user.id}` })
                .setTimestamp();

            if (!scrimChannel) {
                embed.addFields({
                    name: '⚠️ Setup Required',
                    value: 'Use `/setup channel #your-channel` to configure the scrim channel',
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Error showing bot info:', error);
            await interaction.reply({ 
                content: '❌ Failed to retrieve bot information.', 
                ephemeral: true 
            });
        }
    }
};