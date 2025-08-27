const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scrim')
        .setDescription('Create a new scrim request'),
    
    async execute(interaction, database) {
        // Check if user has a saved profile
        const profile = await database.getProfile(interaction.user.id);
        
        if (profile) {
            // Show quick create option with saved profile
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎯 Create Scrim Request')
                .setDescription(`Found your saved profile!\n\n**Team:** ${profile.team_name}\n**Division:** ${profile.division}\n\nWould you like to use your saved profile or create a new one?`);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('use_profile')
                        .setLabel('Use Saved Profile')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⚡'),
                    new ButtonBuilder()
                        .setCustomId('new_scrim')
                        .setLabel('Create New')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📝')
                );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
            // Start fresh scrim creation
            await this.startScrimCreation(interaction, database);
        }
    },

    async startScrimCreation(interaction, database, useProfile = false) {
        const profile = useProfile ? await database.getProfile(interaction.user.id) : null;
        
        const modal = new ModalBuilder()
            .setCustomId('scrim_basic_info')
            .setTitle('Scrim Request - Basic Info');

        const teamNameInput = new TextInputBuilder()
            .setCustomId('team_name')
            .setLabel('Team Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50);

        const divisionInput = new TextInputBuilder()
            .setCustomId('division')
            .setLabel('Division')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(30);

        const dateInput = new TextInputBuilder()
            .setCustomId('scrim_date')
            .setLabel('Date (DD/MM/YYYY)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('29/08/2025');

        const timeInput = new TextInputBuilder()
            .setCustomId('scrim_time')
            .setLabel('Time (HH:MM AM/PM Timezone)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('7:00 PM ACDT');

        if (profile) {
            teamNameInput.setValue(profile.team_name);
            divisionInput.setValue(profile.division);
        }

        const firstRow = new ActionRowBuilder().addComponents(teamNameInput);
        const secondRow = new ActionRowBuilder().addComponents(divisionInput);
        const thirdRow = new ActionRowBuilder().addComponents(dateInput);
        const fourthRow = new ActionRowBuilder().addComponents(timeInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

        await interaction.showModal(modal);
    },

    async handleMapSelection(interaction, database, scrimData) {
        const maps = await database.getAllMaps();
        
        if (maps.length === 0) {
            await interaction.followUp({ content: '❌ No maps available. Please contact an admin to add maps.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🗺️ Select Maps')
            .setDescription('Choose the maps you want to play (you can select multiple):');

        const options = maps.map(map => ({
            label: map.name,
            value: map.name,
            emoji: '🗺️'
        }));

        // Discord select menus can only have 25 options max
        const selectMenus = [];
        for (let i = 0; i < options.length; i += 25) {
            const chunk = options.slice(i, i + 25);
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`map_select_${Math.floor(i / 25)}`)
                .setPlaceholder('Choose maps...')
                .setMinValues(1)
                .setMaxValues(Math.min(chunk.length, 10))
                .addOptions(chunk);
            
            selectMenus.push(new ActionRowBuilder().addComponents(selectMenu));
        }

        // Store scrim data temporarily
        global.tempScrimData = global.tempScrimData || {};
        global.tempScrimData[interaction.user.id] = scrimData;

        await interaction.followUp({ 
            embeds: [embed], 
            components: selectMenus, 
            ephemeral: true 
        });
    },

    async handleServerSelection(interaction, database, scrimData) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🌐 Server Availability')
            .setDescription('Do you have a server available for this scrim?');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('server_yes')
                    .setLabel('Yes, I have a server')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('server_no')
                    .setLabel('No, need a server')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        // Store scrim data temporarily
        global.tempScrimData = global.tempScrimData || {};
        global.tempScrimData[interaction.user.id] = scrimData;

        await interaction.followUp({ 
            embeds: [embed], 
            components: [row], 
            ephemeral: true 
        });
    },

    async createScrimPost(interaction, database, scrimData) {
        try {
            // Create the scrim embed
            const embed = new EmbedBuilder()
                .setColor('#ff6b35')
                .setTitle('📢 Scrim Request')
                .addFields(
                    { name: '🏷️ Team', value: scrimData.teamName, inline: true },
                    { name: '🎯 Division', value: scrimData.division, inline: true },
                    { name: '📅 When', value: `${scrimData.scrimDate}, ${scrimData.scrimTime}`, inline: false },
                    { name: '🗺️ Maps', value: scrimData.maps, inline: true },
                    { name: '🌐 Server', value: scrimData.hasServer ? 'Yes' : 'No', inline: true }
                )
                .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            // Create action buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('show_interest')
                        .setLabel('Show Interest')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🤝'),
                    new ButtonBuilder()
                        .setCustomId('scrim_filled')
                        .setLabel('Mark as Filled')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId('cancel_scrim')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            // Get the scrim channel
            const scrimChannelId = process.env.SCRIM_CHANNEL_ID;
            const scrimChannel = interaction.guild.channels.cache.get(scrimChannelId);
            
            if (!scrimChannel) {
                await interaction.followUp({ content: '❌ Scrim channel not found. Please contact an admin.', ephemeral: true });
                return;
            }

            // Post the scrim
            const message = await scrimChannel.send({ embeds: [embed], components: [row] });
            
            // Create a thread for discussion
            const thread = await message.startThread({
                name: `${scrimData.teamName} - ${scrimData.scrimDate}`,
                autoArchiveDuration: 10080, // 7 days
                reason: 'Scrim discussion thread'
            });

            // Save to database
            await database.createScrim({
                messageId: message.id,
                threadId: thread.id,
                teamName: scrimData.teamName,
                division: scrimData.division,
                scrimDate: scrimData.scrimDate,
                scrimTime: scrimData.scrimTime,
                maps: scrimData.maps,
                hasServer: scrimData.hasServer,
                userId: interaction.user.id
            });

            // Send initial message to thread
            await thread.send(`🎮 **Scrim Discussion Thread**\n\nTeam **${scrimData.teamName}** is looking for a scrim!\n\nShare your Steam profiles and coordinate the match details here. Good luck! 🍀`);

            // Notify users with alerts enabled
            await this.notifyInterestedUsers(interaction, database, scrimData);

            // Clean up temporary data
            if (global.tempScrimData && global.tempScrimData[interaction.user.id]) {
                delete global.tempScrimData[interaction.user.id];
            }

            await interaction.followUp({ 
                content: `✅ **Scrim request posted successfully!**\n\n📍 **Posted in:** ${scrimChannel}\n🧵 **Discussion thread:** ${thread}\n\nOther teams can now show interest and coordinate with you!`, 
                ephemeral: true 
            });

        } catch (error) {
            console.error('Error creating scrim post:', error);
            await interaction.followUp({ content: '❌ Failed to create scrim post. Please try again.', ephemeral: true });
        }
    },

    async notifyInterestedUsers(interaction, database, scrimData) {
        try {
            const usersWithAlerts = await database.getUsersWithAlertsEnabled();
            
            if (usersWithAlerts.length === 0) return;

            const embed = new EmbedBuilder()
                .setColor('#ff6b35')
                .setTitle('🔔 New Scrim Alert')
                .setDescription(`A new scrim request has been posted!`)
                .addFields(
                    { name: '🏷️ Team', value: scrimData.teamName, inline: true },
                    { name: '🎯 Division', value: scrimData.division, inline: true },
                    { name: '📅 When', value: `${scrimData.scrimDate}, ${scrimData.scrimTime}`, inline: false },
                    { name: '🗺️ Maps', value: scrimData.maps, inline: true },
                    { name: '🌐 Server', value: scrimData.hasServer ? 'Yes' : 'No', inline: true }
                )
                .setFooter({ text: 'You can disable these alerts with /alert off' });

            // Send DM to each user (but don't spam - limit to reasonable amount)
            const maxNotifications = 50; // Prevent spam
            const usersToNotify = usersWithAlerts.slice(0, maxNotifications);

            for (const userId of usersToNotify) {
                try {
                    if (userId === interaction.user.id) continue; // Don't notify the creator
                    
                    const user = await interaction.client.users.fetch(userId);
                    await user.send({ embeds: [embed] });
                } catch (error) {
                    // User might have DMs disabled or left the server
                    console.log(`Could not send alert to user ${userId}:`, error.message);
                }
            }
        } catch (error) {
            console.error('Error sending notifications:', error);
        }
    }
};