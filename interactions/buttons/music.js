const musicManager = require('../../helpers/music');
const { EmbedBuilder } = require('discord.js');

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

        const action = interaction.customId.split('_')[1];

        switch (action) {
            case 'pause':
                if (musicManager.pause(interaction.guild.id)) {
                    await interaction.reply({ content: '⏸️ Music paused.', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ Nothing is currently playing!', ephemeral: true });
                }
                break;

            case 'resume':
                if (musicManager.resume(interaction.guild.id)) {
                    await interaction.reply({ content: '▶️ Music resumed.', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ Nothing is currently paused!', ephemeral: true });
                }
                break;

            case 'stop':
                musicManager.stop(interaction.guild.id);
                await interaction.reply({ content: '⏹️ Music stopped and queue cleared.', ephemeral: true });
                break;

            case 'skip':
                const result = await musicManager.voteSkip(
                    interaction.guild.id, 
                    interaction.user.id, 
                    interaction.member.voice.channel
                );

                if (result.skipped) {
                    await interaction.reply({ content: `⏭️ Song skipped! (${result.votes}/${result.required} votes)`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `🗳️ Vote registered! (${result.votes}/${result.required} votes needed to skip)`, ephemeral: true });
                }
                break;

            case 'previous':
                if (await musicManager.previous(interaction.guild.id)) {
                    await interaction.reply({ content: '⏮️ Playing previous song.', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ No previous song available!', ephemeral: true });
                }
                break;

            case 'loop':
                const isLooping = musicManager.toggleLoop(interaction.guild.id);
                await interaction.reply({ content: `🔄 Loop mode ${isLooping ? 'enabled' : 'disabled'}.`, ephemeral: true });
                break;

            case 'shuffle':
                const isShuffling = musicManager.toggleShuffle(interaction.guild.id);
                await interaction.reply({ content: `🔀 Shuffle mode ${isShuffling ? 'enabled' : 'disabled'}.`, ephemeral: true });
                break;

            case 'volume':
                const volumeAction = interaction.customId.split('_')[2];
                const queue = musicManager.getQueue(interaction.guild.id);
                let newVolume;

                if (volumeAction === 'up') {
                    newVolume = Math.min(1.0, queue.volume + 0.1);
                } else if (volumeAction === 'down') {
                    newVolume = Math.max(0.0, queue.volume - 0.1);
                }

                musicManager.setVolume(interaction.guild.id, newVolume);
                await interaction.reply({ content: `🔊 Volume set to ${Math.round(newVolume * 100)}%`, ephemeral: true });
                break;

            case 'queue':
                if (interaction.customId === 'music_queue_show') {
                    const queueData = musicManager.getQueueList(interaction.guild.id, 1, 10);

                    if (queueData.songs.length === 0) {
                        return await interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#FF6B9D')
                        .setTitle('🎵 Music Queue')
                        .setFooter({ text: `Page 1/${queueData.totalPages} • ${queueData.totalSongs} total songs` });

                    let description = '';
                    queueData.songs.slice(0, 5).forEach((song, index) => {
                        const prefix = index === queueData.currentIndex ? '🎵 **' : `${index + 1}. `;
                        const suffix = index === queueData.currentIndex ? '** (Now Playing)' : '';
                        description += `${prefix}${song.title} (${song.duration})${suffix}\n`;
                    });

                    if (queueData.totalSongs > 5) {
                        description += `\n... and ${queueData.totalSongs - 5} more songs`;
                    }

                    embed.setDescription(description);
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
                break;

            case 'select':
                // This is handled in the music command file
                break;

            default:
                await interaction.reply({ content: '❌ Unknown music control action.', ephemeral: true });
        }
    }
};
