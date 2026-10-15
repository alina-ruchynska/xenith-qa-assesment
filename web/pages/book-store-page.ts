import { Locator, Page, expect } from '@playwright/test';

export class BookStorePage {
  readonly searchBox: Locator;
  readonly bookLinks: Locator;

  constructor(private readonly page: Page) {
    this.searchBox = page.locator('#searchBox');
    this.bookLinks = page.locator('a[href*="/books?search="]');
  }

  async open() {
    await this.page.goto('/books');
    await expect(this.bookLinks.first()).toBeVisible();
  }

  async search(term: string) {
    await this.searchBox.fill(term);
  }

  bookLink(title: string): Locator {
    return this.bookLinks.filter({ hasText: title });
  }

  async openBook(title: string) {
    await this.bookLink(title).click();
    await expect(this.page).toHaveURL(/\/books\?search=\d+/);
  }
}
