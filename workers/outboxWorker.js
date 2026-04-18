import { producer, TOPICS } from "../config/kafka.js";
import { knexDB } from "../config/knex.js";



const BATCH_SIZE = 10;
const POLL_INTERVAL = 3000; // 3 seconds

let isRunning = false;

/**
 * 🚀 Start Outbox Worker
 */
export const startOutboxWorker = async () => {
    if (isRunning) return;

    await producer.connect();
    isRunning = true;

    console.log("🚀 Outbox Worker Started...");

    while (true) {
        try {
            await processBatch();
        } catch (err) {
            console.error("❌ Outbox Worker Error:", err.message);
        }
        await sleep(POLL_INTERVAL);
    }
};

/**
 * 📦 Process batch of outbox events
 */
const processBatch = async () => {
    const trx = await knexDB.transaction();

    try {
        // 🔒 Lock rows to avoid duplicate processing
        const events = await trx("outbox_events")
            .where({ status: "PENDING" })
            .limit(BATCH_SIZE)
            .forUpdate()
            .skipLocked();

        if (events.length === 0) {
            await trx.commit();
            return;
        }

        console.log('Value of events:', events);

        console.log(`📦 Processing ${events.length} outbox events`);

        for (const event of events) {
            try {
                console.log('-------Inside event of events--------');

                const payload = event.payload;
                console.log("Value of event:", event)
                console.log('value of payload:', payload);

                const kafkaMessage = {
                    key: event.payload.data.userId || uuidv4(),
                    value: JSON.stringify({
                        eventId: event.id, // 🔥 use outbox ID as eventId
                        eventType: event.payload.eventType,
                        timestamp: new Date().toISOString(),
                        data: event.payload.data,
                    }),
                    headers: {
                        retryCount: "0",
                    },
                };


                await producer.send({
                    topic: TOPICS.MAIN,
                    messages: [kafkaMessage],
                    acks: -1,
                });

                console.log('✅ Kafka message sent successfully');

                // ✅ Mark as SENT
                await trx("outbox_events")
                    .where({ id: event.id })
                    .update({ status: "SENT" });

            } catch (err) {
                console.error("❌ Failed to publish event:", err.message);
;
                // ❗ DO NOT mark SENT → will retry next cycle
            }
        }

        await trx.commit();

    } catch (err) {
        await trx.rollback();
        throw err;
    }
};

/**
 * ⏱️ Sleep helper
 */
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

