import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

const id_and_date = {
  id: int().primaryKey({ autoIncrement: true }),
  created_at: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
};

export const usersTable = sqliteTable("users_table", {
  ...id_and_date,
  name: text().notNull(),
  age: int().notNull(),
  email: text().notNull().unique(),
});

export const exampleTable = sqliteTable("command_table", {
  ...id_and_date,
  time: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const warningsTable = sqliteTable("warnings_table", {
  ...id_and_date,
  server_id: text().notNull(),
  moderator_id: text(),
  victim_id: text().notNull(),
  reason: text().notNull(),
  notes: text(),
  severity: int().default(-1).notNull(),
});
