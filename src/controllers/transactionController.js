import { logger } from "../../config/logger.js";
import {generateTransactions, getTransactionsByUser } from "../service/transactionService.js";

export async function getTransactions(req, res) {
    try{
        const userId=req.user.id;
        const {page=1, limit=20} = req.query;
        const transactions = await getTransactionsByUser(userId, page, limit);
        return res.status(200).json(transactions);
    }catch(err){
        console.error('Error fetching transactions:', err);
        return res.status(500).json({error:'Failed to fetch transactions'});
    }
}

export async function syncBank(req, res) {
    try{
        const userId=req.user.id;
        const count=req.body.count||10;
        const result = await generateTransactions(userId, count);
        logger.info(`transaction synced for userId ${userId}`);
        return res.status(201).json({message:'Transaction synced', inserted:result.length});
    }catch(err){
        console.error('Error syncing bank:', err);
        logger.error("Error in syncing bank:", err)
        return res.status(500).json({error:'Failed to sync bank transactions'});
    }
}

// export async function createTranstable(req, res){
//     try{
//         const result = await createTable();
//         if(result){
//             return res.status(201).json({message:'Table create successfully'});
//         }
//         return res.status(500).send("issue with table creation");
//     }catch(err){
//         return res.status(500).json({error:"Error creating table, error:\n", err});
//     }
// }