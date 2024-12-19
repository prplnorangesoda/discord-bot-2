import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  type Interaction,
} from "discord.js";

import { ParameterType, type Handler, type RESTCommand } from "./types";
import * as schema from "./db/schema";
import { Database } from "bun:sqlite";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { eq } from "drizzle-orm";
import { PingCommand, SpeakersCommand } from "./cmds";
import DatabaseTestCmd from "cmds/dbtest";
import ExampleInteractionCmd from "cmds/example";
import ScrapeUsersCommand from "cmds/scrapeusers";

const fatal = (...args: any[]): never => {
  console.error("[Fatal error]", ...args);
  throw new Error("Fatal error");
};

export const filterCreator = (i: Interaction) => {
  return (button_interaction: Interaction) =>
    button_interaction.user.id === i.user.id;
};
class CommandHandler {
  static instance: CommandHandler | undefined;

  private handlers: Handler[];

  public constructor(private db_handle: BunSQLiteDatabase) {
    this.handlers = [
      {
        name: "ping",
        description: "Ping!",
        type: ApplicationCommandType.ChatInput,
        command: new PingCommand(db_handle),
      },
      {
        name: "dbtest",
        description: "test a command which queries the database",
        type: ApplicationCommandType.ChatInput,
        command: new DatabaseTestCmd(db_handle),
      },
      {
        name: "stupid_noob",
        description: "speakro",
        type: ApplicationCommandType.ChatInput,
        command: new SpeakersCommand(db_handle),
      },
      {
        name: "interaction_test",
        description: "example",
        type: ApplicationCommandType.ChatInput,
        command: new ExampleInteractionCmd(db_handle),
      },
      {
        name: "scrape_for_role",
        description:
          "scrapes all users with a specified role and writes it to a local file",
        type: ApplicationCommandType.ChatInput,
        command: new ScrapeUsersCommand(db_handle),
        default_member_permissions: (1 << 28).toString(10),
        params: [
          {
            name: "role",
            description: "the role to scrape for",
            required: true,
            type: ParameterType.ROLE,
          },
        ],
      },
    ];
    if (CommandHandler.instance) return CommandHandler.instance;
    CommandHandler.instance = this;
  }

  public getHandlersForRest(): RESTCommand[] {
    let ret: RESTCommand[] = [];
    for (let handler of this.handlers) {
      ret.push({
        default_member_permissions: handler.default_member_permissions,
        options: handler.params,
        name: handler.name,
        description: handler.description,
        type: handler.type,
        guild_id: handler.guild_id,
      });
    }
    return ret;
  }
  public registerCommands(client: Client) {
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      let begin = performance.now();
      for (let i = 0; i < this.handlers.length; i++) {
        let handler = this.handlers[i];
        if (interaction.commandName === handler.name) {
          let res;
          try {
            res = await handler.command.create(interaction);
            console.info(
              `COMMAND "${handler.name}" .create() RAN SUCCESSFULLY ✅ IN ${
                performance.now() - begin
              }ms`
            );
          } catch (why) {
            console.error(`Command ${handler.name} .create() failed: `, why);
          }
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
  const db = drizzle(sqlite);

  console.log(
    await db.insert(schema.exampleTable).values({}).returning().execute()
  );

  console.info("Creating command handler");
  const command_handler = new CommandHandler(db);
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

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  command_handler.registerCommands(client);

  client.on("ready", (client) => {
    console.log(`Client logged in. ${client.user.tag}`);
  });

  await client.login(DISCORD_API_TOKEN);
}

main()
  .then(() => console.log("Main finished."))
  .catch(fatal);
