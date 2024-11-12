import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { filterCreator } from "index";
import type { Command } from "types";

export default class ExampleInteractionCmd implements Command {
  constructor(private db_handle: BunSQLiteDatabase) {}

  create = async (interaction: ChatInputCommandInteraction) => {
    let button = new ButtonBuilder()
      .setCustomId("click")
      .setLabel("click me")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
    let reply = await interaction.reply({
      content: JSON.stringify(interaction.member?.user, undefined, 2),
      components: [row],
    });

    //let filter = filterCreator(interaction);

    try {
      let input = await reply.awaitMessageComponent({
        // filter: filter,
        time: 5_000,
      });
      await input.reply({
        content: JSON.stringify(input, (_, v) =>
          typeof v === "bigint" ? v.toString(2) : v
        ),
        ephemeral: true,
      });
    } catch (err) {
      await interaction.editReply({
        content: "There was an error: " + err?.toString(),
        components: [],
      });
    }
  };
}
