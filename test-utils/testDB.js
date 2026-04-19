import { GenericContainer, Wait } from "testcontainers";
import knex from "knex";

let container;
let db;

export async function startTestDB() {
  container = await new GenericContainer("postgres:15")
    .withEnvironment({
      POSTGRES_DB: "testdb",
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forListeningPorts()) // ✅ FIX
    .start();

  const port = container.getMappedPort(5432);
  const host = container.getHost();

  const connection = {
    host,
    port,
    user: "test",
    password: "test",
    database: "testdb",
  };

  db = knex({
    client: "pg",
    connection,
    pool: {
      min: 0,
      max: 5,
    },
  });

  // ✅ ensure DB ready (extra safety)
  await db.raw("SELECT 1");

  // ✅ extension
  await db.raw(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await db.schema.createTable("accounts", (t) => {
    t.uuid("id").primary();
    t.uuid("user_id");
    t.string("currency_code");
  });

  await db.schema.createTable("transaction_categories", (t) => {
    t.increments("category_id").primary();
    t.string("code");
  });

  await db.schema.createTable("transactions", (t) => {
    t.uuid("id").defaultTo(db.raw("gen_random_uuid()")).primary();
    t.uuid("user_id");
    t.uuid("account_id");
    t.integer("category_id");
    t.decimal("amount");
    t.string("type");
    t.text("description");
    t.text("reference");
    t.timestamp("occurred_at");
    t.text("display_name");
    t.boolean("is_payable");
    t.timestamp("deleted_at");
    t.timestamp("updated_at");
    t.boolean("is_active").defaultTo(true);
  });

  await db.schema.createTable("outbox_events", (t) => {
    t.increments("id");
    t.string("event_type");
    t.jsonb("payload");
    t.string("status");
  });

  return db;
}

export async function stopTestDB() {
  if (db) await db.destroy();
  if (container) await container.stop();
}