import '@dotenvx/dotenvx/config';
import { startOutboxWorker } from "./outboxWorker.js";

startOutboxWorker().catch(err => {
    console.error("❌ Worker crashed:", err);
    process.exit(1);
});