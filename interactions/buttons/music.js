const { MusicManager } = require('../../helpers/music');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    customId: 'music_',
    async execute(interaction) {
        // Check if user is in a voice channel
        if (!interaction.member.voice.channel) {
            return await interaction.reply({ 
                content: '❌ You need to be in a voice channel to use music controls!', 
                ephemeral: true 
            });
        }

        const parts = interaction.customId.split('_');
        const action = parts[1];

        switch (action) {
            case 'pause':
                return await handlePauseResume(interaction);

            case 'resume':
                return await handlePauseResume(interaction);

            case 'stop':
                MusicManager.stop(interaction.guild.id);
                await interaction.reply({ 
                    content: '⏹️ Music stopped and queue cleared.', 
                    ephemeral: true 
                });
                break;

            case 'skip':
                if (MusicManager.skip(interaction.guild.id)) {
                    await interaction.reply({ 
                        content: '⏭️ Song skipped!', 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: '❌ Nothing to skip!', 
                        ephemeral: true 
                    });
                }
                break;

            case 'loop':
                const newLoopMode = MusicManager.toggleLoop(interaction.guild.id);
                const loopEmoji = newLoopMode === 'off' ? '❌' : (newLoopMode === 'track' ? '🔂' : '🔁');
                await interaction.reply({ 
                    content: `${loopEmoji} Loop mode: ${newLoopMode}`, 
                    ephemeral: true 
                });
                break;

            case 'shuffle':
                const isShuffling = MusicManager.toggleShuffle(interaction.guild.id);
                await interaction.reply({ 
                    content: `🔀 Shuffle ${isShuffling ? 'enabled' : 'disabled'}`, 
                    ephemeral: true 
                });
                break;

            case 'queue':
                return await showQueue(interaction);

            case 'select':
                return await handleTrackSelection(interaction, parts);

            case 'cancel':
                return await handleCancel(interaction, parts);

            default:
                await interaction.reply({ 
                    content: '❌ Unknown music control action.', 
                    ephemeral: true 
                });
        }
    }
};

async function handlePauseResume(interaction) {
    const isPlaying = MusicManager.isPlaying(interaction.guild.id);
    const isPaused = MusicManager.isPaused(interaction.guild.id);

    if (isPlaying) {
        if (MusicManager.pause(interaction.guild.id)) {
            await interaction.reply({ 
                content: '⏸️ Music paused.', 
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: '❌ Failed to pause music!', 
                ephemeral: true 
            });
        }
    } else if (isPaused) {
        if (MusicManager.resume(interaction.guild.id)) {
            await interaction.reply({ 
                content: '▶️ Music resumed.', 
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: '❌ Failed to resume music!', 
                ephemeral: true 
            });
        }
    } else {
        await interaction.reply({ 
            content: '❌ Nothing is currently playing!', 
            ephemeral: true 
        });
    }
}

async function showQueue(interaction) {
    const queueInfo = MusicManager.getQueueInfo(interaction.guild.id, 1, 10);
    
    if (queueInfo.totalTracks === 0) {
        return await interaction.reply({ 
            content: '❌ The queue is empty!', 
            ephemeral: true 
        });
    }

    const embed = MusicManager.createQueueEmbed(interaction.guild.id, 1);
    
    // Add navigation buttons if needed
    const components = [];
    if (queueInfo.totalPages > 1) {
        const navigationRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_queue_prev_1')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('music_queue_next_1')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(queueInfo.totalPages <= 1)
            );
        components.push(navigationRow);
    }

    await interaction.reply({ 
        embeds: [embed], 
        components: components,
        ephemeral: true 
    });
}

async function handleTrackSelection(interaction, parts) {
    // music_select_0_userId format
    const trackIndex = parseInt(parts[2]);
    const userId = parts[3];

    // Check if this interaction is for the right user
    if (interaction.user.id !== userId) {
        return await interaction.reply({
            content: '❌ This selection is not for you!',
            ephemeral: true
        });
    }

    // Get stored tracks
    const tracks = global.musicSelections?.get(userId);
    if (!tracks || !tracks[trackIndex]) {
        return await interaction.reply({
            content: '❌ Selection expired or invalid!',
            ephemeral: true
        });
    }

    try {
        // Add selected track to queue
        const selectedTrack = tracks[trackIndex];
        const addedTrack = MusicManager.addToQueue(interaction.guild.id, selectedTrack, interaction.user);
        const queueInfo = MusicManager.getQueueInfo(interaction.guild.id);
        
        // Start playing if this is the first track
        if (queueInfo.totalTracks === 1) {
            const success = await MusicManager.playCurrent(interaction.guild.id);
            if (!success) {
                throw new Error('Failed to start playback');
            }
        }

        // Create response embed
        const isNowPlaying = queueInfo.totalTracks === 1;
        const embed = new EmbedBuilder()
            .setColor(isNowPlaying ? 0x1DB954 : 0x9B59B6)
            .setTitle(isNowPlaying ? '🎵 Now Playing' : '➕ Added to Queue')
            .setDescription(`**[${selectedTrack.title}](${selectedTrack.url})**\nby ${selectedTrack.artist}`)
            .addFields(
                { name: '⏱️ Duration', value: selectedTrack.duration || 'Unknown', inline: true },
                { name: '🎵 Source', value: selectedTrack.source.charAt(0).toUpperCase() + selectedTrack.source.slice(1), inline: true },
                { name: '👤 Requested by', value: interaction.user.toString(), inline: true }
            )
            .setTimestamp();

        if (!isNowPlaying) {
            embed.addFields({
                name: '📍 Queue Position',
                value: `${queueInfo.totalTracks}`,
                inline: true
            });
        }

        if (selectedTrack.thumbnail) {
            embed.setThumbnail(selectedTrack.thumbnail);
        }

        // Cleanup stored tracks
        global.musicSelections?.delete(userId);

        // Update the original message
        await interaction.update({
            embeds: [embed],
            components: []
        });

    } catch (error) {
        console.error('Error adding selected track:', error);
        await interaction.reply({
            content: '❌ Failed to add track to queue!',
            ephemeral: true
        });
    }
}

async function handleCancel(interaction, parts) {
    const userId = parts[2];

    // Check if this interaction is for the right user
    if (interaction.user.id !== userId) {
        return await interaction.reply({
            content: '❌ This selection is not for you!',
            ephemeral: true
        });
    }

    // Cleanup stored tracks
    global.musicSelections?.delete(userId);

    const embed = new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle('❌ Cancelled')
        .setDescription('Track selection cancelled.');

    await interaction.update({
        embeds: [embed],
        components: []
    });
}
