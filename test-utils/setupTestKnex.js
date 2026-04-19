import { jest } from "@jest/globals";
import { getKnex } from "../config/testKnex.js";

jest.unstable_mockModule("../config/knex.js", () => ({
  knexDB: getKnex(),
}));