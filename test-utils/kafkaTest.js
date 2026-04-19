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
          KAFKA_HEAP_OPTS: "-Xmx512m -Xms256m",                      // ✅ Cap JVM memory
          KAFKA_JVM_PERFORMANCE_OPTS: "-client -XX:+UseG1GC",         // ✅ Lighter GC for CI
        })
        .withStartupTimeout(120000)                                    // ✅ Give 2 min to start
        .start();

      console.log(`[Kafka] Container started on attempt ${attempt}`);
      return c;
    } catch (err) {
      console.error(`[Kafka] Attempt ${attempt} failed: ${err.message}`);

      // ✅ Print container logs so we can see WHY it crashed in GHA
      if (err.container) {
        try {
          const logs = await err.container.logs();
          console.error("[Kafka] Container logs:\n", logs);
        } catch (logErr) {
          console.error("[Kafka] Could not fetch container logs:", logErr.message);
        }
      }

      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 8000));
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
