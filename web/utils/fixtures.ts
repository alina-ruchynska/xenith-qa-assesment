import { test as base, expect } from '@playwright/test';
import { AccountApi, TestUser, newTestUser } from './account-api';

// Third-party ads/analytics make demoqa slow and cover clickable elements
const BLOCKED = /googlesyndication|doubleclick|adplus|googletagmanager|google-analytics|pagead|adsafeprotected/;

type Fixtures = { accountApi: AccountApi; user: TestUser };

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await page.route(BLOCKED, (route) => route.abort());
    await use(page);
  },
  accountApi: async ({ request }, use) => {
    await use(new AccountApi(request));
  },
  // Fresh credentials per test; the user is always removed afterwards
  user: async ({ accountApi }, use) => {
    const user = newTestUser();
    await use(user);
    await accountApi.deleteUserIfExists(user);
  },
});

export { expect };
