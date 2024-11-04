import Log from "log";
import {
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  type Interaction,
} from "discord.js";

const fatal = (...args: any[]): never => {
  console.error("Fatal error: ", ...args);
  process.exit(1);
};

type Response = [false, null] | [true, string];
type RESTCommand = { name: string; description: string };

class CommandHandler {
  static instance: CommandHandler | undefined;

  private handlers: {
    name: string;
    description: string;
    handler: (args: ChatInputCommandInteraction) => void;
  }[] = [
    {
      name: "ping",
      description: "Ping!",
      handler: async (interaction) => await interaction.reply("Pong!"),
    },
  ];

  public constructor() {
    if (CommandHandler.instance) return CommandHandler.instance;
    CommandHandler.instance = this;
  }

  public getHandlersForRest(): RESTCommand[] {
    let ret: RESTCommand[] = [];
    for (let handler of this.handlers) {
      ret.push({
        name: handler.name,
        description: handler.description,
      });
    }
    return ret;
  }
  public registerCommands(client: Client<true>) {
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      for (let i = 0; i < this.handlers.length; i++) {
        let handler = this.handlers[i];
        if (interaction.commandName === handler.name) {
          handler.handler(interaction);
        }
      }
    });
  }
}

export default async function main() {
  const mainLog = Log.get("main");
  const DISCORD_API_TOKEN = Bun.env.DISCORD_API_TOKEN!;
  const CLIENT_ID = Bun.env.CLIENT_ID!;
  if (DISCORD_API_TOKEN === undefined) {
    fatal("No discord API token found.");
  }
  if (CLIENT_ID === undefined) {
    fatal("No client ID found.");
  }

  console.info("Creating command handler");
  const command_handler = new CommandHandler();
  const commands: RESTCommand[] = command_handler.getHandlersForRest();

  console.info("Refreshing slash commands...");

  const rest = new REST({ version: "10" }).setToken(DISCORD_API_TOKEN);

  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    fatal("Error reloading application commands:", error);
  }
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.on("ready", (client) => {
    console.log(`Client logged in. ${client.user.tag}`);
    command_handler.registerCommands(client);
  });

  await client.login(DISCORD_API_TOKEN);
}

(() => {
  main();
})();
