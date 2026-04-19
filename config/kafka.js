import {Kafka, 
  Partitioners
} from "kafkajs";

const connectionString = process.env.KAFKA_CONNECTION_STRING;
console.log("value of connection String:",connectionString);
const kafka = new Kafka({
    clientId:"transaction-service",
    brokers:['expenseTrackerBackend.servicebus.windows.net:9093'],
    ssl:true,
    sasl:{
        mechanism:'plain',
        username:"$ConnectionString",
        password:process.env.KAFKA_CONNECTION_STRING,
    },
    connectionTimeout: 45000,
    authenticationTimeout: 10000, 
    requestTimeout: 60000,
    enforceRequestTimeout: true,
    retry: {
    retries: Number.MAX_SAFE_INTEGER,
    initialRetryTime: 100,
  },
  
});

export const producer = kafka.producer({
    createPartitioner:Partitioners.LegacyPartitioner,
    allowAutoTopicCreation:false,
    idempotent:true,
    maxInFlightRequests:1,
});

export const createConsumer = (groupId, options = {}) =>
  kafka.consumer({
    groupId,
    sessionTimeout: options.sessionTimeout || 30000,
    heartbeatInterval: options.heartbeatInterval || 3000,
  });

export const TOPICS = {
    MAIN: "transactions.v1",
    RETRY: "transactions.retry",
    DLQ: "transactions.dlq",
};