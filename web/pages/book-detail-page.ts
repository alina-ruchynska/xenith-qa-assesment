import { Locator, Page, expect } from '@playwright/test';

export class BookDetailPage {
  readonly addToCollection: Locator;

  constructor(private readonly page: Page) {
    this.addToCollection = page.getByRole('button', { name: 'Add To Your Collection' });
  }

  isbn(): Promise<string> {
    return this.page.locator('#ISBN-wrapper #userName-value').innerText();
  }

  /** Clicks "Add To Your Collection" and returns the text of the browser alert it raises. */
  async addToCollectionAndGetAlert(): Promise<string> {
    const dialog = this.page.waitForEvent('dialog');
    await this.addToCollection.click();
    const alert = await dialog;
    const message = alert.message();
    await alert.accept();
    return message;
  }

  async expectTitle(title: string) {
    await expect(this.page.locator('#title-wrapper #userName-value')).toHaveText(title);
  }
}
