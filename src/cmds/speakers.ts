import type { ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types";

export default class SpeakersCommand implements Command {
  public create(interaction: ChatInputCommandInteraction) {
    interaction.reply("Noob down");
  }
}
