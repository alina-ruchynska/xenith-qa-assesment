# DemoQA Book Store — Test Plan & Automation

Test plan and automation for the Book Store app at <https://demoqa.com/books> and its API (<https://demoqa.com/swagger>).

| Task | What | Where |
|---|---|---|
| A | Test plan (scope, error matrix, test cases, risks, found defects) | [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) |
| A | Postman collection + environment (primary tool) | [`postman/`](postman) |
| B | Web E2E flow (Playwright + TypeScript) | [`web/`](web) |
| B | API E2E flow (Karate) | [`api/`](api) |

The Task B flow automated in both tools: **register & login → search and add a book → view the collection → delete the book → logout**.

## Prerequisites

- Node.js 18+ (for Playwright and Newman)
- Java 17+ and Maven 3.8+ (for Karate)

## Running

### Postman (Newman)
```bash
npx newman run postman/BookStore.postman_collection.json -e postman/demoqa.postman_environment.json
```
Or import both files into Postman and run the collection with the Collection Runner, keeping the folders in order.
Add `--env-var assertKnownDefects=true` to turn on the checks for the logged defects R6/R7. Those checks are expected to fail.

### Playwright (web)
```bash
cd web
npm ci
npx playwright install chromium
npm test                # headless; `npm run test:headed` to watch
npm run report          # HTML report with trace/video on failure
```

### Karate (API)
```bash
cd api
mvn test
```
HTML report: `api/target/karate-reports/karate-summary.html`.

All suites default to `https://demoqa.com`. To target another host, set `BASE_URL` for Playwright, `-DbaseUrl=` for Karate, or `baseUrl` in the Postman environment.

## Design notes

- **Self-contained data.** Every run registers its own unique user and deletes it afterwards, so runs can go in parallel and leave nothing behind.
- **Registration in the web flow.** The UI register form is protected by Google reCAPTCHA. Automation must not bypass it, so the Playwright test checks that the CAPTCHA is present on `/register` and then creates the user through `POST /Account/v1/User`, the same backend call the form makes. Login and every later step run through the UI.
- **Logout in the API flow.** The API has no logout endpoint, and tokens are JWTs valid for 7 days. Karate models logout as discarding the token and then checks that the protected endpoint returns 401.
- **One active token per user.** `GenerateToken` revokes the user's previous token. The Playwright backend checks therefore reuse the browser's `token` cookie; minting a new token would log the browser out.
- **Stability.** Playwright blocks ad and analytics domains, which otherwise slow demoqa down and cover click targets.

## Findings (details in the test plan, §9)

| ID | Finding |
|---|---|
| R5 | `GenerateToken` returns HTTP 200 for invalid credentials |
| R6 | `POST /Account/v1/Login` returns the user's plaintext password |
| R7 | Malformed JSON returns an HTML stack trace that exposes server file paths |
| R8 | A new token silently revokes the previous one (single session per user) |

## Project layout
```
docs/TEST_PLAN.md
postman/                       BookStore.postman_collection.json, demoqa.postman_environment.json
web/   playwright.config.ts    pages/ (page objects), tests/, utils/ (fixtures, API client)
api/   pom.xml                 src/test/java/bookstore/*.feature, BookstoreTest.java
```
