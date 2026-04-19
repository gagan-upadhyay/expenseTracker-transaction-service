import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import '@dotenvx/dotenvx/config';
import cors from 'cors';
import morgan from 'morgan';
import transactionRouter from './src/routes/transactionServiceRouter.js';
import { logger } from './config/logger.js';
import setupGracefulShutDown from './utils/setupGracefulShutdown.js';
import { pool } from './config/db.js';
import { helmetConfig } from './config/helmet.config.js';
import { setupHealthCheckUp } from './utils/setupHealthCheckup.js';
import { producer } from './config/kafka.js';
import { consumer } from '../expenseTracker-account-service/config/kafka.js';

const app = express();
const corsOptions={
    origin:[
        'http://192.168.0.126:3000',
        'http://localhost:3000', 
        'https://expense-tracker-git-newbranch-gagans-projects-00cb1a77.vercel.app',
        'https://expense-tracker-self-rho-12.vercel.app',
        'https://expense-tracker-gagans-projects-00cb1a77.vercel.app'],
    credentials:true,
};

// if(process.env.NODE_ENV==='development') app.use(cors(corsOptions));
app.use(express.json());
app.use(compression());
app.use(cookieParser());
app.use(helmetConfig);

// if(process.env.NODE_ENV==='development'){
//     app.use(morgan('dev'));
// }

const morganFormat = process.env.NODE_ENV==='production'?'combined':'dev';

if(process.env.NODE_ENV==='development'){
    app.use(cors(corsOptions))
}else{
}

app.use(morgan(morganFormat,{
    stream:{
        write:(message)=>logger.info(message.trim(), {context:'HTTP'})
    }
}));

// healthcheckup
setupHealthCheckUp(app);

//kafka outbox publisher
// startOutboxPublisher();


//midddleware
//application level error catcher:
app.use((err, req, res, next)=>{
    console.error("Error at application level:\n",err.stack);
    logger.error("Caught application level error:\n", err);
    res.status(500).json({message:"Something went wrong! try again later."});
    next();
});

app.get('/', (req, res)=>{
    return res.status(200).json({message:"Welcome to the transaction-service"});
})

// app routes

app.use('/api/v1/transactions', transactionRouter);

let server = null 
if(process.env.NODE_ENV!=="test"){
     server = app.listen(process.env.PORT || 5002, "0.0.0.0", () => {
        logger.info(`Transaction service running on ${process.env.PORT}`);
        
    });

    setupGracefulShutDown(server, [
        async()=>await getRedisClient.disconnect(),
        async()=>await pool.end(),
        async()=> await producer.disconnect(),
        async()=> await consumer.disconnect(),
    ]);
}
export {app, server};