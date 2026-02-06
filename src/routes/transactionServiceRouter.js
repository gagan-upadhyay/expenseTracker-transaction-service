import express from 'express';
import { addTransactionController, deleteTransactionController, fetchOnetransactionController, getTransactions, updateTransactionController } from '../controllers/transactionController.js';
import { verifySession } from '../../middleware/verifySession.js';



const transactionRouter = express.Router();

//base: /api/v1/transactions

transactionRouter.get('/', verifySession,getTransactions);

transactionRouter.post('/', verifySession, addTransactionController);
transactionRouter.get('/:transactionId', verifySession, fetchOnetransactionController);
transactionRouter.patch('/:transactionId', verifySession, updateTransactionController);
transactionRouter.delete('/:transactionId', verifySession, deleteTransactionController);

// transactionRouter.post('/sync-bank', verifySession,syncBank);
// suggestions:
// GET    /transactions with filters: ?accountId=&from=&to=&type=&categoryId=&limit=&cursor=
// POST   /transactions (create)
// GET    /transactions/:transactionId
// PATCH  /transactions/:transactionId (partial updates; was /update-transaction)
// DELETE /transactions/:transactionId
// (Optional) Nested routes if you prefer explicit scoping:

// GET/POST /accounts/:accountId/transactions


// (Optional) Reporting:

// GET /transactions/summary?groupBy=category&period=month

// transactionRouter.get('/createTable', createTranstable);

export default transactionRouter;