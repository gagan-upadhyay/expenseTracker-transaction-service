import { logger } from "../../config/logger.js";
import { deleteFromAzure, generateReadSAS, generateUploadSAS } from "../../utils/azureblob.js";
import { 
    checkCategoryTableAndAddTransaction,
    deleteTransactionService,
    getchOneTransactionService, 
    // getTransactionsByUser, 
    knexSelect, 
    updateTransactionService} from "../service/transactionService.js";

import { getExchangeRates, convertValue } from '../../utils/currencyUtility.js';

export const getLogContext =(req, context)=> ({
    context: context, 
    route:req.OriginalUrl,
    method:req.method,
    status:req.statusCode,
    userId: req.user?.id, 
    accountId: req.params.id, 
    requestId: req.headers['x-request-id']
});

const accountURL = process.env.ACCOUNT_URL;

export const GenerateUploadURL = async (req, res) => {
    const logDetails = getLogContext(req, "TransactionService:generateUploadURLTXN-Receipt");
  try {
    const userId = req.user.id;
    const { fileType } = req.body;

    const fileName = `users/${userId}/profile-${Date.now()}`;

    const { uploadUrl, blobName } = await generateUploadSAS(fileName, fileType);
    logger.info('Generated upload URL', logDetails);
    res.json({
      success: true,
      uploadUrl,
      blobName
    });

  } catch (err) {
    logger.error('Critical error: generateUploadURL', {...logDetails, error:err.message, stack:err.stack});
    res.status(500).json({ success: false, error: "Failed t o generate SAS" });
  }
};

// ----------------------------------
// transactionService/controllers/statsController.js


