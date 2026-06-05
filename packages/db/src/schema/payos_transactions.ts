import { pgTable, uuid, text, integer, timestamp, bigint } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const payosTransactions = pgTable(
  "payos_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    orderCode: bigint("order_code", { mode: "number" }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull().default("PENDING"),
    checkoutUrl: text("checkout_url").notNull(),
    paymentLinkId: text("payment_link_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);
