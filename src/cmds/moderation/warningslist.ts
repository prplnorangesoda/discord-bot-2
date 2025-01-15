import { Colors } from "consts";
import { exampleTable, warningsTable } from "db/schema";
import {
  User,
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
    let victim_to_filter_by = interaction.options.getUser("user", false);
    let results;
    if (victim_to_filter_by) {
      results = await this.db_handle
        .select()
        .from(warningsTable)
        .where(
          and(
            eq(warningsTable.victim_id, victim_to_filter_by.id),
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

    let mod_array = results.map((result) => {
      let mod_promise: Promise<User | null> = result.moderator_id
        ? interaction.client.users.fetch(result.moderator_id)
        : new Promise((res) => res(null));

      return mod_promise;
    });
    let victim_array = results.map((result) => {
      let victim_promise: Promise<User | null> = victim_to_filter_by
        ? new Promise((res) => res(null))
        : interaction.client.users.fetch(result.victim_id);
      return victim_promise;
    });

    let settled_promises = await Promise.all([
      Promise.all(mod_array),
      Promise.all(victim_array),
    ]);

    // let user = interaction.client.users.fetch()
    let embed: APIEmbed = {
      author: {
        name: victim_to_filter_by
          ? `${victim_to_filter_by.username}'s warnings`
          : "Recent warnings",
        icon_url: victim_to_filter_by
          ? victim_to_filter_by.displayAvatarURL()
          : undefined,
      },
      color: Colors.DEEP_ORANGE,
      title: victim_to_filter_by
        ? `Total # of warnings: ${results.length}`
        : undefined,
      fields: settled_promises[0].map((moderator, index) => {
        let mod = moderator;
        let victim = settled_promises[1][index];
        let db_entry = results[index];
        return {
          name: `${db_entry.reason}`,
          value:
            `Moderator: \`${mod?.username ?? "name unavailable"}\`` +
            (victim ? `\nVictim: \`${victim!.username}\`` : "") +
            (db_entry.notes ? `\nNotes: ${db_entry.notes}` : ``),
        };
      }),
    };
    let initial = await defer;

    await initial.edit({ embeds: [embed] });
  };
}
