import { Locator, Page, expect } from '@playwright/test';

export class RegisterPage {
  readonly registerButton: Locator;
  readonly captcha: Locator;

  constructor(private readonly page: Page) {
    this.registerButton = page.locator('#register');
    this.captcha = page.locator('.g-recaptcha, iframe[src*="recaptcha"]').first();
  }

  async open() {
    await this.page.goto('/register');
    await expect(this.registerButton).toBeVisible();
  }
}
