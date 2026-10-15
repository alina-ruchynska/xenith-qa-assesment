import { Locator, Page, expect } from '@playwright/test';

export class LoginPage {
  readonly userName: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.userName = page.locator('#userName');
    this.password = page.locator('#password');
    this.loginButton = page.locator('#login');
    this.error = page.locator('#name');
  }

  async open() {
    await this.page.goto('/login');
    await expect(this.loginButton).toBeVisible();
  }

  async login(userName: string, password: string) {
    await this.userName.fill(userName);
    await this.password.fill(password);
    await this.loginButton.click();
  }
}
