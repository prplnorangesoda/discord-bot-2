import { ChatInputCommandInteraction } from "discord.js";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export enum ParameterType {
  "SUB_COMMAND" = 1,
  "SUB_COMMAND_GROUP" = 2,
  "STRING" = 3,
  "INTEGER" = 4,
  "BOOLEAN" = 5,
  "USER" = 6,
  "CHANNEL" = 7,
  "ROLE" = 8,
  "MENTIONABLE" = 9,
  "NUMBER" = 10,
  "ATTACHMENT" = 11,
}
export type Parameter = {
  type: ParameterType;
  name: string;
  description: string;
  required: boolean;
};
export type RESTCommand = {
  default_member_permissions?: string;
  options?: Parameter[];
  type?: number;
  guild_id?: string;
  name: string;
  description?: string;
};
export interface Command {
  create: (interaction: ChatInputCommandInteraction) => Promise<any>;
}
export type Handler = RESTCommand & {
  params?: Parameter[];
  command: Command;
};
