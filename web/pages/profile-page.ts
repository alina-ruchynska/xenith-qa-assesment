import { Locator, Page, expect } from '@playwright/test';

export class ProfilePage {
  readonly userNameValue: Locator;
  readonly logoutButton: Locator;
  readonly bookTitles: Locator;
  readonly confirmDelete: Locator;

  constructor(private readonly page: Page) {
    this.userNameValue = page.locator('#userName-value');
    this.logoutButton = page.getByRole('button', { name: /^Log ?out$/ });
    this.bookTitles = page.locator('a[href*="/books?search="]');
    this.confirmDelete = page.locator('#closeSmallModal-ok');
  }

  async open() {
    await this.page.goto('/profile');
  }

  async expectLoggedInAs(userName: string) {
    await expect(this.page).toHaveURL(/\/profile/);
    await expect(this.userNameValue).toHaveText(userName);
  }

  /** Deletes a book via its trash icon + confirm modal; returns the resulting alert text. */
  async deleteBookAndGetAlert(isbn: string): Promise<string> {
    await this.page.locator(`#delete-record-${isbn}`).click();
    await expect(this.page.locator('.modal-content')).toContainText('Do you want to delete this book?');
    const dialog = this.page.waitForEvent('dialog');
    await this.confirmDelete.click();
    const alert = await dialog;
    const message = alert.message();
    await alert.accept();
    return message;
  }

  async logout() {
    await this.logoutButton.click();
  }
}
