# Test Plan — DemoQA Book Store

| Item | Value |
|---|---|
| Application under test | Book Store web app — https://demoqa.com/books |
| API contract | https://demoqa.com/swagger (Account v1, BookStore v1) |
| Primary tool | **Postman** (collection + environment, run headless with Newman) |
| Supporting automation | Playwright (web E2E), Karate (API E2E) |
| Artifacts | [`postman/`](../postman), [`web/`](../web), [`api/`](../api) |

---

## 1. Objectives

1. Verify that the API matches its Swagger contract: status codes, response schemas, error codes and messages.
2. Verify the main user journey through the UI: register → login → search → add to collection → view collection → delete → logout.
3. Check how authentication and authorisation are enforced: missing, invalid or foreign tokens, and one user accessing another user's data.
4. Build automation that is repeatable, independent of data (each run creates its own users) and cleans up after itself.

## 2. Scope

### In scope
| Area | Endpoints / pages |
|---|---|
| Account | `POST /Account/v1/User`, `POST /Account/v1/GenerateToken`, `POST /Account/v1/Authorized`, `POST /Account/v1/Login`, `GET /Account/v1/User/{UUID}`, `DELETE /Account/v1/User/{UUID}` |
| BookStore | `GET /BookStore/v1/Books`, `GET /BookStore/v1/Book?ISBN=`, `POST /BookStore/v1/Books`, `PUT /BookStore/v1/Books/{ISBN}`, `DELETE /BookStore/v1/Book`, `DELETE /BookStore/v1/Books?UserId=` |
| UI | `/register`, `/login`, `/books`, `/books?search={isbn}` (book detail), `/profile` |

### Out of scope
- Load, stress and soak testing. The demo is a shared public environment, so only a light response-time check is done (see §7).
- reCAPTCHA itself. It is a third-party control and **must not be bypassed by automation** (see §9, R1).
- Ads and third-party scripts injected into the pages. The UI suite blocks them to keep runs stable.

## 3. Test approach

| Level | Tool | What it covers |
|---|---|---|
| API functional and contract | Postman + Newman | Every endpoint: positive, negative and boundary cases, schema checks, chained E2E |
| API E2E (code-based) | Karate | The single business flow (Task B), run in CI |
| UI E2E | Playwright | The single business flow (Task B) in Chromium |
| Exploratory | Manual | UI states, validation messages, responsive layout |

**Data strategy.** Each run creates a unique user (`qa_<timestamp>_<random>`) with a password that meets the policy, e.g. `Passw0rd!123`. Every test cleans up with `DELETE /Account/v1/User/{UUID}`. No test depends on data left behind by another run. The fixed catalogue of 8 ISBNs is treated as reference data, e.g. `9781449325862` (*Git Pocket Guide*).

**Auth model.** `GenerateToken` returns a JWT, which is sent as `Authorization: Bearer <token>`. The UI keeps `token`, `userID`, `userName` and `expires` in cookies.

## 4. Environments and entry/exit criteria

- **Environment:** `https://demoqa.com` (public, shared). The Postman environment holds `baseUrl`, so another host can be swapped in.
- **Entry:** Swagger is reachable, and `GET /BookStore/v1/Books` returns 200.
- **Exit:** all P1 cases pass. Any P2/P3 failures are logged as defects with a request/response attached. Newman, Playwright and Karate reports are archived.

## 5. Expected responses and error matrix (observed and verified against the live API)

