import { faker } from "@faker-js/faker";
import { db, pool } from "../../config/db.js";
import { findByUserId, insert } from "../models/Transactions.js";
import { logger } from "../../config/logger.js";
import generateFakeTransactions from "../../utils/fakerTransactions.js";


//fetch transaction of a user
export async function getTransactionsByUser(userId, page, limit){
    return await findByUserId(userId, page, limit);
}

//generate synthetic transaction for all user accounts

export async function generateTransactions(userId, count=10){
    const accountQuery=`
    SELECT id FROM accounts WHERE user_id=$1
    `;
    const {rows:accounts} = await db(accountQuery, [userId]);
    const inserted=[];
    for(const account of accounts){
        for(let i=0;i<count;i++){
            const tx = generateFakeTransactions(account.id);
            const result = await insert(tx);
            inserted.push(result);
        }
    }
    return inserted;
}

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
        logger.error("Error wile creating transaction table:", err);
    }
}