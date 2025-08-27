const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// This script is designed to run on Railway during deployment
// It will deploy commands automatically when the service starts

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));

// Load all commands
for (const file of commandFiles) {
    const filePath = path.join(foldersPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️  [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Deploy commands function
async function deployCommands() {
    // Check if we have the required environment variables
    if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
        console.log('⚠️  Skipping command deployment - DISCORD_TOKEN or CLIENT_ID not found');
        console.log('   Commands will need to be deployed manually using: node deploy-commands.js');
        return false;
    }

    try {
        console.log(`\n🚀 Auto-deploying ${commands.length} application (/) commands...`);

        const rest = new REST().setToken(process.env.DISCORD_TOKEN);
        
        let data;
        
        if (process.env.GUILD_ID) {
            // Deploy to specific guild (faster)
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`✅ Successfully deployed ${data.length} guild commands for guild ${process.env.GUILD_ID}.`);
        } else {
            // Deploy globally (slower but works in all servers)
            data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully deployed ${data.length} global commands.`);
            console.log('⏰ Note: Global commands may take up to 1 hour to appear in all servers.');
        }

        console.log('\n📋 Deployed Commands:');
        data.forEach(command => {
            console.log(`   • /${command.name} - ${command.description}`);
        });

        console.log('\n🎉 Command deployment completed successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        console.log('   You may need to deploy commands manually using: node deploy-commands.js');
        return false;
    }
}

// Export for use in main bot file
module.exports = { deployCommands };

// If this file is run directly, deploy commands
if (require.main === module) {
    deployCommands().then(success => {
        process.exit(success ? 0 : 1);
    });
}