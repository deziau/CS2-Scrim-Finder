const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Manage your team profile for quick scrim creation')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current profile'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit your team profile')),

    async execute(interaction, database) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'view':
                    await this.viewProfile(interaction, database);
                    break;
                case 'edit':
                    await this.editProfile(interaction, database);
                    break;
            }
        } catch (error) {
            console.error('Error in profile command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while processing the profile command.', 
                ephemeral: true 
            });
        }
    },

    async viewProfile(interaction, database) {
        try {
            const profile = await database.getProfile(interaction.user.id);
            
            if (!profile) {
                const embed = new EmbedBuilder()
                    .setColor('#ffa500')
                    .setTitle('👤 No Profile Found')
                    .setDescription('You don\'t have a saved profile yet. Create one to speed up scrim creation!')
                    .addFields(
                        { name: '🚀 Benefits of a Profile', value: 'Save your team name and division for quick scrim posting', inline: false },
                        { name: '📝 Create Profile', value: 'Use `/profile edit` to set up your profile', inline: false }
                    );

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('create_profile')
                            .setLabel('Create Profile')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('📝')
                    );

                await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('👤 Your Team Profile')
                .setDescription('Here\'s your saved team information:')
                .addFields(
                    { name: '🏷️ Team Name', value: profile.team_name, inline: true },
                    { name: '🎯 Division', value: profile.division, inline: true },
                    { name: '📅 Created', value: new Date(profile.created_at).toLocaleDateString(), inline: true },
                    { name: '🔄 Last Updated', value: new Date(profile.updated_at).toLocaleDateString(), inline: true }
                )
                .setFooter({ text: 'Use /profile edit to update your information' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('edit_profile')
                        .setLabel('Edit Profile')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('✏️'),
                    new ButtonBuilder()
                        .setCustomId('quick_scrim')
                        .setLabel('Quick Scrim')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⚡')
                );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            
        } catch (error) {
            console.error('Error viewing profile:', error);
            await interaction.reply({ 
                content: '❌ Failed to retrieve your profile. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async editProfile(interaction, database) {
        try {
            const profile = await database.getProfile(interaction.user.id);
            
            const modal = new ModalBuilder()
                .setCustomId('edit_profile_modal')
                .setTitle('Edit Team Profile');

            const teamNameInput = new TextInputBuilder()
                .setCustomId('profile_team_name')
                .setLabel('Team Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50)
                .setPlaceholder('Enter your team name');

            const divisionInput = new TextInputBuilder()
                .setCustomId('profile_division')
                .setLabel('Division')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(30)
                .setPlaceholder('e.g., Premier, Main, Advanced, etc.');

            // Pre-fill with existing data if available
            if (profile) {
                teamNameInput.setValue(profile.team_name);
                divisionInput.setValue(profile.division);
            }

            const firstRow = new ActionRowBuilder().addComponents(teamNameInput);
            const secondRow = new ActionRowBuilder().addComponents(divisionInput);

            modal.addComponents(firstRow, secondRow);

            await interaction.showModal(modal);
            
        } catch (error) {
            console.error('Error showing profile edit modal:', error);
            await interaction.reply({ 
                content: '❌ Failed to open profile editor. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async handleProfileModal(interaction, database) {
        try {
            const teamName = interaction.fields.getTextInputValue('profile_team_name').trim();
            const division = interaction.fields.getTextInputValue('profile_division').trim();

            // Validate inputs
            if (teamName.length < 2 || teamName.length > 50) {
                await interaction.reply({ 
                    content: '❌ Team name must be between 2 and 50 characters.', 
                    ephemeral: true 
                });
                return;
            }

            if (division.length < 2 || division.length > 30) {
                await interaction.reply({ 
                    content: '❌ Division must be between 2 and 30 characters.', 
                    ephemeral: true 
                });
                return;
            }

            // Save profile
            await database.updateProfile(interaction.user.id, teamName, division);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Profile Updated Successfully')
                .setDescription('Your team profile has been saved!')
                .addFields(
                    { name: '🏷️ Team Name', value: teamName, inline: true },
                    { name: '🎯 Division', value: division, inline: true }
                )
                .addFields(
                    { name: '🚀 Quick Scrim Creation', value: 'You can now use your saved profile for faster scrim posting with `/scrim`', inline: false }
                )
                .setFooter({ text: 'Profile saved successfully' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('quick_scrim_from_profile')
                        .setLabel('Create Scrim Now')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎮')
                );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            
        } catch (error) {
            console.error('Error saving profile:', error);
            await interaction.reply({ 
                content: '❌ Failed to save your profile. Please try again.', 
                ephemeral: true 
            });
        }
    }
};