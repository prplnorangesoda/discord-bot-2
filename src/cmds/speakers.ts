import type { ChatInputCommandInteraction } from "discord.js";
import type { Command } from "types";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import * as schema from "db/schema";

export default class SpeakersCommand implements Command {
  public constructor(private db_handle: BunSQLiteDatabase) {}
  public create(interaction: ChatInputCommandInteraction) {
    interaction.reply("Noob down");
  }
}
