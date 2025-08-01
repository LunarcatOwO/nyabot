const { EmbedBuilder } = require('discord.js');
const musicManager = require('../../../../helpers/music');

exports.description = 'Show the current music queue';
exports.options = [
    {
        name: 'page',
        type: 4, // INTEGER type
        description: 'Page number to view',
        required: false,
        min_value: 1
    }
];

exports.execute = async (ctx) => {
    let page = 1;
    if (ctx.isSlashCommand) {
        page = ctx.options.getInteger('page') || 1;
    } else if (ctx.args.length > 0) {
        const pageNum = parseInt(ctx.args[0]);
        if (!isNaN(pageNum) && pageNum > 0) {
            page = pageNum;
        }
    }

    const queueData = musicManager.getQueueList(ctx.guild.id, page, 10);

    if (queueData.totalSongs === 0) {
        return {
            content: '❌ The queue is empty!',
            ephemeral: true
        };
    }

    const embed = new EmbedBuilder()
        .setColor('#FF6B9D')
        .setTitle('🎵 Music Queue')
        .setFooter({ text: `Page ${queueData.page}/${queueData.totalPages} • ${queueData.totalSongs} total songs` });

    let description = '';
    queueData.songs.forEach((song, index) => {
        const globalIndex = (page - 1) * 10 + index;
        const prefix = globalIndex === queueData.currentIndex ? '🎵 **' : `${globalIndex + 1}. `;
        const suffix = globalIndex === queueData.currentIndex ? '** (Now Playing)' : '';
        description += `${prefix}${song.title} (${song.duration})${suffix}\n`;
    });

    embed.setDescription(description);
    
    return { embeds: [embed] };
};
