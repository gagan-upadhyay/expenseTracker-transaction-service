import { jest } from "@jest/globals";
import { startKafka, stopKafka } from "../test-utils/kafkaTest.js";
import { startTestDB, stopTestDB } from "../test-utils/testDB.js";

jest.setTimeout(90000);

let db;
let producer;
let consumer;
let processOutboxBatch;

describe("Kafka Integration (Outbox Flow)", () => {
  beforeAll(async () => {
    db = await startTestDB();

    const kafkaSetup = await startKafka();
    producer = kafkaSetup.producer;
    consumer = kafkaSetup.consumer;

    // ✅ MOCK BEFORE IMPORT (IMPORTANT)
    jest.unstable_mockModule("../config/kafka.js", () => ({
      producer,
    }));

    const module = await import("../workers/outboxPublisher.js");
    processOutboxBatch = module.processOutboxBatch;

    // seed account
    await db("accounts").insert({
      id: "22222222-2222-2222-2222-222222222222",
      user_id: "11111111-1111-1111-1111-111111111111",
      currency_code: "INR",
    });
  });

  afterAll(async () => {
    await stopKafka();
    await stopTestDB();
  });

  beforeEach(async () => {
    await db("outbox_events").del();
  });

  it("should publish and consume transaction.created event (OUTBOX FLOW)", async () => {
    const topic = "transactions.v1";
    const received = [];

    await consumer.subscribe({ topic, fromBeginning: true });

    const messagePromise = new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ message }) => {
          const value = JSON.parse(message.value.toString());
          received.push(value);
          resolve();
        },
      });
    });

    // wait for consumer readiness
    await new Promise((r) => setTimeout(r, 2000));

    await db("outbox_events").insert({
      event_type: "transaction.created",
      payload: JSON.stringify({
        userId: "11111111-1111-1111-1111-111111111111",
        transactionId: "tx-123",
        amount: 100,
      }),
      status: "PENDING",
      next_retry_at: new Date(),
    });

    await processOutboxBatch(db, producer);

    await messagePromise;

    expect(received.length).toBeGreaterThan(0);
    expect(received[0].eventType).toBe("transaction.created");

    const events = await db("outbox_events");
    expect(events[0].status).toBe("SENT");
  });
});