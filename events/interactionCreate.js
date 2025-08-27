const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, database) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction, database);
            } catch (error) {
                console.error('Error executing command:', error);
                
                const errorMessage = { 
                    content: '❌ There was an error while executing this command!', 
                    ephemeral: true 
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
        
        // Handle button interactions
        else if (interaction.isButton()) {
            await this.handleButtonInteraction(interaction, database);
        }
        
        // Handle select menu interactions
        else if (interaction.isStringSelectMenu()) {
            await this.handleSelectMenuInteraction(interaction, database);
        }
        
        // Handle modal submissions
        else if (interaction.isModalSubmit()) {
            await this.handleModalSubmission(interaction, database);
        }
    },

    async handleButtonInteraction(interaction, database) {
        const customId = interaction.customId;

        try {
            // Profile-related buttons
            if (customId === 'create_profile' || customId === 'edit_profile') {
                const profileCommand = interaction.client.commands.get('profile');
                await profileCommand.editProfile(interaction, database);
                return;
            }

            if (customId === 'quick_scrim' || customId === 'quick_scrim_from_profile') {
                const scrimCommand = interaction.client.commands.get('scrim');
                await scrimCommand.startScrimCreation(interaction, database, true);
                return;
            }

            // Scrim creation buttons
            if (customId === 'use_profile') {
                const scrimCommand = interaction.client.commands.get('scrim');
                await scrimCommand.startScrimCreation(interaction, database, true);
                return;
            }

            if (customId === 'new_scrim') {
                const scrimCommand = interaction.client.commands.get('scrim');
                await scrimCommand.startScrimCreation(interaction, database, false);
                return;
            }

            // Server selection buttons
            if (customId === 'server_yes' || customId === 'server_no') {
                await this.handleServerSelection(interaction, database, customId === 'server_yes');
                return;
            }

            // Scrim post interaction buttons
            if (customId === 'show_interest') {
                await this.handleShowInterest(interaction, database);
                return;
            }

            if (customId === 'scrim_filled') {
                await this.handleScrimFilled(interaction, database);
                return;
            }

            if (customId === 'cancel_scrim') {
                await this.handleCancelScrim(interaction, database);
                return;
            }

            // Scrim list pagination
            if (customId.startsWith('scrimlist_')) {
                const action = customId.replace('scrimlist_', '');
                const scrimListCommand = interaction.client.commands.get('scrimlist');
                await scrimListCommand.handlePagination(interaction, database, action);
                return;
            }

            // Cleanup confirmation
            if (customId === 'cleanup_confirm' || customId === 'cleanup_cancel') {
                const scrimClearCommand = interaction.client.commands.get('scrimclear');
                await scrimClearCommand.handleCleanupConfirmation(interaction, database, customId);
                return;
            }

        } catch (error) {
            console.error('Error handling button interaction:', error);
            
            const errorMessage = { 
                content: '❌ An error occurred while processing your request.', 
                ephemeral: true 
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },

    async handleSelectMenuInteraction(interaction, database) {
        try {
            if (interaction.customId.startsWith('map_select_')) {
                await this.handleMapSelection(interaction, database);
            }
        } catch (error) {
            console.error('Error handling select menu interaction:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while processing your selection.', 
                ephemeral: true 
            });
        }
    },

    async handleModalSubmission(interaction, database) {
        try {
            if (interaction.customId === 'scrim_basic_info') {
                await this.handleScrimBasicInfo(interaction, database);
            } else if (interaction.customId === 'edit_profile_modal') {
                const profileCommand = interaction.client.commands.get('profile');
                await profileCommand.handleProfileModal(interaction, database);
            }
        } catch (error) {
            console.error('Error handling modal submission:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while processing your submission.', 
                ephemeral: true 
            });
        }
    },

    async handleScrimBasicInfo(interaction, database) {
        const teamName = interaction.fields.getTextInputValue('team_name').trim();
        const division = interaction.fields.getTextInputValue('division').trim();
        const scrimDate = interaction.fields.getTextInputValue('scrim_date').trim();
        const scrimTime = interaction.fields.getTextInputValue('scrim_time').trim();

        // Basic validation
        if (!teamName || !division || !scrimDate || !scrimTime) {
            await interaction.reply({ 
                content: '❌ All fields are required. Please try again.', 
                ephemeral: true 
            });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const scrimData = {
            teamName,
            division,
            scrimDate,
            scrimTime
        };

        const scrimCommand = interaction.client.commands.get('scrim');
        await scrimCommand.handleMapSelection(interaction, database, scrimData);
    },

    async handleMapSelection(interaction, database) {
        const selectedMaps = interaction.values;
        const userId = interaction.user.id;
        
        if (!global.tempScrimData || !global.tempScrimData[userId]) {
            await interaction.reply({ 
                content: '❌ Session expired. Please start over with `/scrim`.', 
                ephemeral: true 
            });
            return;
        }

        const scrimData = global.tempScrimData[userId];
        scrimData.maps = selectedMaps.join(', ');

        await interaction.deferUpdate();

        const scrimCommand = interaction.client.commands.get('scrim');
        await scrimCommand.handleServerSelection(interaction, database, scrimData);
    },

    async handleServerSelection(interaction, database, hasServer) {
        const userId = interaction.user.id;
        
        if (!global.tempScrimData || !global.tempScrimData[userId]) {
            await interaction.reply({ 
                content: '❌ Session expired. Please start over with `/scrim`.', 
                ephemeral: true 
            });
            return;
        }

        const scrimData = global.tempScrimData[userId];
        scrimData.hasServer = hasServer;

        await interaction.deferUpdate();

        const scrimCommand = interaction.client.commands.get('scrim');
        await scrimCommand.createScrimPost(interaction, database, scrimData);
    },

    async handleShowInterest(interaction, database) {
        try {
            const scrim = await database.getActiveScrim(interaction.message.id);
            
            if (!scrim) {
                await interaction.reply({ 
                    content: '❌ This scrim is no longer active.', 
                    ephemeral: true 
                });
                return;
            }

            // Don't allow the scrim creator to show interest in their own scrim
            if (scrim.user_id === interaction.user.id) {
                await interaction.reply({ 
                    content: '❌ You cannot show interest in your own scrim request.', 
                    ephemeral: true 
                });
                return;
            }

            // Send DM to both users
            try {
                const scrimCreator = await interaction.client.users.fetch(scrim.user_id);
                const interestedUser = interaction.user;

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('🤝 Someone is interested in your scrim!')
                    .setDescription(`**${interestedUser.displayName}** has shown interest in your scrim request.`)
                    .addFields(
                        { name: '🏷️ Your Team', value: scrim.team_name, inline: true },
                        { name: '📅 Scrim Date', value: `${scrim.scrim_date}, ${scrim.scrim_time}`, inline: true },
                        { name: '👤 Interested User', value: `${interestedUser.displayName} (${interestedUser.tag})`, inline: false },
                        { name: '💬 Next Steps', value: 'Reach out to coordinate the match details!', inline: false }
                    )
                    .setThumbnail(interestedUser.displayAvatarURL())
                    .setTimestamp();

                await scrimCreator.send({ embeds: [embed] });

                // Send confirmation to interested user
                const confirmEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('✅ Interest Registered')
                    .setDescription(`You've shown interest in **${scrim.team_name}**'s scrim!`)
                    .addFields(
                        { name: '📅 Scrim Details', value: `${scrim.scrim_date}, ${scrim.scrim_time}`, inline: true },
                        { name: '🗺️ Maps', value: scrim.maps, inline: true },
                        { name: '💬 What\'s Next?', value: 'The team creator has been notified and should contact you soon!', inline: false }
                    );

                await interestedUser.send({ embeds: [confirmEmbed] });

                await interaction.reply({ 
                    content: '✅ Interest registered! Both teams have been notified via DM.', 
                    ephemeral: true 
                });

            } catch (dmError) {
                console.error('Error sending DMs:', dmError);
                await interaction.reply({ 
                    content: '✅ Interest registered, but couldn\'t send DM notifications. Make sure your DMs are open!', 
                    ephemeral: true 
                });
            }

        } catch (error) {
            console.error('Error handling show interest:', error);
            await interaction.reply({ 
                content: '❌ Failed to register interest. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async handleScrimFilled(interaction, database) {
        try {
            const scrim = await database.getActiveScrim(interaction.message.id);
            
            if (!scrim) {
                await interaction.reply({ 
                    content: '❌ This scrim is no longer active.', 
                    ephemeral: true 
                });
                return;
            }

            // Only allow the scrim creator or admins to mark as filled
            const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
            if (scrim.user_id !== interaction.user.id && !adminIds.includes(interaction.user.id)) {
                await interaction.reply({ 
                    content: '❌ Only the scrim creator or admins can mark this as filled.', 
                    ephemeral: true 
                });
                return;
            }

            // Update the embed to show it's filled
            const originalEmbed = interaction.message.embeds[0];
            const filledEmbed = EmbedBuilder.from(originalEmbed)
                .setColor('#00ff00')
                .setTitle('✅ Scrim Filled')
                .setFooter({ text: `${originalEmbed.footer.text} • Marked as filled by ${interaction.user.displayName}` });

            // Remove the buttons
            await interaction.update({ embeds: [filledEmbed], components: [] });

            // Update database
            await database.updateScrimStatus(interaction.message.id, 'filled');

            // Notify in the thread
            if (scrim.thread_id) {
                try {
                    const thread = await interaction.guild.channels.fetch(scrim.thread_id);
                    if (thread) {
                        await thread.send('✅ **This scrim has been marked as filled!** Thanks to everyone who showed interest.');
                    }
                } catch (threadError) {
                    console.log('Could not send message to thread:', threadError.message);
                }
            }

        } catch (error) {
            console.error('Error handling scrim filled:', error);
            await interaction.reply({ 
                content: '❌ Failed to mark scrim as filled. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async handleCancelScrim(interaction, database) {
        try {
            const scrim = await database.getActiveScrim(interaction.message.id);
            
            if (!scrim) {
                await interaction.reply({ 
                    content: '❌ This scrim is no longer active.', 
                    ephemeral: true 
                });
                return;
            }

            // Only allow the scrim creator or admins to cancel
            const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];
            if (scrim.user_id !== interaction.user.id && !adminIds.includes(interaction.user.id)) {
                await interaction.reply({ 
                    content: '❌ Only the scrim creator or admins can cancel this scrim.', 
                    ephemeral: true 
                });
                return;
            }

            // Update the embed to show it's cancelled
            const originalEmbed = interaction.message.embeds[0];
            const cancelledEmbed = EmbedBuilder.from(originalEmbed)
                .setColor('#ff0000')
                .setTitle('❌ Scrim Cancelled')
                .setFooter({ text: `${originalEmbed.footer.text} • Cancelled by ${interaction.user.displayName}` });

            // Remove the buttons
            await interaction.update({ embeds: [cancelledEmbed], components: [] });

            // Update database
            await database.updateScrimStatus(interaction.message.id, 'cancelled');

            // Notify in the thread
            if (scrim.thread_id) {
                try {
                    const thread = await interaction.guild.channels.fetch(scrim.thread_id);
                    if (thread) {
                        await thread.send('❌ **This scrim has been cancelled.** The thread will be archived shortly.');
                        
                        // Archive the thread after a short delay
                        setTimeout(async () => {
                            try {
                                await thread.setArchived(true);
                            } catch (archiveError) {
                                console.log('Could not archive thread:', archiveError.message);
                            }
                        }, 5000);
                    }
                } catch (threadError) {
                    console.log('Could not send message to thread:', threadError.message);
                }
            }

        } catch (error) {
            console.error('Error handling cancel scrim:', error);
            await interaction.reply({ 
                content: '❌ Failed to cancel scrim. Please try again.', 
                ephemeral: true 
            });
        }
    }
};