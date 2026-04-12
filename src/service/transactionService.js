// import { faker } from "@faker-js/faker";
import { db, pool } from "../../config/db.js";
import { findByUserId, insert } from "../models/Transactions.js";
import { logger } from "../../config/logger.js";
import generateFakeTransactions from "../../utils/fakerTransactions.js";
import { knexDB } from "../../config/knex.js";
// import {v4 as uuidv4} from 'uuid';


//fetch transaction of a user
export async function getTransactionsByUser(userId, page, limit, accountId, from, to, type, category){
    return await findByUserId(userId, page, limit, accountId, from, to, type, category);
}
    export async function knexSelect(userId, filters = {}) {
        // ✅ Fix: Corrected 'accountId' typo and ensured property names match req.query
        const { accountId, category, type, from, to } = filters;
        
        console.log("Filters received in knexSelect:", filters);

        let query = knexDB('transactions')
            .join('transaction_categories', 'transactions.category_id', '=', 'transaction_categories.category_id')
            .join('accounts', 'transactions.account_id', '=', 'accounts.id')
            .where('transactions.user_id', userId)
            .andWhere('transactions.is_active', true)
            .select(
                'transactions.*', 
                'transaction_categories.code as category_code',
                'accounts.currency_code'
            );

        // ✅ Account Filter
        if (accountId && accountId !== 'all') {
            query = query.where('transactions.account_id', accountId);
        }

        // ✅ Type Filter
        if (type && type !== 'all' && (type === 'debit' || type === 'credit')) {
            query = query.where('transactions.type', type);
        }

        // ✅ Category Filter (Ensure case sensitivity matches DB)
        if (category && category !== 'all') {
            query = query.where('transaction_categories.code', category.toUpperCase());
        }

        // ✅ Date Range
        if (from) {
            query = query.where('transactions.occurred_at', '>=', from);
        }
        if (to) {
            query = query.where('transactions.occurred_at', '<=', to);
        }

        const finalQuery = query.orderBy('transactions.occurred_at', 'desc');
        
        // Using .toString() gives you the actual SQL string for debugging
        console.log(`---------------------SQL query: ${finalQuery.toString()}---------------------`);
        
        return finalQuery;
    }



// export async function getchOneTransactionService(accountId, userId, transactionId) {
//     return knexDB({t:'transactions'})
//     .leftJoin({c:'transaction_categories'}, 'c.category_id', 't.category_id')
//     .select(
//         't.amount',
//         't.type',
//         {cat_display_name:'c.display_name'},
//         't.description',
//         't.reference',
//         't.occurred_at',
//         't.category_id'
//     )
//     .where('t.user_id', userId)
//     .andWhere('t.account_id', accountId)
//     .andWhere('t.id', transactionId)
//     .andWhere('t.is_active', true)
//     .orderBy([{column:'t.occurred_at', order:'desc'}, {column:'t.id', order:'desc'}]);
// }
export async function getchOneTransactionService(accountId, userId, transactionId) {
    return knexDB
        .from({ t: 'transactions' })
        .leftJoin({ c: 'transaction_categories' }, 'c.category_id', 't.category_id')
        .select(
            't.amount',
            't.type',
             't.display_name' ,
            't.description',
            't.reference',
            't.occurred_at',
            't.category_id'
        )
        .where('t.id', transactionId)
        .andWhere('t.user_id', userId)
        .andWhere('t.account_id', accountId)
        .andWhere('t.is_active', true)
        .first(); // Returns the object directly instead of an array
}


//generate synthetic transaction for all user accounts


// export async function generateTransactions(userId, count=10){
//     const accountQuery=`
//     SELECT id FROM accounts WHERE user_id=$1
//     `;
//     const {rows:accounts} = await db(accountQuery, [userId]);
//     const inserted=[];
//     for(const account of accounts){
//         for(let i=0;i<count;i++){
//             const tx = generateFakeTransactions(account.id);
//             const result = await insert(tx);
//             inserted.push(result);
//         }
//     }
//     return inserted;
// }

// creating transaction table:
export async function createTable() {
    try{
        const result = await pool.query(`
            CREATE TABLE transactions(
            id uuid PRIMARY KEY, 
            account_id uuid REFERENCES accounts(id),
            category VARCHAR(50),
            amount NUMERIC(12,2),
            timestamp TIMESTAMP,
            merchant VARCHAR(100)
            )
        `);
        return result;
    }catch(err){
        logger.error("Error while creating transaction table:", err);
    }
}


export async function checkCategoryTableAndAddTransaction( userId, type, displayName, amount, accountId, description, reference, categorycode, occurredat) {
    try{
        //checking if there is a category already:
        let categoryId;
        const isCategory = await db(
            `
            SELECT category_id FROM transaction_categories WHERE code=$1
            `, [categorycode]);

            if(isCategory.rows.length!==0) categoryId = isCategory.rows[0].category_id;

            if(isCategory.rows.length===0){
                const query=`
                INSERT INTO transaction_categories(code)
                VALUES($1)
                RETURNING category_id
                `;
                const insertCategoryCode = await db(query, [ categorycode]);
                categoryId = insertCategoryCode.rows[0].category_id;
            }
            console.log('Value of category_id:', categoryId);
//---------------------------transaction_category id generated----------------

            //adding transaction:
            const insertTransactionQuery = `
            INSERT INTO transactions(user_id, account_id, category_id, amount, type, description, reference, occurred_at, display_name)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            `;
        console.log('Value of userId, accountId, categoryId, amount, type, description, reference, occuredAt from transactionServices:\n', userId, accountId, categoryId, amount, type, description, reference, occurredat);
        const result = await db(insertTransactionQuery, [userId, accountId, categoryId, amount, type, description, reference, occurredat, displayName]);

        // console.log('Value of result from transactinoService while saving a transaction:\n', result);
        if(result.rows.length!==0){
            return result.rows[0];
        }
        return result;
            
    }catch(err){
        logger.error('Error while checking for category', err);
        throw new Error(err);
    }
}

export async function deleteTransactionService(accountId, userId, transactionId) {
    return knexDB('transactions')
        .where('id', transactionId)
        .andWhere('user_id', userId)
        .andWhere('account_id', accountId)
        .update({
            is_active: false,
            deleted_at: knexDB.fn.now() // Optional: track when it was deleted
        });
}


// transactionService.js
export async function updateTransactionService(accountId, userId, transactionId, updateData) {
    return knexDB('transactions')
        .where({ id: transactionId, user_id: userId, account_id: accountId })
        .update({
            ...updateData,
            updated_at: knexDB.fn.now()
        });
}
