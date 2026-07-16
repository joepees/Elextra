import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ordersTable = pgTable("orders_table", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  items: jsonb("items"),
  totalAmount: text("total_amount"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});
