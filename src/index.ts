import './config'; // Validate env first
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { ExtendedClient, Command } from './types';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './database/client';
import { startDashboard } from './dashboard';

// Import commands
import { command as freegamesCmd } from './commands/games/freegames';
import { command as epicfreeCmd } from './commands/games/epicfree';
import { command as steamdealsCmd } from './commands/games/steamdeals';
import { command as gameCmd } from './commands/games/game';
import { command as wishlistCmd } from './commands/games/wishlist';
import { command as notifyCmd } from './commands/games/notify';
import {
  balanceCommand,
  workCommand,
  dailyCommand,
  rankCommand,
  leaderboardCommand,
  profileCommand,
} from './commands/economy/economy';
import { giveawayCommand } from './commands/giveaway/giveaway';
import {
  pingCommand,
  helpCommand,
  botInfoCommand,
  inviteCommand,
  serverInfoCommand,
  userInfoCommand,
} from './commands/utility/utility';
import {
  setSteamChannel,
  setEpicChannel,
  setDealsChannel,
} from './commands/admin/channels';

// Import event handlers
import { name as readyName, once as readyOnce, execute as readyExecute } from './events/ready';
import { name as interactionName, execute as interactionExecute } from './events/commandHandler';
import {
  guildCreateHandler,
  guildDeleteHandler,
  buttonInteractionHandler,
} from './events/guildEvents';

async function main(): Promise<void> {
  // Connect database
  await connectDatabase();

  // Create client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User],
  }) as ExtendedClient;

  // Initialize collections
  client.commands = new Collection<string, Command>();
  client.cooldowns = new Collection<string, Collection<string, number>>();

  // Register commands
  const commands: Command[] = [
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
  ];

  for (const cmd of commands) {
    client.commands.set(cmd.data.name, cmd);
  }

  // Register event listeners
  client.on(readyName as string, (...args) => readyExecute(...args as [ExtendedClient]));
  client.on(interactionName as string, interactionExecute);
  client.on('guildCreate', guildCreateHandler.execute);
  client.on('guildDelete', guildDeleteHandler.execute);
  client.on('interactionCreate', buttonInteractionHandler.execute);

  // Error handling
  client.on('error', (error) => logger.error('Discord client error:', error));
  client.on('warn', (info) => logger.warn('Discord client warning:', info));
  process.on('unhandledRejection', (error) => logger.error('Unhandled rejection:', error));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    client.destroy();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start dashboard
  startDashboard(client);

  // Login
  await client.login(config.bot.token);
}

main().catch((error) => {
  logger.error('Fatal startup error:', error);
  process.exit(1);
});
