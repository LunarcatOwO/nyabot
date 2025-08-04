const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { MusicManager } = require('../../../../helpers/music');

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

    const queueInfo = MusicManager.getQueueInfo(ctx.guild.id, page, 10);

    if (queueInfo.totalTracks === 0) {
        const embed = new EmbedBuilder()
            .setColor(0x95A5A6)
            .setTitle('📋 Queue Empty')
            .setDescription('The music queue is empty. Use `/play` to add some tracks!')
            .addFields({
                name: '💡 Tip',
                value: 'You can search for songs by name or paste SoundCloud/Spotify URLs',
                inline: false
            });

        return {
            embeds: [embed],
            ephemeral: true
        };
    }

    const embed = MusicManager.createQueueEmbed(ctx.guild.id, page);

    // Add queue statistics
    embed.addFields(
        { name: '📊 Stats', value: `${queueInfo.totalTracks} track${queueInfo.totalTracks !== 1 ? 's' : ''}`, inline: true },
        { name: '🔊 Volume', value: `${queueInfo.volume}%`, inline: true }
    );

    // Add navigation buttons if there are multiple pages
    const components = [];
    if (queueInfo.totalPages > 1) {
        const navigationRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`queue_page_${page - 1}`)
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 1),
                new ButtonBuilder()
                    .setCustomId(`queue_page_${page + 1}`)
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= queueInfo.totalPages),
                new ButtonBuilder()
                    .setCustomId('queue_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Primary)
            );
        components.push(navigationRow);
    }

    // Add control buttons
    const controlRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_shuffle')
                .setLabel(queueInfo.shuffle ? '🔀 Shuffle ON' : '🔀 Shuffle OFF')
                .setStyle(queueInfo.shuffle ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setLabel(
                    queueInfo.loop === 'off' ? '🔁 Loop OFF' :
                    queueInfo.loop === 'track' ? '🔂 Loop Track' : '🔁 Loop Queue'
                )
                .setStyle(queueInfo.loop !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('queue_clear')
                .setLabel('🗑️ Clear')
                .setStyle(ButtonStyle.Danger)
        );
    
    components.push(controlRow);

    return { 
        embeds: [embed],
        components: components
    };
};
