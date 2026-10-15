"use strict";

const express = require("express");
const request = require("supertest");

jest.mock("../services/priceOracle", () => ({
  getUsdcToXlmRate: jest.fn(),
  FALLBACK_XLM_PER_USDC: 8,
}));

jest.mock("../services/cache", () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

const { getUsdcToXlmRate, FALLBACK_XLM_PER_USDC } = require("../services/priceOracle");
const cache = require("../services/cache");
const priceRouter = require("./price");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/price", priceRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  });
  return app;
}

describe("Price router unit tests", () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  it("returns price rate and cached flag on GET /api/price/xlm-usdc", async () => {
    cache.get.mockReturnValue(8.5);
    getUsdcToXlmRate.mockResolvedValue(8.5);

    const res = await request(app).get("/api/price/xlm-usdc").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.xlmPerUsdc).toBe(8.5);
    expect(res.body.data.usdPerXlm).toBeCloseTo(1 / 8.5, 5);
    expect(res.body.data.cached).toBe(true);
    expect(res.body.data.fallback).toBe(false);
  });

  it("indicates fallback when rate matches FALLBACK_XLM_PER_USDC", async () => {
    cache.get.mockReturnValue(null);
    getUsdcToXlmRate.mockResolvedValue(FALLBACK_XLM_PER_USDC);

    const res = await request(app).get("/api/price/xlm-usdc").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.xlmPerUsdc).toBe(8);
    expect(res.body.data.cached).toBe(false);
    expect(res.body.data.fallback).toBe(true);
  });

  it("returns price on GET /api/price as well", async () => {
    cache.get.mockReturnValue(null);
    getUsdcToXlmRate.mockResolvedValue(10);

    const res = await request(app).get("/api/price").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.xlmPerUsdc).toBe(10);
    expect(res.body.data.usdPerXlm).toBe(0.1);
  });

  it("forwards error to error middleware when oracle fails", async () => {
    cache.get.mockReturnValue(null);
    getUsdcToXlmRate.mockRejectedValue(new Error("Oracle failure"));

    const res = await request(app).get("/api/price").expect(500);

    expect(res.body.error).toBe("Oracle failure");
  });
});
