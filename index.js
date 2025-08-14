import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import '@dotenvx/dotenvx/config';
import cors from 'cors';
import morgan from 'morgan';
import transactionRouter from './src/routes/transactionServiceRouter.js';
import { logger } from './config/logger.js';


const app = express();
const corsOptions={
    origin:['http://localhost:3000', 'https://expense-tracker-self-rho-12.vercel.app/'],
    credentials:true,
};
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
    logger.info("Welcome route of transaction-service hit!");
    return res.status(200).send("Welcome to the transaction-service");
})

// app routes

app.use('/api/v1/transactions', transactionRouter);


app.listen(process.env.PORT, ()=>{
    console.log(`Transaction-service is running at port ${process.env.PORT}`);
    logger.info(`Transaction-service is running at port ${process.env.PORT}`);
})

