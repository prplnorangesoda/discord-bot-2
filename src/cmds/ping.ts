import type { ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
export default class PingHandler implements Command {
  public constructor(private db_handler: BunSQLiteDatabase) {}
  public async create(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Pong!");
  }
}
