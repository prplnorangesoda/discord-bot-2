import { ChatInputCommandInteraction } from "discord.js";

export type RESTCommand = {
  type?: number;
  guild_id?: string;
  name: string;
  description: string;
};
export interface Command {
  create: (interaction: ChatInputCommandInteraction) => void;
}
export type Handler = RESTCommand & {
  handler: Command;
};
