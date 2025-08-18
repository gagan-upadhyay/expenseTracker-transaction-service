import express from 'express';
import { getTransactions, syncBank } from '../controllers/transactionController.js';
import { verifySession } from '../../middleware/verifySession.js';



const transactionRouter = express.Router();

transactionRouter.get('/', verifySession,getTransactions);
transactionRouter.post('/sync-bank', verifySession,syncBank);
// transactionRouter.get('/createTable', createTranstable);

export default transactionRouter;