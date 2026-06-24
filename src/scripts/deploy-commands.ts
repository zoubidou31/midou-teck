import { REST, Routes } from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';

// Import all commands
import { command as freegamesCmd } from '../commands/games/freegames';
import { command as epicfreeCmd } from '../commands/games/epicfree';
import { command as steamdealsCmd } from '../commands/games/steamdeals';
import { command as gameCmd } from '../commands/games/game';
import { command as wishlistCmd } from '../commands/games/wishlist';
import { command as notifyCmd } from '../commands/games/notify';
import {
  balanceCommand,
  workCommand,
  dailyCommand,
  rankCommand,
  leaderboardCommand,
  profileCommand,
} from '../commands/economy/economy';
import { giveawayCommand } from '../commands/giveaway/giveaway';
import {
  pingCommand,
  helpCommand,
  botInfoCommand,
  inviteCommand,
  serverInfoCommand,
  userInfoCommand,
} from '../commands/utility/utility';
import {
  setSteamChannel,
  setEpicChannel,
  setDealsChannel,
} from '../commands/admin/channels';

const commands = [
  freegamesCmd,
  epicfreeCmd,
  steamdealsCmd,
  gameCmd,
  wishlistCmd,
  notifyCmd,
  balanceCommand,
  workCommand,
  dailyCommand,
  rankCommand,
  leaderboardCommand,
  profileCommand,
  giveawayCommand,
  pingCommand,
  helpCommand,
  botInfoCommand,
  inviteCommand,
  serverInfoCommand,
  userInfoCommand,
  setSteamChannel,
  setEpicChannel,
  setDealsChannel,
].map((cmd) => cmd.data.toJSON());

async function deployCommands(): Promise<void> {
  const rest = new REST().setToken(config.bot.token);

  try {
    logger.info(`Deploying ${commands.length} application commands...`);

    if (config.bot.guildId) {
      // Guild-scoped (instant, for dev)
      await rest.put(
        Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId),
        { body: commands }
      );
      logger.info(`✅ Deployed ${commands.length} commands to guild ${config.bot.guildId}`);
    } else {
      // Global (takes ~1 hour to propagate)
      await rest.put(Routes.applicationCommands(config.bot.clientId), { body: commands });
      logger.info(`✅ Deployed ${commands.length} global commands`);
    }
  } catch (error) {
    logger.error('Failed to deploy commands:', error);
    process.exit(1);
  }
}

deployCommands();
