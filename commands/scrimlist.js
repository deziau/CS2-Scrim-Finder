const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scrimlist')
        .setDescription('View all active scrim requests'),

    async execute(interaction, database) {
        try {
            const activeScrims = await database.getAllActiveScrims();
            
            if (activeScrims.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ffa500')
                    .setTitle('📋 Active Scrims')
                    .setDescription('No active scrim requests found.\n\nUse `/scrim` to create a new scrim request!')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            // Create paginated embeds if there are many scrims
            const scrimsPerPage = 5;
            const totalPages = Math.ceil(activeScrims.length / scrimsPerPage);
            let currentPage = 0;

            const generateEmbed = (page) => {
                const start = page * scrimsPerPage;
                const end = start + scrimsPerPage;
                const pageItems = activeScrims.slice(start, end);

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('📋 Active Scrim Requests')
                    .setDescription(`Showing ${pageItems.length} of ${activeScrims.length} active scrims`)
                    .setFooter({ text: `Page ${page + 1} of ${totalPages}` })
                    .setTimestamp();

                pageItems.forEach((scrim, index) => {
                    const scrimNumber = start + index + 1;
                    const createdDate = new Date(scrim.created_at).toLocaleDateString();
                    
                    embed.addFields({
                        name: `${scrimNumber}. ${scrim.team_name}`,
                        value: `**Division:** ${scrim.division}\n**When:** ${scrim.scrim_date}, ${scrim.scrim_time}\n**Maps:** ${scrim.maps}\n**Server:** ${scrim.has_server ? 'Yes' : 'No'}\n**Posted:** ${createdDate}`,
                        inline: false
                    });
                });

                return embed;
            };

            const embed = generateEmbed(currentPage);
            
            // Add navigation buttons if there are multiple pages
            if (totalPages > 1) {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('scrimlist_prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⬅️')
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('scrimlist_next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('➡️')
                            .setDisabled(currentPage === totalPages - 1),
                        new ButtonBuilder()
                            .setCustomId('scrimlist_refresh')
                            .setLabel('Refresh')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🔄')
                    );

                // Store pagination data temporarily
                global.scrimListPagination = global.scrimListPagination || {};
                global.scrimListPagination[interaction.user.id] = {
                    currentPage,
                    totalPages,
                    activeScrims
                };

                await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Error in scrimlist command:', error);
            await interaction.reply({ 
                content: '❌ Failed to retrieve scrim list. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async handlePagination(interaction, database, action) {
        const userId = interaction.user.id;
        const paginationData = global.scrimListPagination?.[userId];
        
        if (!paginationData) {
            await interaction.reply({ 
                content: '❌ Pagination data not found. Please run `/scrimlist` again.', 
                ephemeral: true 
            });
            return;
        }

        let { currentPage, totalPages } = paginationData;

        switch (action) {
            case 'prev':
                currentPage = Math.max(0, currentPage - 1);
                break;
            case 'next':
                currentPage = Math.min(totalPages - 1, currentPage + 1);
                break;
            case 'refresh':
                // Refresh the data
                try {
                    const activeScrims = await database.getAllActiveScrims();
                    paginationData.activeScrims = activeScrims;
                    paginationData.totalPages = Math.ceil(activeScrims.length / 5);
                    
                    if (currentPage >= paginationData.totalPages) {
                        currentPage = Math.max(0, paginationData.totalPages - 1);
                    }
                } catch (error) {
                    console.error('Error refreshing scrim list:', error);
                    await interaction.reply({ 
                        content: '❌ Failed to refresh scrim list.', 
                        ephemeral: true 
                    });
                    return;
                }
                break;
        }

        // Update pagination data
        paginationData.currentPage = currentPage;
        global.scrimListPagination[userId] = paginationData;

        // Generate new embed
        const scrimsPerPage = 5;
        const start = currentPage * scrimsPerPage;
        const end = start + scrimsPerPage;
        const pageItems = paginationData.activeScrims.slice(start, end);

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📋 Active Scrim Requests')
            .setDescription(`Showing ${pageItems.length} of ${paginationData.activeScrims.length} active scrims`)
            .setFooter({ text: `Page ${currentPage + 1} of ${paginationData.totalPages}` })
            .setTimestamp();

        pageItems.forEach((scrim, index) => {
            const scrimNumber = start + index + 1;
            const createdDate = new Date(scrim.created_at).toLocaleDateString();
            
            embed.addFields({
                name: `${scrimNumber}. ${scrim.team_name}`,
                value: `**Division:** ${scrim.division}\n**When:** ${scrim.scrim_date}, ${scrim.scrim_time}\n**Maps:** ${scrim.maps}\n**Server:** ${scrim.has_server ? 'Yes' : 'No'}\n**Posted:** ${createdDate}`,
                inline: false
            });
        });

        // Update buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('scrimlist_prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⬅️')
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('scrimlist_next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('➡️')
                    .setDisabled(currentPage === paginationData.totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('scrimlist_refresh')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄')
            );

        await interaction.update({ embeds: [embed], components: [row] });
    }
};