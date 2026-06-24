import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Command, STEAM_COLOR } from '../../types';
import { steamService } from '../../services/steam.service';
import { createEmbed, errorEmbed } from '../../utils/embeds';
import { SteamDeal } from '../../types';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('steamdeals')
    .setDescription('💰 Browse Steam deals with multiple filter options')
    .addStringOption((opt) =>
      opt
        .setName('filter')
        .setDescription('How to sort/filter deals')
        .setRequired(false)
        .addChoices(
          { name: '⭐ Top Rated Deals', value: 'top' },
          { name: '🆕 Latest Deals', value: 'latest' },
          { name: '📉 Biggest Discounts', value: 'discount' },
          { name: '💲 Under $5', value: 'under5' },
          { name: '💰 Under $10', value: 'under10' }
        )
    ),

  cooldown: 10,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const filter = interaction.options.getString('filter') ?? 'top';
    let deals: SteamDeal[] = [];
    let title = '';

    switch (filter) {
      case 'top':
        deals = await steamService.getTopDeals();
        title = '⭐ Top Rated Steam Deals';
        break;
      case 'latest':
        deals = await steamService.getLatestDeals();
        title = '🆕 Latest Steam Deals';
        break;
      case 'discount':
        deals = await steamService.getDealsByDiscount();
        title = '📉 Biggest Steam Discounts';
        break;
      case 'under5':
        deals = await steamService.getDealsByPrice(5);
        title = '💲 Steam Deals Under $5';
        break;
      case 'under10':
        deals = await steamService.getDealsByPrice(10);
        title = '💰 Steam Deals Under $10';
        break;
    }

    if (!deals.length) {
      await interaction.editReply({
        embeds: [errorEmbed('No deals found with this filter. Try another one!')],
      });
      return;
    }

    const fields = deals.slice(0, 8).map((deal) => {
      const discount = Math.round(parseFloat(deal.savings));
      const rating = deal.steamRatingPercent ? `${deal.steamRatingPercent}%` : 'N/A';
      return {
        name: `🎮 ${deal.title.slice(0, 50)}`,
        value: [
          `~~$${deal.normalPrice}~~ → **$${deal.salePrice}** (**-${discount}%**)`,
          `⭐ Steam Rating: ${rating}`,
          `[🛒 Get Deal](${steamService.getDealUrl(deal.dealID)})`,
        ].join('\n'),
        inline: true,
      };
    });

    const embed = createEmbed({
      title,
      description: `Showing **${deals.length}** deals`,
      color: STEAM_COLOR,
      fields,
      timestamp: true,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('🛒 Browse Steam Store')
        .setStyle(ButtonStyle.Link)
        .setURL('https://store.steampowered.com/specials'),
      new ButtonBuilder()
        .setLabel('💰 More Deals')
        .setStyle(ButtonStyle.Link)
        .setURL('https://www.cheapshark.com')
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
