import knex from "knex";

let knexInstance;

export function initKnex(connectionString) {
  knexInstance = knex({
    client: "pg",
    connection: connectionString,
  });
  return knexInstance;
}

export function getKnex() {
  if (!knexInstance) {
    throw new Error("Knex not initialized");
  }
  return knexInstance;
}