export async function getSpendingBreakdown(req, res) {
    try {
        const { userId } = req.user;
        const { base_currency } = req.query;

        // 1. Fetch transactions for the current month
        const transactions = await knexDB('transactions as t')
            .join('accounts as a', 't.account_id', 'a.id')
            .where('t.user_id', userId)
            .andWhere('t.type', 'debit')
            .andWhere('t.is_active', true)
            .select('t.amount', 't.category_id', 'a.currency_code');

        const rates = await getExchangeRates();
        const breakdown = {};

        // 2. Aggregate and convert
        transactions.forEach(t => {
            const convertedAmount = convertValue(Number(t.amount), t.currency_code, base_currency, rates);
            const cat = t.category_id || "Uncategorized";
            
            breakdown[cat] = (breakdown[cat] || 0) + convertedAmount;
        });

        // 3. Format for Charting libraries (Array of {name, value})
        const chartData = Object.keys(breakdown).map(cat => ({
            name: cat,
            value: Number(breakdown[cat].toFixed(2))
        }));

        res.json({ success: true, data: chartData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}


// ------------------------

export async function getTransactions(req, res) {
    const logDetails = getLogContext(req, "transactionService:getTransactions")
    try{
        // with filters: ?accountId=&from=&to=&type=&categoryId=&limit=&cursor=
        const userId=req.user.id;
        const {accountId, from, to, type, category} = req.query;

        console.log(`------------Value of type:${type}, accountId:${accountId}, from:${from}, to:${to}, category:${category}----------`);

        const knexResult = await knexSelect(userId, {accountId, from, to, type, category});
        // console.log('value of knexresult:', knexResult);

        const transactionsWithReceipt= knexResult.map((transaction)=>transaction.reference!==null? {...transaction, reference:generateReadSAS(transaction.reference)}:{...transaction, reference:null});
        console.log("Value of result", transactionsWithReceipt);

        logger.info("Seccessfully fetched transactions", logDetails);
        return res.status(200).json(transactionsWithReceipt);
    }catch(err){
        logger.error('Critical error in getTransaction', {...logDetails, error:err.message, stack:err.stack});
        console.error('Error fetching transactions:', err);
        return res.status(500).json({error:'Failed to fetch transactions'});
    }
}

export async function addTransactionController(req, res){
    const logDetails = getLogContext(req, "TransactionService:addTransaction");
    try{
        const userId = req.user.id;
        const { amount, type, displayname, description, reference, occurredat, categorycode, accountId, isPayable} = req.body;
        //note: Date order is yyyy-mm-dd in db

        console.log('Value of accountId, amount, type, description, reference, occuredat, categorycode, displayName:\n', accountId, amount, type, description, reference, categorycode, displayname);

        //validations:
        const isEmpty=(val)=>val===undefined||val===null||(typeof val==="string" &&val.trim()==="");

        if(
            isEmpty(accountId) ||
            isEmpty(amount) ||
            isEmpty(type)||
            isEmpty(categorycode)||
            isEmpty(displayname)
        ){
            logger.warn('Missing valid fields', logDetails);
            return res.status(400).json({success:false, message:'Missing required fields'});
        }
        if(reference && typeof reference!=="string"){
            logger.warn('Invalid transaction receipt format', logDetails);
            return res.status(400).json({success:false, error:"Invalid picture format"});
        }
        const saveTransaction = await checkCategoryTableAndAddTransaction( userId, type, displayname, amount, accountId, description, reference,  categorycode, occurredat, isPayable);

        if(saveTransaction){
            const adjustment = type==='debit'?-amount:amount;
            const headers = {
                'Content-Type': 'application/json',
            };

            if (req.headers.cookie) {
                headers['Cookie'] = req.headers.cookie;
            } else if (req.headers.authorization) {
                headers['Authorization'] = req.headers.authorization;
            }
            console.log('Inside savetransaction, making api call');
             try {
            // 2. Make the internal call
                const accountRes = await fetch(`${accountURL}/api/v1/accounts/${accountId}/adjust`, {
                    method: 'PATCH',
                    headers: headers, // Forwarding the identity!
                    body: JSON.stringify({ amount: adjustment, userId: userId, isDeletion:false })
                });
                console.log('value of accountRes:', accountRes);

                if (!accountRes.ok) {
                    logger.error("Account balance sync failed", { status: accountRes.status });
                    return res.status(500).json({error:'Sync failed try again', success:false});
                    // Note: Consider if you want to 'undo' the transaction if balance fails
                }

                logger.info('Transaction added and balance synced', logDetails);
                return res.status(201).json({ message: "Transaction saved successfully", saveTransaction });
                
            } catch (syncErr) {
                logger.error("Sync Error:", syncErr.message);
                // Fallback: Transaction saved but balance update failed
                return res.status(201).json({ message: "Saved (Sync Warning)", saveTransaction });
            }
            
            console.log('Value of saveTransaction from controller:\n', saveTransaction);      
            logger.info('Transaction added successfully', logDetails);
            return res.status(201).json({message:"Transaction saved successfully", saveTransaction});
        }else{
            return res.status(402).json({success:false, error:"Something went wrong while saving transaction"});
        }
      
    }catch(err){
        logger.error("Critical error: addTransaction",{...logDetails, error:err.message, stack:err.stack});
        return res.status(500).json({error:'Failed to add transactions'});
    }
}


export async function fetchOnetransactionController(req, res){
    const logDetails = getLogContext(req, "TransactionService:getOneTransaction");
    const{accountId, transactionId} = req.query;
    const userId = req.user.id;
    // const {transactionId} = req.params;
    console.log('value of req.query:', req.query);
    try{
        const result = await getchOneTransactionService(accountId, userId, transactionId);
        if(result.length===0) return res.status(200).json({success:true, message:'No Transaction recorded.'})
        console.log('Value of result from controller:', result);
        logger.info("Fetched Transaction successfully", logDetails);
        return res.status(200).json({success:true, message:'Fetched sucessfully', result});
    }catch(err){
        logger.error(`Error while fethcing transactionId:${transactionId}`, {...logDetails, error:err.message, stack:err.stack});
        return res.status(500).json({success:false, message:'Something went wrong, please try again later'});
    }
}

export async function deleteTransactionController(req, res) {
    const logDetails = getLogContext(req, "TransactionService:DeleteTransaction");
    try {
        // FIX: Extract from params, not query
        const { transactionId } = req.params; 
        const { userId, accountId } = req.body;
        
        const transactionExists = await getchOneTransactionService(accountId, userId, transactionId);

        if (transactionExists) {
            const result = await deleteTransactionService(accountId, userId, transactionId);
            if (result) {
                const adjustment = transactionExists.type==='debit'?transactionExists.amount:-transactionExists.amount;
                const headers = {
                    'Content-Type':'application/json',
                };
                if(req.headers.cookie){
                    headers['Cookie']=req.headers.cookie;
                }else if(req.headers.authorization){
                    headers['Authorization']=req.headers.authorization;
                }

                const body={
                    amount:adjustment,
                    userId:userId
                }
                
                try{
                    const controller = new AbortController();
                    const id = setTimeout(()=>controller.abort(),5000);
                    const accountRes = await fetch(`${accountURL}/api/v1/accounts/${accountId}/adjust`,{
                        method:'PATCH', 
                        headers:headers,
                        body:JSON.stringify({amount:adjustment, userId:userId, isDeletion:true}),
                        signal:controller.signal
                    });
                    clearTimeout(id)
                    if(!accountRes.ok){
                        logger.error("Account balance sync failed", { ...logDetails, status: accountRes.status});
                    }
                    logger.info('Transaction deleted successfully', { ...logDetails, transactionId });
                    return res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
                }catch(err){
                    logger.error('Sync Error:', err.message);
                    return res.status(200).json({message:"Deleted (Sync warning)"});
                }                
            } else {
                logger.info('Failed to delete transaction', { ...logDetails, transactionId });
                // FIX: Added the missing 's' to status
                return res.status(400).json({ success: false, message: "Issue while deleting transaction" });
            }
        }

        logger.warn("Transaction doesn't exist", logDetails);
        return res.status(404).json({ success: false, error: "Transaction doesn't exist" });

    } catch (err) {
        logger.error('Critical error while deleting transaction:', { ...logDetails, error: err.message });
        return res.status(500).json({ success: false, message: 'Something went wrong!' });
    }
}

export async function updateTransactionController(req, res) {
    const logDetails = getLogContext(req, "TransactionService:UpdateTransaction");
    try {
        const { transactionId } = req.params;
        const {  accountId, ...updateData } = req.body;
        const userId = req.user.id;
        
        
        const existing = await getchOneTransactionService(accountId, userId, transactionId);
        if (!existing) {
            return res.status(404).json({ success: false, error: "Not found" });
        }

        const dbUpdate = await updateTransactionService(accountId,userId, transactionId, updateData);

        if (dbUpdate) {
            // --- NEW: BALANCE ADJUSTMENT LOGIC ---
            // Only trigger if amount or type has changed
            if (updateData.amount !== undefined || updateData.type !== undefined) {
                const oldAmt = Number(existing.amount);
                const newAmt = Number(updateData.amount ?? existing.amount);
                const oldType = existing.type;
                const newType = updateData.type ?? existing.type;

                // Calculate the net impact on the account
                // We calculate: (New Impact) - (Old Impact)
                const oldImpact = oldType === 'debit' ? -oldAmt : oldAmt;
                const newImpact = newType === 'debit' ? -newAmt : newAmt;
                const adjustment = newImpact - oldImpact;

                if (adjustment !== 0) {
                    const headers = { 'Content-Type': 'application/json' };
                    if (req.headers.cookie) headers['Cookie'] = req.headers.cookie;
                    if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;

                    await fetch(`${accountURL}/api/v1/accounts/${accountId}/adjust`, {
                        method: 'PATCH',
                        headers,
                        // We send isDeletion: false because this is a modification, not a removal
                        body: JSON.stringify({ amount: adjustment, userId, isDeletion: false })
                    });
                }
            }
            // --- END OF BALANCE LOGIC ---

            // Existing Azure cleanup logic
            let azureDeleted = true;
            if (updateData.reference === null && existing.reference) {
                azureDeleted = await deleteFromAzure(existing.reference);
            }

            return res.status(200).json({ 
                success: true, 
                message: azureDeleted ? 'Updated successfully' : 'Updated (Azure Cleanup Failed)' 
            });
        }

        return res.status(400).json({ success: false, error: "Failed to update" });
    } catch (err) {
        logger.error('Critical issue while updating:', { ...logDetails, error: err.message });
        return res.status(500).json({ success: false, error: err.message });
    }
}

export async function addBulkTransactions(){
    
}
