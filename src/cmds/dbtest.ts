import { exampleTable } from "db/schema";
import type { ChatInputCommandInteraction } from "discord.js";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { Command } from "types";

export default class DatabaseTestCmd implements Command {
  public constructor(private db_handle: BunSQLiteDatabase) {}
  create = async (interaction: ChatInputCommandInteraction) => {
    let db_return = await this.db_handle.select().from(exampleTable).execute();
    if (db_return) {
      await interaction.reply(
        "DB example return: " + JSON.stringify(db_return)
      );
    } else {
      await interaction.reply("No db entries found");
    }
  };
}
