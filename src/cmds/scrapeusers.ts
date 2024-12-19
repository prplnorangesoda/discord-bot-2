import {
  ActionRowBuilder,
  Role,
  RoleSelectMenuBuilder,
  type APIRole,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { Command } from "types";
import { stringify } from "csv-stringify/sync";
import { file, write } from "bun";
import slugify from "slugify";

export default class ScrapeUsersCommand implements Command {
  public constructor(private db_handle: BunSQLiteDatabase) {}
  public async create(interaction: ChatInputCommandInteraction): Promise<any> {
    let defer = await interaction.deferReply();
    if (!interaction.inGuild()) {
      interaction.reply("You must be in a guild for this command.");
      return;
    }
    try {
      let role = interaction.options.get("role", true)!.role!;
      let members = await interaction.guild!.members.fetch();
      write("./members.txt", JSON.stringify(members, undefined, 2));
      members = members.filter(
        (member) => member.roles.resolve(role.id) !== null
      );
      console.log("Filtered");
      console.log(members.size);
      let out_members: [string, string, string][] = [];
      let done = false;
      let values = members.keys();
      while (!done) {
        let batch: string[] = [];
        for (let i = 0; i < 100; i++) {
          let next = values.next();
          if (next.done) {
            done = true;
            break;
          } else {
            batch.push(next.value);
          }
        }
        let members = await interaction.guild!.members.fetch({ user: batch });
        console.log("Batch received!");
        members.forEach((member) => {
          out_members.push([member.user.tag, member.user.id, role.name]);
        });
      }

      let file_path = slugify(
        `${new Date().toISOString()}_${role.name}_${role.id}.csv`
      );

      write("./" + file_path, stringify(out_members));

      await defer.edit(`Written this file to ${"`" + file_path + "`"}`);
    } catch (err) {
      interaction.reply(JSON.stringify(err)).catch();
      console.error(err);
    }
  }
}
