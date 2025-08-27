const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editmaps')
        .setDescription('Manage the available maps for scrims (Admin only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new map')
                .addStringOption(option =>
                    option.setName('mapname')
                        .setDescription('Name of the map to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a map')
                .addStringOption(option =>
                    option.setName('mapname')
                        .setDescription('Name of the map to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all available maps')),

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
                case 'add':
                    await this.addMap(interaction, database);
                    break;
                case 'remove':
                    await this.removeMap(interaction, database);
                    break;
                case 'list':
                    await this.listMaps(interaction, database);
                    break;
            }
        } catch (error) {
            console.error('Error in editmaps command:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while processing the command.', 
                ephemeral: true 
            });
        }
    },

    async addMap(interaction, database) {
        const mapName = interaction.options.getString('mapname').trim();
        
        // Validate map name
        if (mapName.length < 2 || mapName.length > 30) {
            await interaction.reply({ 
                content: '❌ Map name must be between 2 and 30 characters.', 
                ephemeral: true 
            });
            return;
        }

        // Check if map already exists
        const existingMaps = await database.getAllMaps();
        const mapExists = existingMaps.some(map => 
            map.name.toLowerCase() === mapName.toLowerCase()
        );

        if (mapExists) {
            await interaction.reply({ 
                content: `❌ Map "${mapName}" already exists in the list.`, 
                ephemeral: true 
            });
            return;
        }

        try {
            await database.addMap(mapName);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Map Added Successfully')
                .setDescription(`**${mapName}** has been added to the available maps list.`)
                .setFooter({ text: `Added by ${interaction.user.displayName}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error adding map:', error);
            await interaction.reply({ 
                content: '❌ Failed to add the map. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async removeMap(interaction, database) {
        const mapName = interaction.options.getString('mapname').trim();
        
        // Check if map exists
        const existingMaps = await database.getAllMaps();
        const mapToRemove = existingMaps.find(map => 
            map.name.toLowerCase() === mapName.toLowerCase()
        );

        if (!mapToRemove) {
            await interaction.reply({ 
                content: `❌ Map "${mapName}" not found in the list.`, 
                ephemeral: true 
            });
            return;
        }

        try {
            const changes = await database.removeMap(mapToRemove.name);
            
            if (changes > 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🗑️ Map Removed Successfully')
                    .setDescription(`**${mapToRemove.name}** has been removed from the available maps list.`)
                    .setFooter({ text: `Removed by ${interaction.user.displayName}` })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ 
                    content: '❌ Failed to remove the map. Please try again.', 
                    ephemeral: true 
                });
            }
            
        } catch (error) {
            console.error('Error removing map:', error);
            await interaction.reply({ 
                content: '❌ Failed to remove the map. Please try again.', 
                ephemeral: true 
            });
        }
    },

    async listMaps(interaction, database) {
        try {
            const maps = await database.getAllMaps();
            
            if (maps.length === 0) {
                await interaction.reply({ 
                    content: '📋 No maps are currently available. Use `/editmaps add` to add some maps.', 
                    ephemeral: true 
                });
                return;
            }

            const mapList = maps.map((map, index) => `${index + 1}. **${map.name}**`).join('\n');
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🗺️ Available Maps')
                .setDescription(mapList)
                .addFields(
                    { name: 'Total Maps', value: maps.length.toString(), inline: true },
                    { name: 'Commands', value: '`/editmaps add <name>` - Add map\n`/editmaps remove <name>` - Remove map', inline: false }
                )
                .setFooter({ text: 'Admin commands only' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            
        } catch (error) {
            console.error('Error listing maps:', error);
            await interaction.reply({ 
                content: '❌ Failed to retrieve maps list. Please try again.', 
                ephemeral: true 
            });
        }
    }
};