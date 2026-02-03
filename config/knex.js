import knex from 'knex';

export const knexDB = knex({
    client:'pg',
    connection:process.env.POSTGRES_URL,
    pool:{min:0, max:10},
});
