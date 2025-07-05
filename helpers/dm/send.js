/**
 * Send a DM to a user with automatic logging
 * @param {User} user - The user to send the DM to
 * @param {string|Object} content - The content to send (string or message options object)
 * @param {Client} client - The Discord client
 * @param {User} [initiator] - The user who initiated the DM (optional)
 * @returns {Promise<Message|null>} The sent message or null if failed
 */
async function sendDM(user, content, client, initiator = null) {
    try {
        const dmChannel = await user.createDM();
        const sentMessage = await dmChannel.send(content);
        
        // Log the outgoing DM
        const { logOutgoingDM } = require('./log');
        await logOutgoingDM(user, content, client, initiator);
        
        console.log(`✅ Sent DM to ${user.tag}${initiator ? ` (initiated by ${initiator.tag})` : ''}`);
        return sentMessage;
    } catch (error) {
        console.error(`❌ Failed to send DM to ${user.tag}:`, error);
        return null;
    }
}

/**
 * Send a DM to a user by their ID with automatic logging
 * @param {string} userId - The ID of the user to send the DM to
 * @param {string|Object} content - The content to send
 * @param {Client} client - The Discord client
 * @param {User} [initiator] - The user who initiated the DM (optional)
 * @returns {Promise<Message|null>} The sent message or null if failed
 */
async function sendDMById(userId, content, client, initiator = null) {
    try {
        const user = await client.users.fetch(userId);
        return await sendDM(user, content, client, initiator);
    } catch (error) {
        console.error(`❌ Failed to fetch user ${userId} for DM:`, error);
        return null;
    }
}

/**
 * Send a DM with embed
 * @param {User} user - The user to send the DM to
 * @param {EmbedBuilder|Object} embed - The embed to send
 * @param {Client} client - The Discord client
 * @param {User} [initiator] - The user who initiated the DM (optional)
 * @returns {Promise<Message|null>} The sent message or null if failed
 */
async function sendDMEmbed(user, embed, client, initiator = null) {
    return await sendDM(user, { embeds: [embed] }, client, initiator);
}

/**
 * Send a DM with embed by user ID
 * @param {string} userId - The ID of the user to send the DM to
 * @param {EmbedBuilder|Object} embed - The embed to send
 * @param {Client} client - The Discord client
 * @param {User} [initiator] - The user who initiated the DM (optional)
 * @returns {Promise<Message|null>} The sent message or null if failed
 */
async function sendDMEmbedById(userId, embed, client, initiator = null) {
    try {
        const user = await client.users.fetch(userId);
        return await sendDMEmbed(user, embed, client, initiator);
    } catch (error) {
        console.error(`❌ Failed to fetch user ${userId} for DM:`, error);
        return null;
    }
}

module.exports = {
    sendDM,
    sendDMById,
    sendDMEmbed,
    sendDMEmbedById
};
