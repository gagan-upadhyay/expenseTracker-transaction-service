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

export async function knexSelect(userId){
    return knexDB('transactions')
    .join('users', 'transactions.user_id','=', 'users.id')
    .join('transaction_categories', 'transactions.category_id', '=', 'transaction_categories.category_id')
    .join('accounts', 'transactions.account_id', '=', 'accounts.id')
    .where('transactions.user_id', userId)
    .andWhere('transactions.is_active', true)
    .select('transactions.*', 'transaction_categories.display_name', 'accounts.currency_code')
}

export async function getchOneTransactionService(accountId, userId, transactionId) {
    return knexDB({t:'transactions'})
    .leftJoin({c:'transaction_categories'}, 'c.category_id', 't.category_id')
    .select(
        't.amount',
        't.type',
        {cat_display_name:'c.display_name'},
        't.description',
        't.reference',
        't.occurred_at',
        't.category_id'
    )
    .where('t.user_id', userId)
    .andWhere('t.account_id', accountId)
    .andWhere('t.id', transactionId)
    .andWhere('t.is_active', true)
    .orderBy([{column:'t.occurred_at', order:'desc'}, {column:'t.id', order:'desc'}]);
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


export async function checkCategoryTableAndAddTransaction( userId, type, displayName, amount, accountId, description, reference, CategoryCode, occurredAt) {
    try{
        //checking if there is a category already:
        let categoryId;
        const isCategory = await db(
            `
            SELECT category_id FROM transaction_categories WHERE code=$1
            `, [CategoryCode]);

            if(isCategory.rows.length!==0) categoryId = isCategory.rows[0].category_id;

            if(isCategory.rows.length===0){
                const query=`
                INSERT INTO transaction_categories(code, display_name)
                VALUES($1, $2)
                RETURNING category_id
                `;
                const insertCategoryCode = await db(query, [ CategoryCode, displayName]);
                categoryId = insertCategoryCode.rows[0].category_id;
            }
            console.log('Value of category_id:', categoryId);
//---------------------------transaction_category id generated----------------

            //adding transaction:
            const insertTransactionQuery = `
            INSERT INTO transactions(user_id, account_id, category_id, amount, type, description, reference, occurred_at)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `;
        console.log('Value of userId, accountId, categoryId, amount, type, description, reference, occuredAt from transactionServices:\n', userId, accountId, categoryId, amount, type, description, reference, occurredAt);
        const result = await db(insertTransactionQuery, [userId, accountId, categoryId, amount, type, description, reference, occurredAt]);

        console.log('Value of result from transactinoService while saving a transaction:\n', result);
        if(result.rows.length!==0){
            return result.rows[0];
        }
        return result;
            
    }catch(err){
        logger.error('Error while checking for category', err);
        throw new Error(err);
    }
}