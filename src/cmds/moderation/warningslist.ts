import { DEEP_ORANGE } from "consts";
import { exampleTable, warningsTable } from "db/schema";
import {
  type APIEmbed,
  type ChatInputCommandInteraction,
  type WebhookMessageEditOptions,
} from "discord.js";
import { and, desc, eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { Command } from "types";

export default class WarningsListCmd implements Command {
  public constructor(private db_handle: BunSQLiteDatabase) {}
  create = async (interaction: ChatInputCommandInteraction) => {
    let defer = interaction.deferReply();
    if (!interaction.inGuild()) return;
    if (!interaction.memberPermissions.has("ModerateMembers")) {
      let initial = await defer;
      await initial.edit(
        "Insufficient permissions. You require: MODERATE_MEMBERS"
      );
      setTimeout(() => {
        initial.delete();
      }, 5000);
      return;
    }
    let victim = interaction.options.getUser("user", false);
    let results;
    if (victim) {
      results = await this.db_handle
        .select()
        .from(warningsTable)
        .where(
          and(
            eq(warningsTable.victim_id, victim.id),
            eq(warningsTable.server_id, interaction.guildId)
          )
        )
        .execute();
    } else {
      results = await this.db_handle
        .select()
        .from(warningsTable)
        .where(eq(warningsTable.server_id, interaction.guildId))
        .limit(10)
        .execute();
    }
    // let user = interaction.client.users.fetch()
    let embed: APIEmbed = {
      author: {
        name: victim ? `${victim.username}'s warnings` : "Recent warnings",
      },
      color: DEEP_ORANGE,
      title: victim ? `Total # of warnings: ${results.length}` : undefined,
      fields: results.map((result) => {
        return {
          name: `${result.reason}`,
          value:
            `Moderator id: \`${result.moderator_id ?? "unavailable"}\`` +
            (result.notes ? `\nNotes: ${result.notes}` : ``),
        };
      }),
    };
    let initial = await defer;

    await initial.edit({ embeds: [embed] });
  };
}
