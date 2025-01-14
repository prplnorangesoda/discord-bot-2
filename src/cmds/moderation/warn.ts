import { exampleTable, warningsTable } from "db/schema";
import {
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { desc } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { Command } from "types";

export default class WarnCmd implements Command {
  public constructor(private db_handle: BunSQLiteDatabase) {}
  create = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inGuild()) return;
    if (!interaction.memberPermissions.has("ModerateMembers")) {
      interaction.reply({
        content: "Insufficient permissions. You require: MODERATE_MEMBERS",
        options: { flags: MessageFlags.Ephemeral },
      });
      return;
    }
    let user = interaction.options.getUser("victim", true);
    let reason_raw = interaction.options.getString("reason", true);
    let reply = interaction.reply(`Warning \`${user.username}\`...`);
    let reason = reason_raw.split("`").join("<GRAVE>");
    let warning_result: (typeof warningsTable.$inferSelect)[] | null = null;
    try {
      warning_result = await this.db_handle
        .insert(warningsTable)
        .values({
          server_id: interaction.guildId,
          reason: reason_raw,
          victim_id: user.id,
          moderator_id: interaction.user.id,
          severity: 0,
        })
        .returning()
        .execute();
    } catch (why) {
      (await reply).edit(
        "Could not add the new warning to the database. Still going ahead and warning the user, but this won't show up in history.\n" +
          "Reason why: " +
          JSON.stringify(why)
      );
      return;
    }

    user
      .send(
        `You have been warned in __${interaction.guild!.name}__.\n\n` +
          `The moderators have provided this reason: \n\`\`\`text\n${reason}\`\`\`\n` +
          `Warning ID: ${
            warning_result
              ? warning_result[0].id.toString()
              : "_unavailable, message a moderator_"
          }`
      )
      .then(async () => {
        (await reply).edit(`\`${user.username}\` **successfully warned.**`);
      })
      .catch(async (reason) =>
        (await reply).edit(
          "I was unable to send the message to the user.\nWhy: ```json\n" +
            JSON.stringify(reason, undefined, 2).split("`").join("<GRAVE>") +
            "```"
        )
      );

    // let db_return = await this.db_handle
    //   .select()
    //   .from(warningsTable)
    //   .orderBy(desc(warningsTable.id));
    // if (db_return.length !== 0) {
    //   let len = db_return.length;
    //   let reply = db_return.reduce<string>((prev, current, idx) => {
    //     let resp =
    //       prev +
    //       `\nid: ${current.id}, on date: ${current.created_at?.toLocaleString(
    //         "en-GB",
    //         {
    //           timeZone: "UTC",
    //         }
    //       )} UTC`;
    //     if (idx == len - 1) {
    //       resp = resp + "\n```";
    //     }
    //     return resp;
    //   }, "```text\n");
    //   await interaction.followUp(reply);
    // } else {
    //   await interaction.followUp("No db entries found");
    // }
  };
}
