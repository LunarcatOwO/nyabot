const { EmbedBuilder, WebhookClient } = require('discord.js');

/**
 * Log a DM to the home server
 * @param {Message} message - The DM message to log
 * @param {Client} client - The Discord client
 */
async function logDM(message, client) {
    try {
        if (!process.env.HOME) {
            console.warn('HOME environment variable not set - DM logging disabled');
            return;
        }

        const homeGuild = await client.guilds.fetch(process.env.HOME);
        if (!homeGuild) {
            console.error('Could not find home guild with ID:', process.env.HOME);
            return;
        }

        // Try to find a channel named 'dm-logs' or use the first text channel
        let logChannel = homeGuild.channels.cache.find(channel => 
            channel.name === 'dm-logs' && channel.isTextBased()
        );
        
        if (!logChannel) {
            logChannel = homeGuild.channels.cache.find(channel => 
                channel.isTextBased()
            );
        }

        if (!logChannel) {
            console.error('No suitable log channel found in home guild');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('📨 DM Received')
            .setColor(0x00AE86)
            .setAuthor({
                name: `${message.author.tag} (${message.author.id})`,
                iconURL: message.author.displayAvatarURL()
            })
            .setDescription(message.content || '*No text content*')
            .setTimestamp()
            .setFooter({ text: 'DM Logger' });

        // Add attachments info if any
        if (message.attachments.size > 0) {
            const attachmentList = message.attachments.map(att => 
                `[${att.name}](${att.url})`
            ).join('\n');
            embed.addFields({ name: 'Attachments', value: attachmentList });
        }

        // Add embeds info if any
        if (message.embeds.length > 0) {
            embed.addFields({ 
                name: 'Embeds', 
                value: `${message.embeds.length} embed(s) included` 
            });
        }

        await logChannel.send({ embeds: [embed] });
        console.log(`✅ Logged DM from ${message.author.tag}`);
    } catch (error) {
        console.error('❌ Failed to log DM:', error);
    }
}

/**
 * Log a DM being sent by the bot
 * @param {User} user - The user the DM is being sent to
 * @param {string|Object} content - The content being sent
 * @param {Client} client - The Discord client
 */
async function logOutgoingDM(user, content, client) {
    try {
        if (!process.env.HOME) {
            console.warn('HOME environment variable not set - DM logging disabled');
            return;
        }

        const homeGuild = await client.guilds.fetch(process.env.HOME);
        if (!homeGuild) {
            console.error('Could not find home guild with ID:', process.env.HOME);
            return;
        }

        // Try to find a channel named 'dm-logs' or use the first text channel
        let logChannel = homeGuild.channels.cache.find(channel => 
            channel.name === 'dm-logs' && channel.isTextBased()
        );
        
        if (!logChannel) {
            logChannel = homeGuild.channels.cache.find(channel => 
                channel.isTextBased()
            );
        }

        if (!logChannel) {
            console.error('No suitable log channel found in home guild');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('📤 DM Sent')
            .setColor(0xFF6B6B)
            .setAuthor({
                name: `${user.tag} (${user.id})`,
                iconURL: user.displayAvatarURL()
            })
            .setTimestamp()
            .setFooter({ text: 'DM Logger' });

        // Handle different content types
        if (typeof content === 'string') {
            embed.setDescription(content);
        } else if (content.content) {
            embed.setDescription(content.content || '*No text content*');
            
            if (content.embeds && content.embeds.length > 0) {
                embed.addFields({ 
                    name: 'Embeds', 
                    value: `${content.embeds.length} embed(s) sent` 
                });
            }
        }

        await logChannel.send({ embeds: [embed] });
        console.log(`✅ Logged outgoing DM to ${user.tag}`);
    } catch (error) {
        console.error('❌ Failed to log outgoing DM:', error);
    }
}

module.exports = {
    logDM,
    logOutgoingDM
};
