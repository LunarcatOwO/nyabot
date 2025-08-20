const { EmbedBuilder } = require('discord.js');
const { getBotConfig } = require('../db');

/**
 * Send a moderation log to the configured channel
 * @param {Client} client - The Discord client
 * @param {string} guildId - The guild ID
 * @param {Object} logData - The log data
 * @param {string} logData.action - The action type (warn, ban, unban, timeout, etc.)
 * @param {User} logData.target - The target user
 * @param {User} logData.moderator - The moderator who performed the action (null for Discord native actions)
 * @param {string} logData.reason - The reason for the action
 * @param {Object} logData.extra - Additional data specific to the action
 */
async function sendModLog(client, guildId, logData) {
    try {
        // Get the configured modlog channel for this guild
        const modlogChannelId = await getBotConfig(`modlog_channel_${guildId}`);
        
        if (!modlogChannelId) {
            // Modlog not configured for this guild
            return;
        }
        
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.warn(`Guild ${guildId} not found for modlog`);
            return;
        }
        
        const modlogChannel = guild.channels.cache.get(modlogChannelId);
        if (!modlogChannel) {
            console.warn(`Modlog channel ${modlogChannelId} not found in guild ${guildId}`);
            return;
        }
        
        // Build the embed based on action type
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ text: 'Moderation Log' });
        
        const { action, target, moderator, reason, extra = {} } = logData;
        
        // Set embed properties based on action type
        switch (action) {
            case 'warn':
                embed.setTitle('⚠️ User Warned')
                    .setColor(0xFFAA00)
                    .addFields(
                        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Moderator', value: moderator ? `${moderator.tag} (${moderator.id})` : 'Unknown', inline: true },
                        { name: 'Reason', value: reason || 'No reason provided', inline: false }
                    );
                break;
                
            case 'ban':
                embed.setTitle('🔨 User Banned')
                    .setColor(0xFF0000)
                    .addFields(
                        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Moderator', value: moderator ? `${moderator.tag} (${moderator.id})` : 'Discord (Native Ban)', inline: true },
                        { name: 'Reason', value: reason || 'No reason provided', inline: false }
                    );
                
                if (extra.deleteMessageDays) {
                    embed.addFields({ name: 'Message History', value: `${extra.deleteMessageDays} day(s) deleted`, inline: true });
                }
                break;
                
            case 'unban':
                embed.setTitle('🔓 User Unbanned')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Moderator', value: moderator ? `${moderator.tag} (${moderator.id})` : 'Discord (Native Unban)', inline: true },
                        { name: 'Reason', value: reason || 'No reason provided', inline: false }
                    );
                break;
                
            case 'timeout':
                embed.setTitle('⏰ User Timed Out')
                    .setColor(0xFF6600)
                    .addFields(
                        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Moderator', value: moderator ? `${moderator.tag} (${moderator.id})` : 'Discord (Native Timeout)', inline: true },
                        { name: 'Reason', value: reason || 'No reason provided', inline: false }
                    );
                
                if (extra.duration) {
                    embed.addFields({ name: 'Duration', value: extra.duration, inline: true });
                }
                break;
                
            case 'timeout_remove':
                embed.setTitle('⏰ Timeout Removed')
                    .setColor(0x00AA00)
                    .addFields(
                        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Moderator', value: moderator ? `${moderator.tag} (${moderator.id})` : 'Discord (Native)', inline: true },
                        { name: 'Reason', value: reason || 'Timeout expired or removed', inline: false }
                    );
                break;
                
            case 'mute':
                embed.setTitle('🔇 User Muted')
                    .setColor(0x666666)
                    .addFields(
                        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Moderator', value: moderator ? `${moderator.tag} (${moderator.id})` : 'Unknown', inline: true },
                        { name: 'Reason', value: reason || 'No reason provided', inline: false }
                    );
                
                if (extra.duration) {
                    embed.addFields({ name: 'Duration', value: extra.duration, inline: true });
                }
                break;
                
            case 'unmute':
                embed.setTitle('🔊 User Unmuted')
                    .setColor(0x00DD00)
                    .addFields(
                        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Moderator', value: moderator ? `${moderator.tag} (${moderator.id})` : 'Unknown', inline: true },
                        { name: 'Reason', value: reason || 'No reason provided', inline: false }
                    );
                break;
                
            default:
                embed.setTitle('📋 Moderation Action')
                    .setColor(0x0099FF)
                    .addFields(
                        { name: 'Action', value: action, inline: true },
                        { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                        { name: 'Moderator', value: moderator ? `${moderator.tag} (${moderator.id})` : 'Unknown', inline: true },
                        { name: 'Reason', value: reason || 'No reason provided', inline: false }
                    );
        }
        
        // Add avatar
        if (target.displayAvatarURL) {
            embed.setThumbnail(target.displayAvatarURL());
        }
        
        // Send the log
        await modlogChannel.send({ embeds: [embed] });
        console.log(`✅ Sent modlog for ${action} action in guild ${guildId}`);
        
    } catch (error) {
        console.error('❌ Failed to send modlog:', error);
    }
}

/**
 * Format duration for display
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} - Formatted duration string
 */
function formatDuration(milliseconds) {
    if (!milliseconds) return 'Unknown';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
}

module.exports = {
    sendModLog,
    formatDuration
};