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
import { knexDB } from './config/knex.js';

const app = express();
const corsOptions={
    origin:['http://192.168.0.126:3000','http://localhost:3000', 'https://expense-tracker-self-rho-12.vercel.app/', 'http://192.168.0.126:3000'],
    credentials:true,
};
// const corsOptions = {
//   origin: function (origin, callback) {
//     const allowedOrigins = [
//       'http://localhost:3000', 'https://expense-tracker-6afeksr0j-gagans-projects-00cb1a77.vercel.app', , 'http://172.168.0.148:3000', 'https://expense-tracker-self-rho-12.vercel.app'
//     ];
//     const ipRegex = /^http:\/\/192\.168\.0\.\d{1,3}:3000$/;
//     if (!origin || allowedOrigins.includes(origin) || ipRegex.test(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true
// };

app.use(cors(corsOptions));
app.use(express.json());
app.use(compression());
app.use(cookieParser());

if(process.env.NODE_ENV==='development'){
    app.use(morgan('dev'));
}

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

if(process.env.NODE_ENV!=='test'){
    const server = app.listen(process.env.PORT, ()=>{
        console.log(`Transaction-service is running at port ${process.env.PORT}`);
        logger.info(`Transaction-service is running at port ${process.env.PORT}`);
    });

    setupGracefulShutDown(server, [
        async()=>await pool.end(),
        async()=> await knexDB.destroy()
    ])
}



export default app;