# Stellar GreenPay Mobile App

React Native + Expo mobile app for Stellar GreenPay climate donation platform.

## Features

- Browse climate projects
- Donate using mobile Stellar wallet (Freighter deep links)
- View donation history and impact
- Real-time donation feed
- Push notifications for donation receipts

## Setup

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API URL and Stellar network settings
```

3. Run on device/simulator:
```bash
# iOS
npm run ios

# Android
npm run android

# Expo Go (for quick testing)
npm start
```

## Expo Go Preview

Preview builds are generated automatically on every push to `main` via EAS Build.

[![Open in Expo Go](https://img.shields.io/badge/Expo%20Go-Scan%20QR-000?logo=expo)](https://expo.dev/@OWNER/stellar-greenpay)

> Replace `OWNER` with your Expo account username. Add `EXPO_TOKEN` as a GitHub Actions repository secret (Settings → Secrets and variables → Actions) before the first build.

- **Android**: APK (direct install, no Play Store needed)
- **iOS**: Simulator build (`.app` bundle, not a signed IPA)

## Shared API Client

The mobile app shares the API client logic with the web frontend. The API functions are located in `lib/api.ts` and are imported from the shared package.

## Wallet Integration

The app integrates with mobile Stellar wallets via deep links:
- Freighter Mobile: `freighter://tx?xdr=...`
- Other wallets can be added via similar deep link schemes

## Deep Links

The app registers the custom scheme `greenpay://` (plus universal links for
`https://<domain>/project/*`) in `app.json`, mounts `hooks/useDeepLink.ts` from
the root layout (`app/_layout.tsx`), and ships association files in
`mobile/.well-known/` that must be published by the web frontend.

Flow: OS resolves the URL → `useDeepLink()` parses it with `expo-linking` →
`router.push()` → expo-router screen in `app/`.

### Supported link patterns

| Link | Opens screen | Handled by |
| --- | --- | --- |
| `greenpay://project/<projectId>` | `/projects/<projectId>` (Project Details) | `useDeepLink` |
| `greenpay://donate/<G…address>` | `/donate/<address>` (Donate, destination pre-selected) | `useDeepLink` |
| `greenpay://profile/<G…address>` | `/profile/<address>` (Donor Profile) | expo-router file route (`app/profile/[address].tsx`) |
| `https://<domain>/project/<projectId>` | `/projects/<projectId>` | `useDeepLink` (universal link; requires `.well-known` files, see below) |
| `greenpay://donate?wallet=<G…>&project=<id>` | `/donate/<id>?wallet=<G…>` | In-app QR parsing only (`app/scan.tsx`) — the hook ignores query-only `donate` paths |
| any other `greenpay://<segment>/<param>` | nothing | ignored (covered by `__tests__/useDeepLink.test.ts`) |

The hook handles both **cold starts** (`Linking.getInitialURL()`) and **warm
starts** (`Linking.addEventListener('url', …)`), so links received while the app
is open navigate too. Run `npm test` in `mobile/` to exercise these cases.

### Hosting the `.well-known` association files

Universal links (iOS `applinks:` / Android App Links) only work if the files are
served **from the frontend's public root**, i.e. `frontend/public/.well-known/`,
which Next.js publishes verbatim:

| File | Must be reachable at | Repo source |
| --- | --- | --- |
| `apple-app-site-association` | `https://<domain>/.well-known/apple-app-site-association` | `mobile/.well-known/apple-app-site-association` (copy kept in sync with `frontend/public/.well-known/`) |
| `assetlinks.json` | `https://<domain>/.well-known/assetlinks.json` | `frontend/public/.well-known/assetlinks.json` |

Requirements:

- Served over **HTTPS**, on the exact host configured in `app.json`
  (`ios.associatedDomains: ["applinks:<domain>"]`,
  `android.intentFilters` → `https` + `pathPrefix: "/project/"`).
- The AASA file has **no extension** — it must not be rewritten or blocked by
  the server; `Content-Type: application/json` is recommended.
- Replace the placeholders before shipping: `TEAMID` in
  `apple-app-site-association` (Apple Developer Team ID), and the
  `sha256_cert_fingerprints` array in `assetlinks.json` (signing cert
  fingerprint of the `com.stellargreenpay.app` upload key). Both files must
  match `bundleIdentifier` / `package` in `app.json`.
- `mobile/.well-known/` is not served by anything itself — it is the in-repo
  copy for the mobile side. After editing it, copy it to
  `frontend/public/.well-known/` so both stay identical.

Quick check that the files are served from the public root:

```bash
npx serve frontend/public          # or run the Next.js dev server
curl -sI http://localhost:3000/.well-known/apple-app-site-association
curl -sI http://localhost:3000/.well-known/assetlinks.json
```

Both must return `200` (then repeat against the deployed domain).

### Testing deep links

Two environments, two different capabilities:

| | Expo Go (`npm start`) | Dev build (`npx expo run:ios` / `run:android` or EAS `preview`) |
| --- | --- | --- |
| `greenpay://` custom scheme | ✗ Expo Go owns the `exp://` scheme, so the OS cannot deliver `greenpay://` URLs to it | ✓ registered for the app's own bundle id/package |
| `https://<domain>/…` universal links | ✗ App Links/AASA verify against Expo Go's bundle id, never the app's | ✓ verified once the `.well-known` files are live |
| Screen routing sanity check | ✓ open `exp://<host>:8081/--/projects/42`, or run the unit tests | ✓ |

Build a test binary with the EAS `preview` profile defined in `eas.json`
(Android APK, iOS simulator build):

```bash
cd mobile
eas build --profile preview --platform android   # or --platform ios
```

**Android (dev build or emulator)**

```bash
# custom scheme
npx uri-scheme open "greenpay://project/42" --android
adb shell am start -W -a android.intent.action.VIEW -d "greenpay://donate/GABCXYZ"

# universal link (requires hosted .well-known + verified domain)
adb shell am start -W -a android.intent.action.VIEW -d "https://<domain>/project/42"

# confirm the link resolves to the app (API 31+)
adb shell pm verify-app-links --re-verify com.stellargreenpay.app
adb shell cmd package query-activities --brief -a android.intent.action.VIEW -d "https://<domain>/project/42"
```

**iOS (simulator, dev build)**

```bash
# custom scheme
npx uri-scheme open "greenpay://project/42" --ios
xcrun simctl openurl booted "greenpay://donate/GABCXYZ"

# universal link — opens Safari/Notes first if AASA is not yet fetched;
# once fetched, tapping the same https link opens the app directly
xcrun simctl openurl booted "https://<domain>/project/42"
```

Verify the association file is fetchable the way iOS does it (no headers, no
redirects): `curl https://<domain>/.well-known/apple-app-site-association`.
If the universal link stays in the browser, re-check the host in `app.json`,
the `TEAMID`/bundle id in the AASA file, and that the file is served from
`frontend/public/.well-known/`.

## Architecture

- **expo-router**: File-based routing
- **app/**: Screen components
- **lib/**: Shared utilities (API, Stellar SDK helpers)
- **components/**: Reusable UI components
- **styles/**: Theme and styling (matches web green theme)

## Environment Variables

See `.env.example` for required variables:
- `EXPO_PUBLIC_API_URL`: Backend API URL
- `EXPO_PUBLIC_STELLAR_NETWORK`: testnet or mainnet
- `EXPO_PUBLIC_HORIZON_URL`: Stellar Horizon URL
