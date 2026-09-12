import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when Vitest globals are on, and this suite
// imports its helpers explicitly instead.
afterEach(cleanup);

// The data provider now persists to localStorage, which jsdom keeps across
// tests in a file — clear it between tests so each starts from the mock seed
// rather than inheriting a previous test's mutations.
afterEach(() => localStorage.clear());
