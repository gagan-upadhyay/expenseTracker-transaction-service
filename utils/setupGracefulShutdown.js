import { logger } from "../config/logger.js"

export function setupGracefulShutDown(server, cleanupFns=[]){
    const shutdown = async()=>{
        logger.info('Graceful shutdown initiated');
        for(const fn of cleanupFns){
            try{
                await fn();
            }catch(err){
                logger.error('cleanup function failed', err);

            }
        }
        server.close(()=>{
            logger.info('HTTP server is closed');
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

export default setupGracefulShutDown;