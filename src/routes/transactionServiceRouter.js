import express from 'express';
import { getTransactions, syncBank } from '../controllers/transactionController.js';
import { authenticateJWT } from '../../middleware/authenticateJWT.js';



const transactionRouter = express.Router();

transactionRouter.get('/', authenticateJWT,getTransactions);
transactionRouter.post('/sync-bank', authenticateJWT,syncBank);
// transactionRouter.get('/createTable', createTranstable);

export default transactionRouter;