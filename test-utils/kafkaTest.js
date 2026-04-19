import { Kafka } from "kafkajs";
import { KafkaContainer } from "@testcontainers/kafka";

let container;
let kafka;
let producer;
let consumer;

export async function startKafka() {
  // ✅ Don't chain .withExposedPorts() or .waitingFor() —
  //    KafkaContainer handles port 9093 and readiness internally
  container = await new KafkaContainer().start();

  // ✅ CRITICAL: use mapped host + port via getBootstrapServers()
//   const bootstrapServers = container.getBootstrapServers();
 const host = container.getHost();
  const port = container.getMappedPort(9093);
  const bootstrapServers = `${host}:${port}`;


  kafka = new Kafka({
    clientId: "test-client",
    brokers: [bootstrapServers],
  });

  producer = kafka.producer();
  consumer = kafka.consumer({ groupId: "test-group" });

  await producer.connect();
  await consumer.connect();

  // ✅ Ensure topic exists
  const admin = kafka.admin();
  await admin.connect();

  await admin.createTopics({
    topics: [
      {
        topic: "transactions.v1",
        numPartitions: 1,
        replicationFactor: 1,
      },
    ],
  });

  await admin.disconnect();

  return {
    kafka,
    producer,
    consumer,
    bootstrapServers,
    container,
  };
}

export async function stopKafka() {
  if (consumer) await consumer.disconnect();
  if (producer) await producer.disconnect();
  if (container) await container.stop();
}
