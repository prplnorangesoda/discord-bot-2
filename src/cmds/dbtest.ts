import { exampleTable } from "db/schema";
import type { ChatInputCommandInteraction } from "discord.js";
import { desc } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { Command } from "types";

export default class DatabaseTestCmd implements Command {
  public constructor(private db_handle: BunSQLiteDatabase) {}
  create = async (interaction: ChatInputCommandInteraction) => {
    let db_return = await this.db_handle
      .select()
      .from(exampleTable)
      .limit(50)
      .orderBy(desc(exampleTable.id))
      .execute();
    if (db_return) {
      let len = db_return.length;
      let reply = db_return.reduce<string>((prev, current, idx) => {
        let resp =
          prev +
          `\nstartup number: ${
            current.id
          }, on date: ${current.time?.toLocaleString("en-GB", {
            timeZone: "UTC",
          })} UTC`;
        if (idx == len - 1) {
          resp = resp + "\n```";
        }
        return resp;
      }, "```text\n");
      await interaction.reply(reply);
    } else {
      await interaction.reply("No db entries found");
    }
  };
}
