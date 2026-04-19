import { jest } from "@jest/globals";

/* ================= MOCK KNEX ================= */

const mockTransaction = jest.fn();

jest.unstable_mockModule("../config/knex.js", () => ({
  knexDB: {
    transaction: mockTransaction,
  },
}));

const service = await import("../src/service/transactionService.js");

/* ================= HELPER: CREATE TRX MOCK ================= */

const createMockTrx = ({
  categoryExists = true,
  shouldFail = false,
} = {}) => {
  const trx = jest.fn((table) => {
    if (shouldFail) {
      throw new Error("DB error");
    }

    if (table === "transaction_categories") {
      return {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(
          categoryExists ? { category_id: "cat123" } : null
        ),
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([
          { category_id: "newCat" },
        ]),
      };
    }

    if (table === "transactions") {
      return {
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: "txn1" }]),
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
      };
    }

    if (table === "outbox_events") {
      return {
        insert: jest.fn().mockResolvedValue([]),
      };
    }

    return {};
  });

  trx.commit = jest.fn();
  trx.rollback = jest.fn();
  trx.fn = { now: jest.fn() };

  return trx;
};

/* ================= TESTS ================= */

describe("Transaction Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ================= CREATE ================= */

  it("should insert transaction with existing category", async () => {
    const trx = createMockTrx({ categoryExists: true });
    mockTransaction.mockResolvedValue(trx);

    const result = await service.checkCategoryTableAndAddTransaction(
      "user1",
      "debit",
      "Food",
      100,
      "acc1",
      "Lunch",
      null,
      "FOOD",
      new Date(),
      false
    );

    expect(result.id).toBe("txn1");
    expect(trx.commit).toHaveBeenCalled();
  });

  it("should create new category if not exists", async () => {
    const trx = createMockTrx({ categoryExists: false });
    mockTransaction.mockResolvedValue(trx);

    const result = await service.checkCategoryTableAndAddTransaction(
      "user1",
      "credit",
      "Salary",
      5000,
      "acc1",
      "Monthly salary",
      null,
      "SALARY",
      new Date(),
      false
    );

    expect(result.id).toBe("txn1");
    expect(trx.commit).toHaveBeenCalled();
  });

  it("should rollback on error", async () => {
    const trx = createMockTrx({ shouldFail: true });
    mockTransaction.mockResolvedValue(trx);

    await expect(
      service.checkCategoryTableAndAddTransaction(
        "user1",
        "debit",
        "Food",
        100,
        "acc1",
        "Lunch",
        null,
        "FOOD",
        new Date(),
        false
      )
    ).rejects.toThrow("DB error");

    expect(trx.rollback).toHaveBeenCalled();
  });

  /* ================= DELETE ================= */

  it("should soft delete transaction and create outbox event", async () => {
    const trx = createMockTrx();
    mockTransaction.mockResolvedValue(trx);

    const result = await service.deleteTransactionService(
      "acc1",
      "user1",
      "txn1",
      100,
      "debit"
    );

    expect(result.id).toBe("txn1");
    expect(trx.commit).toHaveBeenCalled();
  });

  /* ================= BUG TEST ================= */

  it("should insert outbox event within transaction (BUG TEST)", async () => {
    const insertSpy = jest.fn();

    const trx = jest.fn((table) => {
      if (table === "transaction_categories") {
        return {
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ category_id: "cat123" }),
        };
      }

      if (table === "transactions") {
        return {
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: "txn1" }]),
        };
      }

      if (table === "outbox_events") {
        return {
          insert: insertSpy,
        };
      }

      return {};
    });

    trx.commit = jest.fn();

    mockTransaction.mockResolvedValue(trx);

    await service.checkCategoryTableAndAddTransaction(
      "user1",
      "debit",
      "Food",
      100,
      "acc1",
      "Lunch",
      null,
      "FOOD",
      new Date(),
      false
    );

    // ❌ This should FAIL until you fix service
    expect(insertSpy).toHaveBeenCalled();
  });

  /* ================= UPDATE ================= */

  it("should update transaction and create outbox event", async () => {
    const trx = createMockTrx();
    mockTransaction.mockResolvedValue(trx);

    const existing = { amount: 100, type: "debit" };

    const result = await service.updateTransactionService(
      "acc1",
      "user1",
      "txn1",
      { amount: 200 },
      existing
    );

    expect(result.id).toBe("txn1");
    expect(trx.commit).toHaveBeenCalled();
  });
});