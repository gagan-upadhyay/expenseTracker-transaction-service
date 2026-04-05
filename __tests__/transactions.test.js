// Silence dotenvx warnings
process.env.DOTENVX_SILENT = "true";

import { jest } from "@jest/globals";

// =======================
// 1. ALL REQUIRED MOCKS
// =======================

// Mock verifySession
jest.unstable_mockModule("../middleware/verifySession.js", () => ({
  verifySession: (req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  }
}));

// Mock DB
jest.unstable_mockModule("../config/db.js", () => ({
  db: jest.fn(async () => ({ rows: [] })),
  pgQuery: jest.fn(async () => ({ rows: [] })),
  pool: { end: jest.fn() },
  pgConnectTest: jest.fn(async ()=>{
    console.log("mocked DB connection success");
    return true;
  })
}));

// Mock Redis
jest.unstable_mockModule("../utils/redisConnection.js", () => ({
  getRedisClient: async () => ({
    connect: async () => {},
    disconnect: async () => {},
    on: () => {},
    set: jest.fn(),
    get: jest.fn(),
    expire: jest.fn()
  })
}));

// Mock Knex
jest.unstable_mockModule("../config/knex.js", () => ({
  knexDB: jest.fn(() => ({
    join: () => ({
      join: () => ({
        join: () => ({
          where: () => ({
            andWhere: () => ({
              select: () => [
                { id: "tx1", amount: 100, category: "Food" }
              ]
            })
          })
        })
      })
    })
  }))
}));

// CRITICAL: Mock helmetConfig with the CORRECT path
jest.unstable_mockModule("../config/helmet.config.js", () => ({
  helmetConfig: (req, res, next) => next()
}));

// Mock logger
jest.unstable_mockModule("../config/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

// Mock graceful shutdown
// jest.unstable_mockModule("../utils/setupGracefulShutDown.js", () => ({
//   default: jest.fn()
// }));

// Mock compression, cookie-parser, morgan
jest.unstable_mockModule("compression", () => ({
  default: () => (req, res, next) => next()
}));
jest.unstable_mockModule("cookie-parser", () => ({
  default: () => (req, res, next) => next()
}));
jest.unstable_mockModule("morgan", () => ({
  default: () => (req, res, next) => next()
}));

// Mock Transaction Service
jest.unstable_mockModule("../src/service/transactionService.js", () => ({
  knexSelect: jest.fn(async () => [
    { id: "tx1", amount: 100 }
  ]),
  getTransactionsByUser: jest.fn(async () => [
    { id: "tx1", amount: 100 }
  ]),
  checkCategoryTableAndAddTransaction: jest.fn(async () => ({
    id: "new-tx"
  })),
  getchOneTransactionService: jest.fn(async () => [
    { id: "tx1", amount: 100 }
  ])
}));

// =======================
// 2. IMPORT APP NOW
// =======================
const { app } = await import("../index.js");
import request from "supertest";
import { pgConnectTest } from "../config/db.js";

// =======================
// 3. TEST SUITE
// =======================
describe("Transaction Service API", () => {

  it("GET /api/v1/transactions returns list", async () => {
    const res = await request(app).get("/api/v1/transactions");
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe("tx1");
  });

  it("POST /api/v1/transactions creates transaction", async () => {
    const res = await request(app)
      .post("/api/v1/transactions?accountId=acc-1")
      .send({
        amount: 200,
        type: "credit",
        description: "Salary",
        CategoryCode: "SAL",
        displayName: "Income",
        reference: "REF123",
        occurredAt: "2026-03-20"
      });

    expect(res.status).toBe(201);
  });

  it("GET /api/v1/transactions/:id returns one transaction", async () => {
    const res = await request(app)
      .get("/api/v1/transactions/tx1?accountId=acc-1");

    expect(res.status).toBe(200);
    expect(res.body.result[0].id).toBe("tx1");
  });

  // it("PATCH returns 500 (not implemented)", async () => {
  //   const res = await request(app).patch("/api/v1/transactions/tx1");
  //   expect(res.status).toBe(500);
  // });

  // it("DELETE returns 500 (not implemented)", async () => {
  //   const res = await request(app).delete("/api/v1/transactions/tx1");
  //   expect(res.status).toBe(500);
  // });

});