/**
 * src/routes/price.js
 *
 * Exposes the live USDC → XLM mid-price from the Stellar DEX.
 *
 * GET /api/price/xlm-usdc
 *   Returns { success: true, data: { xlmPerUsdc: number, cached: boolean } }
 */
"use strict";

const express = require("express");
const router  = express.Router();
const { getUsdcToXlmRate, FALLBACK_XLM_PER_USDC } = require("../services/priceOracle");
const cache = require("../services/cache");

async function handlePrice(req, res, next) {
  try {
    const cached = cache.get("xlm_usdc_mid_price");
    const xlmPerUsdc = await getUsdcToXlmRate();
    const usdPerXlm = xlmPerUsdc > 0 ? 1 / xlmPerUsdc : null;
    res.json({
      success: true,
      data: {
        xlmPerUsdc,
        usdPerXlm,
        cached: cached !== null,
        fallback: xlmPerUsdc === FALLBACK_XLM_PER_USDC,
      },
    });
  } catch (e) {
    next(e);
  }
}

router.get("/xlm-usdc", handlePrice);
router.get("/", handlePrice);

module.exports = router;
