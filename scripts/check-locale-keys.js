#!/usr/bin/env node
/**
 * Verifies every locale in frontend/locales has exactly the same set of keys
 * as the reference locale (en.json). Exits 1 and prints a readable report of
 * missing / extra keys per locale when drift is detected.
 */
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "frontend", "locales");
const REFERENCE = "en.json";

function flatten(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out.push(key);
  }
  return out;
}

function load(file) {
  try {
    return new Set(flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), "utf8"))));
  } catch (err) {
    console.error(`ERROR: could not parse ${file}: ${err.message}`);
    process.exit(1);
  }
}

const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json")).sort();
if (!files.includes(REFERENCE)) {
  console.error(`ERROR: reference locale ${REFERENCE} not found in ${LOCALES_DIR}`);
  process.exit(1);
}

const ref = load(REFERENCE);
let failed = false;

for (const file of files) {
  if (file === REFERENCE) continue;
  const keys = load(file);
  const missing = [...ref].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !ref.has(k));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`OK    ${file} (${keys.size} keys)`);
    continue;
  }

  failed = true;
  console.error(`\nFAIL  ${file}: ${missing.length} missing, ${extra.length} extra (vs ${REFERENCE})`);
  missing.forEach((k) => console.error(`  - ${k}   (missing)`));
  extra.forEach((k) => console.error(`  + ${k}   (extra, not in ${REFERENCE})`));
}

if (failed) {
  console.error(
    "\nLocale keys are out of sync. Add the missing keys (a stub copy of the English text is fine) " +
      "or remove the extra ones in frontend/locales/."
  );
  process.exit(1);
}
console.log("\nAll locales are in sync.");
