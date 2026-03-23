// Set test environment
import { jest } from '@jest/globals';
process.env.NODE_ENV = "test";

// Silence test logs
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();