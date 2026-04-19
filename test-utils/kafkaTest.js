import { Kafka } from "kafkajs";
import { KafkaContainer } from "@testcontainers/kafka";

let container;
let kafka;
let producer;
let consumer;

async function startKafkaWithRetry(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Kafka] Starting container, attempt ${attempt}/${retries}`);

      const c = await new KafkaContainer("confluentinc/cp-kafka:7.4.0")
        .withKraft()
        .withEnvironment({
          KAFKA_HEAP_OPTS: "-Xmx512m -Xms256m",
          KAFKA_JVM_PERFORMANCE_OPTS: "-client -XX:+UseG1GC",
        })
        .withStartupTimeout(120000)
        .start();

      console.log(`[Kafka] Container started on attempt ${attempt}`);
      return c;
    } catch (err) {
      console.error(`[Kafka] Attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 8000));
    }
  }
}

// ✅ Wait until Kafka broker is actually reachable before proceeding
async function waitForKafkaReady(kafka, retries = 20, intervalMs = 3000) {
  const admin = kafka.admin();
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`[Kafka] Checking broker readiness (${i}/${retries})...`);
      await admin.connect();
      await admin.listTopics();   // lightweight probe — succeeds only when broker is up
      await admin.disconnect();
      console.log(`[Kafka] Broker is ready`);
      return;
    } catch (err) {
      console.warn(`[Kafka] Not ready yet: ${err.message}`);
      try { await admin.disconnect(); } catch (_) {}
      if (i === retries) throw new Error(`Kafka broker not ready after ${retries} attempts`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

export async function startKafka() {
  container = await startKafkaWithRetry();

  const host = container.getHost();
  const port = container.getMappedPort(9093);
  const bootstrapServers = `${host}:${port}`;

  console.log(`[Kafka] Broker at ${bootstrapServers}`);

  kafka = new Kafka({
    clientId: "test-client",
    brokers: [bootstrapServers],
    connectionTimeout: 15000,
    requestTimeout: 30000,
    retry: {
      initialRetryTime: 1000,
      retries: 10,
    },
  });

  // ✅ Wait until broker is actually accepting connections before doing anything
  await waitForKafkaReady(kafka);

  producer = kafka.producer();
  consumer = kafka.consumer({ groupId: "test-group" });

  await producer.connect();
  await consumer.connect();

  const admin = kafka.admin();
  await admin.connect();

  await admin.createTopics({
    waitForLeaders: true,
    topics: [
      {
        topic: "transactions.v1",
        numPartitions: 1,
        replicationFactor: 1,
      },
    ],
  });

  await admin.disconnect();

  return { kafka, producer, consumer, bootstrapServers, container };
}

export async function stopKafka() {
  try { if (consumer) await consumer.disconnect(); } catch (_) {}
  try { if (producer) await producer.disconnect(); } catch (_) {}
  try { if (container) await container.stop(); } catch (_) {}
}
