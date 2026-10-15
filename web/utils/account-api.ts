import { APIRequestContext, expect } from '@playwright/test';

export type TestUser = { userName: string; password: string; userId?: string };

export const newTestUser = (): TestUser => ({
  userName: `qa_pw_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
  password: 'Passw0rd!123',
});

/**
 * Thin client for the Account API. Used to register users because the UI
 * register form is protected by reCAPTCHA (see docs/TEST_PLAN.md, R1), and
 * to verify UI actions against the backend.
 */
export class AccountApi {
  constructor(private readonly request: APIRequestContext) {}

  async register(user: TestUser): Promise<string> {
    const res = await this.request.post('/Account/v1/User', { data: credentials(user) });
    expect(res.status(), await res.text()).toBe(201);
    user.userId = (await res.json()).userID;
    return user.userId!;
  }

  async token(user: TestUser): Promise<string | null> {
    const res = await this.request.post('/Account/v1/GenerateToken', { data: credentials(user) });
    return (await res.json()).token;
  }

  /**
   * Reads the collection with the browser session's token. Never mint a new
   * token here: GenerateToken revokes the previous one (plan R8), which would
   * log the browser out.
   */
  async collectionIsbns(user: TestUser, sessionToken: string): Promise<string[]> {
    const res = await this.request.get(`/Account/v1/User/${user.userId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(res.status()).toBe(200);
    return (await res.json()).books.map((b: { isbn: string }) => b.isbn);
  }

  async deleteUserIfExists(user: TestUser): Promise<void> {
    if (!user.userId) return;
    const token = await this.token(user);
    if (!token) return;
    await this.request.delete(`/Account/v1/User/${user.userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

const credentials = ({ userName, password }: TestUser) => ({ userName, password });
