# Trackify security review — 21 October 2026

Scope: the existing checkout, browser application, two Vercel API handlers, and npm dependencies. Earlier dashboard and loading-overlay changes were preserved. No production deployment or live Firestore authorization test was performed.

## Trust boundaries and assets

- Browser/cloud/imported JSON -> HTML templates and delegated actions. Treat dates, IDs, preferences, symptoms and labels as untrusted.
- Public feedback POST -> server credentials -> Telegram. Untrusted fields must not control request destinations or expose the bot token through errors.
- Scheduler HTTP request -> Firebase Admin -> all users' notification preferences and push destinations. A missing credential must deny access.
- Firebase Authentication -> user-owned Firestore paths. Client UID path construction does not establish authorization; deployed Security Rules do.
- npm registry -> build/server runtime. Lock dependencies and disable automatic lifecycle scripts.

Assets include Google login state, personal journals, mood/cycle data, FCM tokens, Telegram credentials and the Firebase service-account private key.

## Changes implemented

| Finding | Remediation |
| --- | --- |
| HTML injection through cloud/imported fields and habit context-menu names | Escaped text and attribute output, including task action arguments, dates, menstrual labels, notification preferences, edit fields and avatar markup. Restricted rendered priority classes to supported values. |
| Date formatter could return attacker-controlled year markup | Accept only the expected numeric YYYY-MM-DD shape; this is output hardening, not complete calendar validation. |
| Feedback accepted objects and unbounded strings | Required JSON object input; bounded expected string fields, required a nonblank message and capped outgoing Telegram text. |
| Feedback returned upstream errors that can include credential-bearing URLs | Generic public errors and credential-free failure logging; 5-second upstream timeout. |
| 18 dependency advisories, including 9 high | Updated dependencies. Final online npm audit: zero advisories. Firebase Admin 14.5.0 and Sharp 0.35.5 pinned. Node.js >=22 required. |
| Lockfile excluded from version control; lifecycle scripts unrestricted | Removed the lockfile ignore rule, added package-lock.json and project-level ignore-scripts=true. Explicit npm run build remains available. |
| Missing defense-in-depth headers | Added CSP restrictions on base URLs, plugin objects and embedding, HSTS and a Permissions-Policy disabling unused camera/microphone/geolocation. |
| Incomplete secret-file ignore coverage | Added .env variants, private-key and common service-account filename exclusions. |

## Cron authorization: applied after approval

**High, fixed:** the previous comparison allowed requests when both CRON_SECRET and the incoming secret were undefined. If Firebase Admin credentials were configured, an unauthenticated request could reach the privileged notification handler. This was reproduced with mocked database/messaging objects, without contacting Firebase or sending notifications.

The user approved applying the prepared [security/cron-secret.patch](security/cron-secret.patch), and it is now applied to api/send-notifications.js. The patch is retained as a review artifact and must not be applied again.

The handler rejects missing/blank server secrets with 503 before initializing Admin, rejects missing/wrong/non-string request secrets with 403, preserves the existing valid x-cron-secret header and legacy query-secret behavior, and replaces public fatal error details with a generic message. Six permanent regression tests cover these boundaries, HTTP method rejection, header precedence and fatal error responses. The missing-secret and internal-error tests failed before the patch and passed afterward.

A configured CRON_SECRET remains a deployment requirement. Query-string credentials should subsequently be retired with the scheduler caller to avoid URL-log exposure. No deployment or real notification delivery was performed.

The invoked skill requires approval for authentication changes; the user's subsequent instruction to apply the patch supplied that approval.

## Open findings and verification limits

- **Firestore authorization remains unverified.** No firestore.rules or Firebase deployment configuration is present. Obtain the deployed rules, verify owner-only access for users/{uid}/..., notifPrefs/{uid}, and notification history, and test cross-account denial in the Emulator Suite before claiming tenant isolation. Do not replace deployed rules blindly.
- **Feedback abuse protection remains open.** Input validation does not stop spam. A shared rate limit and/or App Check requires a separate design and approval; no in-memory serverless limiter was added.
- The CSP added here does not restrict script-src and is not a complete XSS policy. Inline boot scripts and stylesheet load handlers need migration before an enforced script policy can be safely introduced.
- Security headers were checked in the Vercel configuration, not against a deployed HTTP response. Local Live Server does not apply vercel.json headers.
- Firebase Admin import and Sharp PNG smoke tests passed. No real push delivery, credential-based Admin request, Telegram transmission or production deployment was performed.
- The shared local application/notification cache is not account-scoped. Account-switch isolation, retention and erasure across browser caches need a dedicated review before changing login/storage behavior.
- A limited scan of tracked text found no private-key PEM blocks or Telegram bot-token patterns. Git history, deployed environment secrets and registry signatures/provenance were not audited; this is not a claim that all secrets are absent.

## Verification

- `node --test tests/*.test.cjs`: 24 passed, including malicious markup payloads, API boundary/error cases and cron authentication regression tests.
- `npm run build`: passed; Firebase Admin module imports and an in-memory Sharp PNG operation passed.
- `npm audit --json`: zero info/low/moderate/high/critical advisories after updates.
- Manifest and lockfile dependencies, devDependencies and Node engine match.
- Clean `npm ci --ignore-scripts` in an isolated test directory passed (191 packages, zero advisories). The initial offline-only attempt lacked one cached tarball; the subsequent registry-backed install passed without running lifecycle scripts.
- Existing logged-in local browser: task list opens, task edit fields render, notification settings render and navigation works. No user records were edited or submitted.
- `git diff --check`: passed.

## Reference material

- [Firebase Admin release notes](https://firebase.google.com/support/release-notes/admin/node): v14 requires Node 22+ and modular entry points already used by the notification handler.
- [Sharp installation requirements](https://sharp.pixelplumbing.com/install/): Node-API v9 runtime and platform binaries.
- [Firebase guidance on insecure rules](https://firebase.google.com/docs/rules/insecure-rules): authentication alone does not establish user-level authorization.
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP): policy directives and inline-script migration requirements.
