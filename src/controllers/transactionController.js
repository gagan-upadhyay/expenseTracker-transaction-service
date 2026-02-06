import { logger } from "../../config/logger.js";
import { 
    checkCategoryTableAndAddTransaction,
    // generateTransactions, 
    getchOneTransactionService, 
    getTransactionsByUser, 
    knexSelect } from "../service/transactionService.js";

export async function getTransactions(req, res) {
    try{
        // with filters: ?accountId=&from=&to=&type=&categoryId=&limit=&cursor=
        const userId=req.user.id;
        const {page, limit, accountId, from, to, type, category} = req.query;
        console.log('Value of page, limit, accountId, from, to, type, category from transactnoCOntroller:\n', page, limit, accountId, from, to, type, category);
        // const transactions = await getTransactionsByUser(userId, page, limit, accountId, from, to, type, category);

        const knexResult = await knexSelect(userId);
        console.log('Value of knexResult from controller:\n', knexResult);
        return res.status(200).json(knexResult);
    }catch(err){
        console.error('Error fetching transactions:', err);
        return res.status(500).json({error:'Failed to fetch transactions'});
    }
}

// export async function syncBank(req, res) {
//     try{
//         const userId=req.user.id;
//         const count=req.body.count||10;
//         const result = await generateTransactions(userId, count);
//         logger.info(`transaction synced for userId ${userId}`);
//         return res.status(201).json({message:'Transaction synced', inserted:result.length});
//     }catch(err){
//         console.error('Error syncing bank:', err);
//         logger.error("Error in syncing bank:", err)
//         return res.status(500).json({error:'Failed to sync bank transactions'});
//     }
// }

export async function addTransactionController(req, res){
    try{
        const userId = req.user.id;
        const {accountId} = req.query;
        const { amount, type, description, reference, CategoryCode, displayName, occurredAt} = req.body;
        //note: Date order is yyyy-mm-dd

        console.log('Value of accountId, amount, type, description, reference, occuredAt, CategoryCode, displayName:\n', accountId, amount, type, description, reference, CategoryCode, displayName);

        const saveTransaction = await checkCategoryTableAndAddTransaction( userId, type, displayName, amount, accountId, description, reference,  CategoryCode, occurredAt);
        console.log('Value of saveTransaction from controller:\n', saveTransaction);      
        
        return res.status(201).json({message:"Transaction saved successfully", saveTransaction});
        
    }catch(err){
        // console.error('Error syncing bank:', err);
        console.error('Error while adding transactions:', err)
        return res.status(500).json({error:'Failed to add transactions'});
    }
}

export async function updateTransactionController(req, res){
    try{
        const userId = req.user.id;
        // const 

    }catch(err){
        console.error('Error while updating transaction:', err)
        return res.status(500).json({error:'Failed to edit transactions'});
    }
}

export async function fetchOnetransactionController(req, res){
    const{accountId, transactionId} = req.query;
    const userId = req.user.id;
    // const {transactionId} = req.params;
    console.log('value of req.query:', req.query);
    try{
        const result = await getchOneTransactionService(accountId, userId, transactionId);
        if(result.length===0) return res.status(200).json({success:true, message:'No Transaction recorded.'})
        console.log('Value of result from controller:', result);
        return res.status(200).json({success:true, message:'Fetched sucessfully', result});
    }catch(err){
        logger.error(`Error while fethcing transactionId:${transactionId}, Error: ${err}`);
        return res.status(500).json({success:false, message:'Something went wrong, please try again later'});
    }
}

export async function deleteTransactionController(req, res){
    try{

    }catch(err){
        logger.error('Error while deleting transaction:', err);
        return res.status(500).json({success:false, message:'Something went wrong! Please try again later'});
    }
}