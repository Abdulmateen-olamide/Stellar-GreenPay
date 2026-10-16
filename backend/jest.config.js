"use strict";
const path = require("path");
module.exports = {
  testRunner: "jest-circus/runner",
  // Allow Jest to transform uuid (pure ESM in v14+) while keeping node_modules
  // otherwise opaque. All other ESM packages that need CJS shims are handled
  // via moduleNameMapper below.
  // uuid, uint8array-extras, @exodus/bytes and @noble/* are pure-ESM packages
  // that Jest's CommonJS runtime cannot parse; transform them via babel
  // (see babel.config.js) instead of failing on `import` syntax.
  transformIgnorePatterns: [
    "/node_modules/(?!uuid|uint8array-extras|@exodus/bytes|@noble/hashes|@noble/ed25519)",
  ],
  moduleNameMapper: {
    // uuid v14 is pure ESM; map to a CJS shim so Jest can require() it.
    "^uuid$": path.resolve(__dirname, "__mocks__/uuid.js"),
    // expo-server-sdk v6+ is pure ESM; same treatment.
    "^expo-server-sdk$": path.resolve(__dirname, "__mocks__/expo-server-sdk.js"),
  },
};