| # | Scenario | Request | Expected status | Expected body |
|---|---|---|---|---|
| E1 | Create user, valid | `POST /User` | **201** | `{ userID, username, books: [] }` |
| E2 | Create user, duplicate username | `POST /User` | **406** | `code: "1204"`, `"User exists!"` |
| E3 | Create user, weak password | `POST /User` | **400** | `code: "1300"`, password policy message |
| E4 | Create user, empty username/password | `POST /User` | **400** | `code: "1200"`, `"UserName and Password required."` |
| E5 | Generate token, valid | `POST /GenerateToken` | **200** | `status: "Success"`, `token` is a JWT, `expires` is in the future |
| E6 | Generate token, wrong password | `POST /GenerateToken` | **200** (!) | `status: "Failed"`, `token: null` — *a 200 for a failed login is a contract smell; see §9* |
| E7 | Authorized, valid credentials | `POST /Authorized` | **200** | `true` |
| E8 | Authorized, unknown user | `POST /Authorized` | **404** | `code: "1207"`, `"User not found!"` |
| E9 | Login, valid | `POST /Login` | **200** | `userId, username, token, expires` |
| E10 | Get user, valid token | `GET /User/{id}` | **200** | `books[]` with full book objects |
| E11 | Get user, no or invalid token | `GET /User/{id}` | **401** | `code: "1200"`, `"User not authorized!"` |
| E12 | Get user, deleted user | `GET /User/{id}` | **401** | `code: "1207"`, `"User not found!"` |
| E13 | List books | `GET /Books` | **200** | `books[]`, 8 items, each with `isbn,title,author,publisher,pages` |
| E14 | Get book, unknown ISBN | `GET /Book?ISBN=000` | **400** | `code: "1205"` |
| E15 | Add book, valid | `POST /Books` | **201** | `{ books: [{ isbn }] }` |
| E16 | Add book, already in collection | `POST /Books` | **400** | `code: "1210"` |
| E17 | Add book, ISBN not in catalogue | `POST /Books` | **400** | `code: "1205"` |
| E18 | Add book, no token | `POST /Books` | **401** | `code: "1200"` |
| E19 | Add book to **another user's** collection | `POST /Books` with A's token and B's `userId` | **401** | `code: "1200"` — must not succeed |
| E20 | Replace ISBN | `PUT /Books/{isbn}` | **200** | updated `books[]` |
| E21 | Delete one book, valid | `DELETE /Book` | **204** | empty |
| E22 | Delete one book, not in collection | `DELETE /Book` | **400** | `code: "1206"` |
| E23 | Delete all books | `DELETE /Books?UserId=` | **204** | empty |
| E24 | Delete user | `DELETE /User/{id}` | **204** | empty; afterwards E12 |
| E25 | Malformed JSON body | any POST | **400** | *Expected:* JSON error object. *Actual:* `text/html` page with a Node.js stack trace and server file path; see R7 |
| E26 | Expired or tampered JWT | any auth endpoint | **401** | `code: "1200"` |

## 6. Test cases

Priority: **P1** = blocks release, **P2** = major, **P3** = minor.

### 6.1 API — Account
| ID | Title | Pri | Maps to |
|---|---|---|---|
| ACC-01 | Register with a valid username and policy-compliant password | P1 | E1 |
| ACC-02 | Register with an existing username is rejected | P1 | E2 |
| ACC-03 | Password policy: each missing class (upper, lower, digit, special, length < 8) is rejected | P2 | E3 |
| ACC-04 | Missing or empty fields are rejected | P2 | E4 |
| ACC-05 | Generate token with valid credentials | P1 | E5 |
| ACC-06 | Generate token with wrong password returns `Failed` and no token | P1 | E6 |
| ACC-07 | `Authorized` returns true/false for valid users and 404 for unknown ones | P2 | E7, E8 |
| ACC-08 | Login returns the same `userId` as registration | P1 | E9 |
| ACC-09 | Get user requires a valid token | P1 | E10, E11 |
| ACC-10 | Delete user, then get user, returns "User not found" | P1 | E24, E12 |
| ACC-11 | Username boundaries: very long, unicode, whitespace-only, SQL/HTML injection strings | P3 | E1, E4 |

### 6.2 API — BookStore
| ID | Title | Pri | Maps to |
|---|---|---|---|
| BS-01 | List books returns the catalogue and its schema is valid | P1 | E13 |
| BS-02 | Get a single book by a valid ISBN, and by an unknown ISBN | P2 | E14 |
| BS-03 | Add a valid book to the collection | P1 | E15 |
| BS-04 | Add a duplicate book is rejected | P2 | E16 |
| BS-05 | Add an unknown ISBN is rejected | P2 | E17 |
| BS-06 | Add a book without a token is rejected | P1 | E18 |
| BS-07 | Add a book to another user's collection is rejected (IDOR) | P1 | E19 |
| BS-08 | Replace a book in the collection (PUT) | P3 | E20 |
| BS-09 | Delete one book, then delete it again | P1 | E21, E22 |
| BS-10 | Delete all books empties the collection | P2 | E23 |
| BS-11 | Add several ISBNs in one request | P3 | E15 |

