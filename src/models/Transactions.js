import {db} from "../../config/db.js";

export async function insert(transaction){
    const query = `INSERT INTO transactions (account_id, category, amount, timestamp, merchant)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
    `;
    const values =[
        transaction.account_id,
        transaction.category,
        transaction.amount,
        transaction.timestamp,
        transaction.merchant,
    ];
    const {rows}= await db(query, values);
    return rows[0];
}

export async function findByUserId(user_id, page, limit, accountId, from, to, type, category){
    const offset = (page-1)*limit;
    const query = `
        SELECT t.* FROM transactions t
        JOIN accounts a ON t.account_id=a.id
        WHERE a.user_id=$1
        ORDER BY t.occurred_at DESC
        LIMIT $2 OFFSET $3
    `
    const values = [
        user_id, limit, offset
    ];
    const {rows} = await db(query, values);
    return rows;
}