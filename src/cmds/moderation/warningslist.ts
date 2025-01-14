import { exampleTable, warningsTable } from "db/schema";
import {
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { desc } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { Command } from "types";

export default class WarningsListCmd implements Command {
  public constructor(private db_handle: BunSQLiteDatabase) {}
  create = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inGuild()) return;
    if (!interaction.memberPermissions.has("ModerateMembers")) {
      interaction.reply({
        content: "Insufficient permissions. You require: MODERATE_MEMBERS",
        options: { ephemeral: true },
      });
      return;
    }
    interaction.reply("All checks passed.");
  };
}
