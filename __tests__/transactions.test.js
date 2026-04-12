import { jest } from "@jest/globals";

// 1. MOCK GLOBAL FETCH (For internal Account Service balance sync)
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true }),
  })
);

// 2. ALL MODULE MOCKS
// --- Mock verifySession ---
jest.unstable_mockModule("../middleware/verifySession.js", () => ({
  verifySession: (req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  }
}));

// --- Mock DB (Used in models and app startup) ---
jest.unstable_mockModule("../config/db.js", () => ({
  db: jest.fn(async (query) => {
    if (query.includes("SELECT category_id")) return { rows: [{ category_id: 101 }] };
    if (query.includes("INSERT INTO transactions")) return { rows: [{ id: "tx-123", amount: 100 }] };
    return { rows: [] };
  }),
  pool: { 
    query: jest.fn(), 
    end: jest.fn() 
  },
  pgConnectTest: jest.fn(async () => true) // Added to fix your SyntaxError
}));

// --- Mock Azure Utils (Merged all exports) ---
jest.unstable_mockModule("../utils/azureblob.js", () => ({
  generateReadSAS: jest.fn((ref) => `https://azure.com{ref}`),
  generateUploadSAS: jest.fn(async () => ({ 
    uploadUrl: "https://blob.url", 
    blobName: "mock-blob-123" 
  })),
  deleteFromAzure: jest.fn(async () => true)
}));

// --- Mock Knex (Handles Selects, Updates, and Delete) ---
jest.unstable_mockModule("../config/knex.js", () => {
  const mockKnex = jest.fn(() => mockKnex);
  const methods = [
    'join', 'leftJoin', 'where', 'andWhere', 'select', 
    'orderBy', 'from', 'first', 'update', 'insert', 'limit'
  ];
  
  methods.forEach(m => {
    mockKnex[m] = jest.fn(() => mockKnex);
  });
  
  // Custom .then logic to handle both Arrays (for list) and Objects (for .first())
  mockKnex.then = (resolve) => {
    const mockData = { 
      id: "tx-123", 
      amount: 100, 
      type: "debit", 
      reference: "ref-1", 
      category_code: "FOOD", 
      currency_code: "INR",
      occurred_at: "2024-01-01" 
    };
    // If the mock was called with 'first', return object, otherwise array
    resolve([mockData]); 
  };

  mockKnex.fn = { now: () => new Date().toISOString() };
  mockKnex.toString = () => "MOCK SQL QUERY";
  
  return { knexDB: mockKnex };
});

// --- Mock Logger ---
jest.unstable_mockModule("../config/logger.js", () => ({
  logger: { 
    info: jest.fn(), 
    error: jest.fn(), 
    warn: jest.fn() 
  }
}));

// --- Mock Helmet ---
jest.unstable_mockModule("../config/helmet.config.js", () => ({
  helmetConfig: (req, res, next) => next()
}));

// 3. IMPORT APP AFTER MOCKS ARE REGISTERED
const { app } = await import("../index.js");
import request from "supertest";

// 4. TEST SUITE
describe("Transaction Service API", () => {
  
  it("GET /api/v1/transactions - Should return list", async () => {
    const res = await request(app).get("/api/v1/transactions?type=debit");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("reference");
    }
  });

  it("POST /api/v1/transactions - Should create transaction", async () => {
    const res = await request(app)
      .post("/api/v1/transactions")
      .send({
        amount: 50,
        type: "debit",
        displayname: "Lunch",
        description: "Pizza",
        categorycode: "FOOD",
        accountId: "acc-123",
        occurredat: "2024-05-01"
      });

    if (res.status === 500) console.log("Debug POST Error:", res.body);
    expect(res.status).toBe(201);
    expect(res.body.saveTransaction.id).toBe("tx-123");
  });

  it("GET /api/v1/transactions/:id - Should return one transaction", async () => {
    const res = await request(app)
      .get("/api/v1/transactions/tx-123?accountId=acc-123&transactionId=tx-123");
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("PATCH /api/v1/transactions/:id - Should update transaction", async () => {
    const res = await request(app)
      .patch("/api/v1/transactions/tx-123")
      .send({
        userId: "test-user-id",
        accountId: "acc-123",
        amount: 75
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /api/v1/transactions/:id - Should delete transaction", async () => {
    const res = await request(app)
      .delete("/api/v1/transactions/tx-123")
      .send({
        userId: "test-user-id",
        accountId: "acc-123"
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Transaction deleted successfully");
  });
});
