import type { ChatInputCommandInteraction } from "discord.js";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { Command } from "types";

export default class ExampleInteractionCmd implements Command {
  constructor(private db_handle: BunSQLiteDatabase) {}

  create = async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply(
      JSON.stringify(interaction.member?.user, undefined, 2)
    );
  };
}
