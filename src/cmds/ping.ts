import type { ChatInputCommandInteraction } from "discord.js";
import { type Command } from "../types";
export default class PingHandler implements Command {
  public constructor() {}
  public async create(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Pong!");
  }
}
