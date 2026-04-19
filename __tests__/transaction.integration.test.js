import { jest } from "@jest/globals";
import { startTestDB, stopTestDB } from "../test-utils/testDB.js";
// import { initKnex } from "../config/testKnex.js";

// let knexDB;
let db;
let service;

beforeAll(async () => {
//   const { connectionString } = await startTestDB();
//   knexDB = initKnex(connectionString);
    db = await startTestDB();

  // mock AFTER knex init
  jest.unstable_mockModule("../config/knex.js", () => ({
    knexDB:db,
  }));

  service = await import("../src/service/transactionService.js");

  // seed data
  await db("accounts").insert({
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "22222222-2222-2222-2222-222222222222",
    currency_code: "INR",
  });
});

afterAll(async () => {
  await stopTestDB();
});

beforeEach(async () => {
  await db("transactions").del();
  await db("transaction_categories").del();
  await db("outbox_events").del();
});

/* ================= TESTS ================= */

it("should create transaction + category + outbox event", async () => {
  const result = await service.checkCategoryTableAndAddTransaction(
    "22222222-2222-2222-2222-222222222222",
    "debit",
    "Food",
    100,
    "11111111-1111-1111-1111-111111111111",
    "Lunch",
    null,
    "FOOD",
    new Date(),
    false
  );

  expect(result).toBeDefined();

  const txns = await db("transactions");
  expect(txns.length).toBe(1);

  const categories = await db("transaction_categories");
  expect(categories.length).toBe(1);

  const outbox = await db("outbox_events");
  expect(outbox.length).toBe(1);
});

it("should reuse existing category", async () => {
  await db("transaction_categories").insert({
    category_id: 1,
    code: "FOOD",
  });

  await service.checkCategoryTableAndAddTransaction(
    "22222222-2222-2222-2222-222222222222",
    "debit",
    "Food",
    200,
    "11111111-1111-1111-1111-111111111111",
    "Dinner",
    null,
    "FOOD",
    new Date(),
    false
  );

  const categories = await db("transaction_categories");
  expect(categories.length).toBe(1); // no duplicate
});

it("should soft delete transaction", async () => {
  const [txn] = await db("transactions")
    .insert({
      user_id: "22222222-2222-2222-2222-222222222222",
      account_id: "11111111-1111-1111-1111-111111111111",
      amount: 100,
      type: "debit",
    })
    .returning("*");

  const result = await service.deleteTransactionService(
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    txn.id,
    100,
    "debit"
  );

  expect(result.is_active).toBe(false);

  const outbox = await db("outbox_events");
  expect(outbox.length).toBe(1);
});

it("should update transaction and emit event", async () => {
  const [txn] = await db("transactions")
    .insert({
      user_id: "22222222-2222-2222-2222-222222222222",
      account_id: "11111111-1111-1111-1111-111111111111",
      amount: 100,
      type: "debit",
    })
    .returning("*");

  const result = await service.updateTransactionService(
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    txn.id,
    { amount: 300 },
    txn
  );

  expect(result.amount).toBe("300.00");

  const outbox = await db("outbox_events");
  expect(outbox.length).toBe(1);
});

it("should reuse existing category (no duplicates)", async () => {
  await db("transaction_categories").insert({
    category_id: 1,
    code: "FOOD",
  });

  await service.checkCategoryTableAndAddTransaction(
    "22222222-2222-2222-2222-222222222222",
    "debit",
    "Food",
    200,
    "11111111-1111-1111-1111-111111111111",
    "Dinner",
    null,
    "FOOD",
    new Date(),
    false
  );

  const categories = await db("transaction_categories");
  expect(categories.length).toBe(1);
});

it("should rollback transaction if insert fails", async () => {
  // force failure by violating schema (e.g. null amount)
  await expect(
    service.checkCategoryTableAndAddTransaction(
      "22222222-2222-2222-2222-222222222222",
      "debit",
      "Food",
      null, 
      // "11111111-1111-1111-1111-111111111111", // ❌ invalid, accountId is required
      "Lunch",
      null,
      "FOOD",
      new Date(),
      false
    )
  ).rejects.toThrow();

  const txns = await db("transactions");
  const outbox = await db("outbox_events");

  expect(txns.length).toBe(0);
  expect(outbox.length).toBe(0);
});

it("should create correct outbox event payload", async () => {
  const result = await service.checkCategoryTableAndAddTransaction(
    "22222222-2222-2222-2222-222222222222",
    "debit",
    "Food",
    100,
    "11111111-1111-1111-1111-111111111111",
    "Lunch",
    null,
    "FOOD",
    new Date(),
    false
  );

  const [event] = await db("outbox_events");

  expect(event.event_type).toBe("transaction.created");

  expect(event.payload).toMatchObject({
    eventType: "transaction.created",
    data: {
      transactionId: result.id,
      userId:"22222222-2222-2222-2222-222222222222",
      accountId:"11111111-1111-1111-1111-111111111111",
      amount: 100,
      type: "debit",
    },
  });
});


//Delete transaction emit event test
it("should soft delete transaction and emit event", async () => {
  const [txn] = await db("transactions")
    .insert({
      user_id: "22222222-2222-2222-2222-222222222222",
      account_id: "11111111-1111-1111-1111-111111111111",
      amount: 100,
      type: "debit",
    })
    .returning("*");

  const result = await service.deleteTransactionService(
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    txn.id,
    100,
    "debit"
  );

  expect(result.is_active).toBe(false);

  const events = await db("outbox_events");
  expect(events.length).toBe(1);
  expect(events[0].event_type).toBe("transaction.deleted");
});


//Update flow test:

it("should update transaction and emit event", async () => {
  const [txn] = await db("transactions")
    .insert({
      user_id: "22222222-2222-2222-2222-222222222222",
      account_id: "11111111-1111-1111-1111-111111111111",
      amount: 100,
      type: "debit",
    })
    .returning("*");

  const result = await service.updateTransactionService(
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    txn.id,
    { amount: 300 },
    txn
  );

  expect(result.amount).toBe("300.00");

  const events = await db("outbox_events");
  expect(events.length).toBe(1);
  expect(events[0].event_type).toBe("transaction.updated");
});