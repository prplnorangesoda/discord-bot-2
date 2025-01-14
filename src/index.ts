import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  type Interaction,
} from "discord.js";
import { ParameterType, type Handler, type RESTCommand } from "./types";
import * as schema from "./db/schema";
import { Database } from "bun:sqlite";
import { BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import {
  PingCommand,
  SpeakersCommand,
  DatabaseTestCmd,
  ExampleInteractionCmd,
  ScrapeUsersCmd,
} from "./cmds";
import WarnCmd from "cmds/moderation/warn";
import WarningsListCmd from "cmds/moderation/warningslist";

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
  // @ts-expect-error
  private handlers: Handler[];
  // @ts-expect-error
  private chat_handlers: Handler[];

  public constructor(private db_handle: BunSQLiteDatabase) {
    if (CommandHandler.instance) return CommandHandler.instance;
    CommandHandler.instance = this;
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
        command: new ScrapeUsersCmd(db_handle),
        default_member_permissions:
          PermissionFlagsBits.ManageRoles.toString(10),
        params: [
          {
            name: "role",
            description: "the role to scrape for",
            required: true,
            type: ParameterType.ROLE,
          },
        ],
      },
      {
        name: "warn",
        description: "warn a user for a custom reason",
        type: ApplicationCommandType.ChatInput,
        command: new WarnCmd(db_handle),
        default_member_permissions:
          PermissionFlagsBits.ModerateMembers.toString(10),
        params: [
          {
            name: "victim",
            description: "the user to warn",
            required: true,
            type: ParameterType.USER,
          },
          {
            name: "reason",
            description: "reason for warning. will be shown to user",
            required: true,
            type: ParameterType.STRING,
          },
          {
            name: "notes",
            description: "any moderator note, will not be shown to user",
            required: false,
            type: ParameterType.STRING,
          },
        ],
      },
      {
        name: "warnings",
        description: "list warnings, optionally filtered",
        type: ApplicationCommandType.ChatInput,
        command: new WarningsListCmd(db_handle),
        params: [
          {
            name: "user",
            description: "the user to filter warnings by",
            required: false,
            type: ParameterType.USER,
          },
        ],
      },
    ];
    this.chat_handlers = this.handlers.filter(
      (val) => val.type === ApplicationCommandType.ChatInput
    );
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
      let begin = performance.now();

      if (interaction.isChatInputCommand()) {
        for (let i = 0; i < this.chat_handlers.length; i++) {
          let handler = this.chat_handlers[i];

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
      } else if (interaction.isUserContextMenuCommand()) {
        interaction.reply("This should never happen.");
      }
    });
  }
}

async function main() {
  const DISCORD_API_TOKEN = process.env.DISCORD_API_TOKEN!;
  const CLIENT_ID = process.env.CLIENT_ID!;
  const DB_FILE_NAME = process.env.DB_FILE_NAME!;
  if (DISCORD_API_TOKEN === undefined)
    fatal(
      "No discord API token found. Specify DISCORD_API_TOKEN in a .env file."
    );
  if (CLIENT_ID === undefined)
    fatal("No client ID found. Specify CLIENT_ID in a .env file.");
  if (DB_FILE_NAME === undefined)
    fatal("No DB file name found. Specify DB_FILE_NAME in a .env file.");

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
  .then(() => {
    console.log("Main finished.");
  })
  .catch((err) => {
    throw err;
  });
