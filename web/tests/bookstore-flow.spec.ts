import { test, expect } from '../utils/fixtures';
import { RegisterPage } from '../pages/register-page';
import { LoginPage } from '../pages/login-page';
import { BookStorePage } from '../pages/book-store-page';
import { BookDetailPage } from '../pages/book-detail-page';
import { ProfilePage } from '../pages/profile-page';

const BOOK = { search: 'git', title: 'Git Pocket Guide' };

test('register, login, add, view, delete a book, and logout', async ({ page, context, accountApi, user }) => {
  const login = new LoginPage(page);
  const store = new BookStorePage(page);
  const detail = new BookDetailPage(page);
  const profile = new ProfilePage(page);
  let isbn = '';
  const sessionToken = async () => (await context.cookies()).find((c) => c.name === 'token')!.value;

  await test.step('1a. Register (UI form is CAPTCHA-gated → register via API)', async () => {
    const register = new RegisterPage(page);
    await register.open();
    await expect(register.captcha, 'register form must be protected by reCAPTCHA').toBeAttached();
    await accountApi.register(user);
    expect(user.userId).toBeTruthy();
  });

  await test.step('1b. Login', async () => {
    await login.open();
    await login.login(user.userName, user.password);
    await profile.expectLoggedInAs(user.userName);
    const cookieNames = (await context.cookies()).map((c) => c.name);
    expect(cookieNames).toEqual(expect.arrayContaining(['token', 'userID', 'userName']));
  });

  await test.step('2a. Search for a book', async () => {
    await store.open();
    await store.search(BOOK.search);
    await expect(store.bookLinks).toHaveCount(1);
    await expect(store.bookLink(BOOK.title)).toBeVisible();
  });

  await test.step('2b. Add the book to the collection', async () => {
    await store.openBook(BOOK.title);
    await detail.expectTitle(BOOK.title);
    isbn = await detail.isbn();
    expect(await detail.addToCollectionAndGetAlert()).toBe('Book added to your collection.');
  });

  await test.step('3. See the book in the collection', async () => {
    await profile.open();
    await expect(profile.bookTitles).toHaveCount(1);
    await expect(profile.bookTitles.first()).toHaveText(BOOK.title);
    expect(await accountApi.collectionIsbns(user, await sessionToken()), 'backend agrees with UI').toEqual([isbn]);
  });

  await test.step('4. Delete the book from the collection', async () => {
    expect(await profile.deleteBookAndGetAlert(isbn)).toBe('Book deleted.');
    await expect(profile.bookTitles).toHaveCount(0);
    expect(await accountApi.collectionIsbns(user, await sessionToken())).toEqual([]);
  });

  await test.step('5. Logout', async () => {
    await profile.logout();
    await expect(page).toHaveURL(/\/login/);
    await expect(login.loginButton).toBeVisible();
    const authCookies = (await context.cookies()).filter((c) => ['token', 'userID'].includes(c.name));
    expect(authCookies, 'auth cookies are cleared').toEqual([]);
  });
});
