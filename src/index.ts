import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  type Interaction,
} from "discord.js";

import * as schema from "./db/schema";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";

const fatal = (...args: any[]): never => {
  console.error("Fatal error: ", ...args);
  process.exit(1);
};

type RESTCommand = {
  type?: number;
  guild_id?: string;
  name: string;
  description: string;
};
class CommandHandler {
  static instance: CommandHandler | undefined;

  private handlers: (RESTCommand & {
    handler: (args: ChatInputCommandInteraction) => void;
  })[] = [
    {
      name: "ping",
      description: "Ping!",
      type: ApplicationCommandType.ChatInput,
      handler: async (interaction) => {
        console.log("Ping run");
        await interaction.reply("Pong!");
      },
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

async function main() {
  const DISCORD_API_TOKEN = process.env.DISCORD_API_TOKEN!;
  const CLIENT_ID = process.env.CLIENT_ID!;
  const DB_FILE_NAME = process.env.DB_FILE_NAME!;
  if (DISCORD_API_TOKEN === undefined) fatal("No discord API token found.");
  if (CLIENT_ID === undefined) fatal("No client ID found.");
  if (DB_FILE_NAME === undefined) fatal("No DB file name found.");

  console.info("Creating database");
  const sqlite = new Database(DB_FILE_NAME, { create: true, strict: true });
  console.log(sqlite.exec("SELECT 'hello_world'"));
  const db = drizzle(sqlite);

  const user: typeof schema.usersTable.$inferInsert = {
    name: "example",
    age: 12,
    email: "john@john.com",
  };

  await db.insert(schema.usersTable).values(user);
  console.log("User created");

  const users = await db.select().from(schema.usersTable);
  console.log("All users from the database: ", users);

  await db
    .update(schema.usersTable)
    .set({
      age: 31,
    })
    .where(eq(schema.usersTable.email, user.email));
  console.log("User info updated!");

  await db
    .delete(schema.usersTable)
    .where(eq(schema.usersTable.email, user.email));
  console.log("User deleted!");
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

main();