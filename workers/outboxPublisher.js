// import { producer, TOPICS } from "../config/kafka.js";
// import { knexDB } from "../config/knex.js";


// const MAX_RETRIES = 5;

// function getNextRetryTime(retryCount) {
//   // exponential backoff: 5s, 15s, 45s, 2m, 5m
//   const delay = Math.min(300000, Math.pow(3, retryCount) * 5000);
//   return new Date(Date.now() + delay);
// }

// export const startOutboxPublisher = async () => {
//   await producer.connect();
//   console.log("🚀 Outbox Publisher Started...");

//   setInterval(async () => {
//     try {
//       const events = await knexDB("outbox_events")
//         .where("status", "PENDING")
//         .andWhere("next_retry_at", "<=", new Date())
//         .limit(10);

        

//       for (const event of events) {
//         try {
//           await producer.send({
//             topic: TOPICS.MAIN,
//             messages: [
//               {
//                 key: event.payload.data.userId,
//                 value: JSON.stringify(event.payload),
//               },
//             ],
//           });

//           // ✅ SUCCESS → mark SENT
//           await knexDB("outbox_events")
//             .where({ id: event.id })
//             .update({
//               status: "SENT",
//               last_error: null,
//             });

//           console.log("✅ Event sent:", event.id);

//         } catch (err) {
//           const retryCount = event.retry_count + 1;

//           console.error("❌ Publish failed:", event.id, err.message);

//           if (retryCount >= MAX_RETRIES) {
//             // 🔥 MOVE TO DLQ
//             await knexDB("dlq_events").insert({
//               original_event_id: event.id,
//               payload: event.payload,
//               error: err.message,
//             });

//             await knexDB("outbox_events")
//               .where({ id: event.id })
//               .update({
//                 retry_count:event.retry_count+1,
//                 last_error: err.message,
//               });

//             console.log("☠️ Moved to DLQ:", event.id);

//           } else {
//             // 🔁 RETRY LATER
//             await knexDB("outbox_events")
//               .where({ id: event.id })
//               .update({
//                 retry_count: retryCount,
//                 last_error: err.message,
//                 next_retry_at: getNextRetryTime(retryCount),
//               });
//           }
//         }
//       }
//     } catch (err) {
//       console.error("❌ Outbox polling error:", err);
//     }
//   }, 5000);
// };

import { producer } from "../config/kafka.js";
import { knexDB } from "../config/knex.js";

const MAX_RETRIES = 5;
const POLL_INTERVAL = 5000;

function getNextRetryTime(retryCount) {
  const delay = Math.min(300000, Math.pow(3, retryCount) * 5000);
  return new Date(Date.now() + delay);
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export const startOutboxPublisher = async () => {
  await producer.connect();
  console.log("🚀 Outbox Publisher Started...");

  while (true) {
    try {
      const events = await knexDB("outbox_events")
        .where("status", "PENDING")
        .whereNotNull("next_retry_at") // 🔥 FIX
        .andWhere("next_retry_at", "<=", new Date())
        .limit(10);

      for (const event of events) {
        try {
          const payload = JSON.parse(event.payload);

          await producer.send({
            topic: "transactions.v1",
            messages: [
              {
                key: payload.userId || "unknown",
                value: JSON.stringify({
                  eventId: event.id,
                  eventType: event.event_type,
                  timestamp: new Date().toISOString(),
                  data: payload,
                }),
              },
            ],
          });

          await knexDB("outbox_events")
            .where({ id: event.id })
            .update({
              status: "SENT",
              last_error: null,
            });

          console.log("✅ Event sent:", event.id);

        } catch (err) {
          const retryCount = (event.retry_count || 0) + 1;

          console.error("❌ Publish failed:", event.id, err.message);

          if (retryCount >= MAX_RETRIES) {
            await knexDB("dlq_events").insert({
              original_event_id: event.id,
              payload: event.payload,
              error: err.message,
            });

            await knexDB("outbox_events")
              .where({ id: event.id })
              .update({
                status: "FAILED", // 🔥 FIX
                retry_count: retryCount,
                last_error: err.message,
              });

            console.log("☠️ Moved to DLQ:", event.id);

          } else {
            await knexDB("outbox_events")
              .where({ id: event.id })
              .update({
                retry_count: retryCount,
                last_error: err.message,
                next_retry_at: getNextRetryTime(retryCount),
              });
          }
        }
      }

    } catch (err) {
      console.error("❌ Outbox polling error:", err);
    }

    await sleep(POLL_INTERVAL);
  }
};

// export async function processOutboxBatch(knexDB, producer) {
//   const events = await knexDB("outbox_events")
//     .where("status", "PENDING")
//     .whereNotNull("next_retry_at")
//     .andWhere("next_retry_at", "<=", new Date())
//     .limit(10);

//   for (const event of events) {
//     try {
//       const payload =
//         typeof event.payload === "string"
//           ? JSON.parse(event.payload)
//           : event.payload;

//       await producer.send({
//         topic: "transactions.v1",
//         messages: [
//           {
//             key: payload.userId || "unknown",
//             value: JSON.stringify({
//               eventId: event.id,
//               eventType: event.event_type,
//               timestamp: new Date().toISOString(),
//               data: payload,
//             }),
//           },
//         ],
//       });

//       await knexDB("outbox_events")
//         .where({ id: event.id })
//         .update({
//           status: "SENT",
//           last_error: null,
//         });

//     } catch (err) {
//       const retryCount = (event.retry_count || 0) + 1;

//       if (retryCount >= MAX_RETRIES) {
//         await knexDB("dlq_events").insert({
//           original_event_id: event.id,
//           payload: event.payload,
//           error: err.message,
//         });

//         await knexDB("outbox_events")
//           .where({ id: event.id })
//           .update({
//             status: "FAILED",
//             retry_count: retryCount,
//             last_error: err.message,
//           });

//       } else {
//         await knexDB("outbox_events")
//           .where({ id: event.id })
//           .update({
//             retry_count: retryCount,
//             last_error: err.message,
//             next_retry_at: getNextRetryTime(retryCount),
//           });
//       }
//     }
//   }
// }

// ✅ TESTABLE SINGLE RUN (NO WHILE LOOP)
export const processOutboxBatch = async (knexDB) => {
  const events = await knexDB("outbox_events")
    .where("status", "PENDING")
    .where("next_retry_at", "<=", new Date())
    .limit(10);

  for (const event of events) {
    const payload =
      typeof event.payload === "string"
        ? JSON.parse(event.payload)
        : event.payload;

    await producer.send({
      topic: "transactions.v1",
      messages: [
        {
          key: payload.userId || "unknown",
          value: JSON.stringify({
            eventId: event.id,
            eventType: event.event_type,
            timestamp: new Date().toISOString(),
            data: payload,
          }),
        },
      ],
    });

    await knexDB("outbox_events")
      .where({ id: event.id })
      .update({ status: "SENT" });
  }
};