import { ChatInputCommandInteraction } from "discord.js";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export type RESTCommand = {
  type?: number;
  guild_id?: string;
  name: string;
  description: string;
};
export interface Command {
  create: (interaction: ChatInputCommandInteraction) => Promise<any>;
}
export type Handler = RESTCommand & {
  command: Command;
};
