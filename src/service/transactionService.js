// import { faker } from "@faker-js/faker";
import { db, pool } from "../../config/db.js";
import { findByUserId, insert } from "../models/Transactions.js";
import { logger } from "../../config/logger.js";
import { knexDB } from "../../config/knex.js";
import crypto from 'crypto';


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
            't.category_id',
            't.is_payable',
        )
        .where('t.id', transactionId)
        .andWhere('t.user_id', userId)
        .andWhere('t.account_id', accountId)
        .andWhere('t.is_active', true)
        .first(); // Returns the object directly instead of an array
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
        logger.error("Error while creating transaction table:", err);
    }
}

export async function checkCategoryTableAndAddTransaction(
  userId,
  type,
  displayName,
  amount,
  accountId,
  description,
  newReference,
  categorycode,
  occurredat,
  isPayable
) {
  const trx = await knexDB.transaction();

  try {
    let categoryId;

    // ✅ check category
    const existingCategory = await trx("transaction_categories")
      .where({ code: categorycode })
      .first();

    if (existingCategory) {
      categoryId = existingCategory.category_id;
    } else {
      const [newCategory] = await trx("transaction_categories")
        .insert({ code: categorycode })
        .returning("*");

      categoryId = newCategory.category_id;
    }

    // ✅ insert transaction
    const [transaction] = await trx("transactions")
      .insert({
        user_id: userId,
        account_id: accountId,
        category_id: categoryId,
        amount,
        type,
        description,
        reference: newReference,
        occurred_at: occurredat,
        display_name: displayName,
        is_payable: isPayable,
      })
      .returning("*");

    // ✅ FULL EVENT PAYLOAD (IMPORTANT)
    const eventPayload = {
      eventId: crypto.randomUUID(),
      eventType: "transaction.created",
      timestamp: new Date().toISOString(),
      data: {
        transactionId: transaction.id,
        userId,
        accountId,
        amount,
        type,
        categorycode,
        occurredat,
        isPayable,
      },
    };

    // ✅ INSERT INTO OUTBOX (NO stringify)
    await trx("outbox_events").insert({
      event_type: "transaction.created",
      payload: eventPayload,
      status: "PENDING",
    });

    await trx.commit();

    return transaction;
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}


export async function deleteTransactionService(accountId, userId, transactionId, amount, type) {
    const trx = await knexDB.transaction();

    try {
        const result = await trx('transactions')
            .where({
                id: transactionId,
                user_id: userId,
                account_id: accountId
            })
            .update({
                is_active: false,
                deleted_at: trx.fn.now()
            })
            .returning('*');
            
            await trx("outbox_events").insert({
                event_type: "transaction.deleted",
                payload: {
                    eventId: crypto.randomUUID(),
                    eventType: "transaction.deleted",
                    timestamp: new Date().toISOString(),
                    data: {
                    transactionId,
                    userId,
                    accountId,
                    amount: amount,
                    type: type,
                    },
                },
                status: "PENDING",
            });


        await trx.commit();
        return result[0];

    } catch (err) {
        await trx.rollback();
        throw err;
    }
}


// transactionService.js
export async function updateTransactionService(
    accountId, 
    userId, 
    transactionId, 
    updatePayload,
    existing
) {
    const trx = await knexDB.transaction();
    try{
        const result = await trx('transactions')
        .where({
            id:transactionId,
            user_id:userId,
            account_id:accountId
        })
        .update({
            ...updatePayload,
            updated_at:trx.fn.now()
        })
        .returning('*');

        await trx("outbox_events").insert({
            event_type: "transaction.updated",
            payload: {
                eventId: crypto.randomUUID(),
                eventType: "transaction.updated",
                timestamp: new Date().toISOString(),
                data: {
                transactionId,
                userId,
                accountId,
                old: {
                    amount: existing.amount,
                    type: existing.type,
                },
                updated: {
                    amount: updatePayload.amount ?? existing.amount,
                    type: updatePayload.type ?? existing.type,
                },
                },
            },
            status: "PENDING",
        });
        await trx.commit();
        return result[0];

    }catch(err){
        await trx.rollback();
        throw err;
    }
}

export async function getCategoryId(category_code){
    const trx = await knexDB.transaction();
    try{
        const result = await trx('transaction_categories')
        .where({code:category_code})
        .select('transaction_categories.category_id')
        return result
    }catch(err){
        await trx.rollback();
        throw err;
    }
}