### 6.3 UI
| ID | Title | Pri |
|---|---|---|
| UI-01 | Register form: field validation (empty fields highlighted), CAPTCHA required | P2 |
| UI-02 | Login with valid credentials redirects to `/profile` and shows the username | P1 |
| UI-03 | Login with invalid credentials shows "Invalid username or password!" | P1 |
| UI-04 | Search filters the grid by title, author and publisher (case-insensitive), and an empty result shows "No rows found" | P2 |
| UI-05 | Book detail shows ISBN, title, author and publisher; "Add To Your Collection" raises the alert "Book added to your collection." | P1 |
| UI-06 | Adding the same book twice raises the alert "Book already present in the your collection!" | P2 |
| UI-07 | Profile lists the books in the collection, matching `GET /User/{id}` | P1 |
| UI-08 | Delete icon → confirm modal → "OK" removes the row and raises the alert "Book deleted." | P1 |
| UI-09 | "Cancel" on the delete modal keeps the book | P3 |
| UI-10 | Logout clears auth cookies and returns to `/login`, and `/profile` then shows the not-logged-in message | P1 |
| UI-11 | Session persists across reloads until the token `expires` | P3 |
| UI-12 | Pagination and rows-per-page controls on the books grid | P3 |

## 7. Non-functional checks (light)
- Response time: each API request asserts `< 3000 ms` in Postman (a sanity limit for a shared environment, not a load test).
- Security: auth enforcement (E11, E18, E19, E26). Check that the password is not echoed back. **Observation:** `POST /Login` returns the plaintext password in its response body; logged as a defect.
- Headers: `Content-Type: application/json` on JSON responses.

## 8. Postman implementation (primary tool)

Files: `postman/BookStore.postman_collection.json` and `postman/demoqa.postman_environment.json`.

```
BookStore API
├── 00 Setup            → creates user A and user B (random names), stores ids and tokens in collection variables
├── 01 Account          → ACC-01..10 (positive and negative)
├── 02 BookStore        → BS-01..10 incl. IDOR check with user B
├── 03 E2E Flow         → register → token → search → add → list → delete → "logout" (token dropped → 401)
└── 99 Teardown         → deletes both users and verifies they are gone
```

Design rules:
- **Collection-level test script** checks the response time and the JSON content type on every request.
- **Variables:** `baseUrl` is set in the environment. Runtime values (`userId`, `token`, `isbn`) are collection variables that the tests set, so nothing is hard-coded.
- **Schema validation** uses `pm.response.to.have.jsonSchema(...)` for the book list and the user.
- **Table-driven negatives:** ACC-03 loops over its weak-password table with `pm.sendRequest` inside a single request, so one report line covers every policy rule.
- **Runs headless:**
  ```bash
  npx newman run postman/BookStore.postman_collection.json -e postman/demoqa.postman_environment.json -r cli,junit
  ```

## 9. Risks, assumptions and observations

| ID | Risk / observation | Mitigation |
|---|---|---|
| R1 | **UI registration is gated by Google reCAPTCHA.** Automation must not solve or bypass it. | The UI suite creates the user through the public `POST /Account/v1/User` endpoint (the same backend call the form makes) and checks only that the register form renders and enforces the CAPTCHA. For a test environment, ask the team for a CAPTCHA test key or a feature flag. |
| R2 | Shared public environment: data races and rate limits from other users | Unique usernames per run, self-cleanup, retries only on network errors |
| R3 | Third-party ads cause flaky clicks and slow loads | Playwright blocks ad and analytics domains |
| R4 | The API has **no logout endpoint**. JWTs stay valid until `expires`, which is 7 days. | API "logout" = discard the token client-side. Logged as a security gap: tokens should be revocable. |
| R5 | `GenerateToken` returns **200** for invalid credentials | Tests assert on `status`/`token` and not only the HTTP code. Logged as a contract defect. |
| R6 | `POST /Login` response includes the **plaintext password** | Logged as a security defect |
| R7 | Malformed JSON returns an HTML **stack trace exposing server paths** (`/usr/projects/demosite-new/...`) | Logged as a security defect; Postman case asserts that no stack trace is returned, so it fails until this is fixed |

## 10. Reporting and CI
- Newman writes `cli` and `junit` reports. Playwright writes HTML plus a trace on failure. Karate writes HTML reports to `api/target/karate-reports`.
- Suggested pipeline: `newman` → `karate` → `playwright` on every PR, with all reports published as build artifacts.
