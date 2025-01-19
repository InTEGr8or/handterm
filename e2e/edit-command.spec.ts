import { test, expect } from '@playwright/test';
import { HandTermPage } from './page-objects/HandTermPage';

test.describe('Edit Command', () => {
  let handterm: HandTermPage;

  test.beforeEach(async ({ page }) => {
    handterm = new HandTermPage(page);
    await handterm.goto();
  });

  test('should navigate to edit activity and load content', async ({ page }) => {
    // Set test content in localStorage
    await page.evaluate(() => {
      localStorage.setItem('edit-content', JSON.stringify({
        key: '_index.md',
        content: '# Test Content'
      }));
    });

    // Execute edit command
    await handterm.executeCommand('edit _index.md');

    // Verify navigation
    await expect(page).toHaveURL(/activity=edit\?key=_index\.md/);

    // Verify MonacoEditor is visible
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible();

    // Verify content loaded
    const editorContent = await page.evaluate(() => {
      const editor = window.monacoEditor;
      if (!editor) {
        throw new Error('Monaco editor not found');
      }
      const value = editor.getValue();
      if (typeof value !== 'string') {
        throw new Error('Expected string value from editor');
      }
      return value;
    });
    expect(editorContent).toContain('# Test Content');
  });

  test('should show error for invalid file', async ({ page }) => {
    await handterm.executeCommand('edit invalid.md');

    // Verify error message
    const error = page.locator('.error-message');
    await expect(error).toContainText('File not found');
  });
});
