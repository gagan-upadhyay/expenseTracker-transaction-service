import { createClient } from "redis";

let redisClient;

async function createRedisClient() {
  const client = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,

      // ✅ Auto reconnect strategy
      reconnectStrategy: (retries) => {
        console.log(`🔁 Redis reconnect attempt #${retries}`);
        return Math.min(retries * 100, 3000); // backoff
      },
    },
  });

  // ✅ MUST: Prevent crash
  client.on("error", (err) => {
    console.error("❌ Redis Error:", err);
  });

  client.on("connect", () => {
    console.log("🟡 Redis connecting...");
  });

  client.on("ready", () => {
    console.log("✅ Redis ready");
  });

  client.on("end", () => {
    console.log("🔴 Redis connection closed");
  });

  await client.connect();

  return client;
}

async function getRedisClient() {
  if (!redisClient) {
    redisClient = await createRedisClient();
  }
  return redisClient;
}

// TEST MODE
if (process.env.NODE_ENV === "test") {
  console.log("🔕 Redis disabled for tests");

  redisClient = {
    get: async () => null,
    set: async () => {},
    del: async () => {},
    connect: async () => {},
    disconnect: async () => {},
    on: () => {},
  };
}

export { getRedisClient };