import { createClient } from "redis";

let redisClient;
let isConnected = false;

// Default implementation
async function getRedisClient() {
  if (!isConnected) {
    await connectWithRetry();
  }
  return redisClient;
}

async function connectWithRetry(retries = 15, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await redisClient.connect();
      console.log("✅ Redis connected");
      isConnected = true;
      break;
    } catch (error) {
      if (error.name === "ConnectionTimeoutError") {
        await new Promise((res) => setTimeout(res, delay * attempt));
      } else {
        console.error("❌ Redis failed:", error);
        break;
      }
    }
  }
}

// TEST MODE override
if (process.env.NODE_ENV === "test") {
  console.log("🔕 Redis disabled for tests");

  redisClient = {
    connect: async () => {},
    disconnect: async () => {},
    on: () => {},
  };

  getRedisClient = async () => redisClient;
} else {
  // real redis
  redisClient = createClient({
    username: 'default',
    password: 'Zs4NBtHYoJvvK8zf9WKOWzg2ShIzvMSB',
    socket: {
      host: 'redis-17239.c99.us-east-1-4.ec2.cloud.redislabs.com',
      port: 17239
    }
  });
}

export { getRedisClient };