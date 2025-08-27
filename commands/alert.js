const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('Manage your scrim alert notifications')
        .addSubcommand(subcommand =>
            subcommand
                .setName('on')
                .setDescription('Enable scrim alerts'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('off')
                .setDescription('Disable scrim alerts'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check your current alert status')),

    async execute(interaction, database) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'on':
                    await this.enableAlerts(interaction, database);
                    break;
                case 'off':
                    await this.disableAlerts(interaction, database);
                    break;
                case 'status':
                    await this.checkStatus(interaction, database);
                    break;
            }
        } catch (error) {
            console.error('Error in alert command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while processing the alert command.', 
                ephemeral: true 
            });
        }
    },

    async enableAlerts(interaction, database) {
        try {
            await database.setAlertPreference(interaction.user.id, true);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔔 Alerts Enabled')
                .setDescription('You will now receive DM notifications when new scrim requests are posted!')
                .addFields(
                    { name: '📬 What you\'ll receive', value: 'Direct messages with scrim details whenever a team posts a new scrim request', inline: false },
                    { name: '⚙️ Manage alerts', value: 'Use `/alert off` to disable notifications anytime', inline: false }
                )
                .setFooter({ text: 'Make sure your DMs are open to receive notifications' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('Error enabling alerts:', error);
            await interaction.reply({ 
                content: '❌ Failed to enable alerts. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async disableAlerts(interaction, database) {
        try {
            await database.setAlertPreference(interaction.user.id, false);
            
            const embed = new EmbedBuilder()
                .setColor('#ff6b35')
                .setTitle('🔕 Alerts Disabled')
                .setDescription('You will no longer receive DM notifications for new scrim requests.')
                .addFields(
                    { name: '📭 No more notifications', value: 'You won\'t receive DMs when new scrims are posted', inline: false },
                    { name: '⚙️ Re-enable anytime', value: 'Use `/alert on` to turn notifications back on', inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('Error disabling alerts:', error);
            await interaction.reply({ 
                content: '❌ Failed to disable alerts. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async checkStatus(interaction, database) {
        try {
            const alertPreference = await database.getAlertPreference(interaction.user.id);
            const isEnabled = alertPreference ? alertPreference.alerts_enabled : true; // Default to enabled
            
            const embed = new EmbedBuilder()
                .setColor(isEnabled ? '#00ff00' : '#6c757d')
                .setTitle('📊 Alert Status')
                .setDescription(`Your scrim alerts are currently **${isEnabled ? 'ENABLED' : 'DISABLED'}**`)
                .addFields(
                    { 
                        name: '🔔 Current Setting', 
                        value: isEnabled ? 'You receive DM notifications for new scrims' : 'You do not receive DM notifications', 
                        inline: false 
                    },
                    { 
                        name: '⚙️ Change Settings', 
                        value: isEnabled ? 'Use `/alert off` to disable' : 'Use `/alert on` to enable', 
                        inline: false 
                    }
                )
                .setFooter({ text: alertPreference ? `Last updated: ${new Date(alertPreference.created_at).toLocaleDateString()}` : 'Default setting' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('Error checking alert status:', error);
            await interaction.reply({ 
                content: '❌ Failed to check alert status. Please try again.', 
                ephemeral: true 
            });
        }
    }
};