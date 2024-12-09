import { test, expect } from '@playwright/test';
import { TerminalPage } from '../page-objects/TerminalPage';

test.describe('Tutorial Progression', () => {
  let terminalPage: TerminalPage;

  test.beforeEach(async ({ page }) => {
    terminalPage = new TerminalPage(page);
    try {
      // await page.evaluate("localStorage.clear()");
    }
    catch (ex) {
      console.log("Error:", ex);
    }
    await terminalPage.goto();
  });

  test('should progress from tutorial to game mode after completing initial steps', async () => {
    // Given the user is in tutorial mode
    await expect(terminalPage.tutorialMode).toBeVisible();

    // When the user types the required sequences
    await terminalPage.pressEnter();
    const command1 = await terminalPage.getCurrentCommand();
    console.log('Command after first Enter:', command1);

    await terminalPage.typeKeys('fdsa');
    const command2 = await terminalPage.getCurrentCommand();
    console.log('Command after typing fdsa:', command2);

    await terminalPage.pressEnter();
    await terminalPage.typeKeys('jkl;');
    const command3 = await terminalPage.getCurrentCommand();
    console.log('Command after typing jkl;:', command3);

    await terminalPage.pressEnter();

    // Then the activity should change to game mode
    await expect(terminalPage.gameMode).toBeVisible();
    await expect(terminalPage.tutorialMode).not.toBeVisible();
  });

  // Example of another test in the same suite
  test('should start in tutorial mode with clean state', async () => {
    // This test will start fresh because of new context
    await expect(terminalPage.tutorialMode).toBeVisible();
    await expect(terminalPage.gameMode).not.toBeVisible();
  });
});
