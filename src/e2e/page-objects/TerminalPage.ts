import { type Page, type Locator } from '@playwright/test';
import { TERMINAL_CONSTANTS } from 'src/constants/terminal';

export class TerminalPage {
  readonly page: Page;
  readonly terminal: Locator;
  readonly output: Locator;
  readonly tutorialMode: Locator;
  readonly gameMode: Locator;
  private readonly prompt = TERMINAL_CONSTANTS.PROMPT;

  constructor(page: Page) {
    this.page = page;
    this.terminal = page.locator('#xtermRef');
    this.output = page.locator('#output-container');
    this.tutorialMode = page.locator('.tutorial-component');
    this.gameMode = page.locator('#terminal-game');
  }

  async goto() {
    await this.page.goto('/');
    // Wait for the signal to be exposed
    await this.page.waitForFunction(() => 'commandLineSignal' in window);
  }

  /**
   * Types a command into the terminal
   * @param command The command to type
   */
  async typeCommand(command: string) {
    await this.terminal.click();
    await this.page.keyboard.type(command);
    // Wait for the signal to update
    await this.waitForCommandUpdate();
  }

  /**
   * Types a sequence of keys without executing a command
   * @param keys The keys to type
   */
  async typeKeys(keys: string) {
    await this.terminal.click();
    await this.page.keyboard.type(keys);
    // Wait for the signal to update
    await this.waitForCommandUpdate();
  }

  /**
   * Presses the Enter key
   */
  async pressEnter() {
    await this.page.keyboard.press('Enter');
    // Wait for the signal to update
    await this.waitForCommandUpdate();
  }

  /**
   * Executes a command by typing it and pressing Enter
   * @param command The command to execute
   */
  async executeCommand(command: string) {
    await this.typeCommand(command);
    await this.pressEnter();
  }

  /**
   * Gets the current terminal output
   * @returns The text content of the output container
   */
  async getOutput(): Promise<string> {
    return await this.output.textContent() || '';
  }

  /**
   * Gets the current command line text (without the prompt)
   * @returns The current command line text
   */
  async getCurrentCommand(): Promise<string> {
    // Wait for the signal to be available
    await this.page.waitForFunction(() => 'commandLineSignal' in window);

    // Get the value from commandLineSignal
    const commandLine = await this.page.evaluate(() => {
      return (window as any).commandLineSignal.value;
    });

    return commandLine || '';
  }

  /**
   * Waits for the command line signal to update
   * This helps ensure we get the latest value after typing or other actions
   */
  private async waitForCommandUpdate(): Promise<void> {
    await this.page.waitForFunction(() => {
      return 'commandLineSignal' in window;
    }, { timeout: 5000 });
  }

  /**
   * Waits for specific text to appear in the output
   * @param text The text to wait for
   */
  async waitForOutput(text: string) {
    await this.output.getByText(text).waitFor();
  }

  /**
   * Waits for the prompt to appear, indicating the terminal is ready
   */
  async waitForPrompt() {
    await this.terminal.getByText(this.prompt).last().waitFor();
  }

  /**
   * Focuses the terminal
   */
  async focus() {
    await this.terminal.click();
  }

  /**
   * Clears the current command line using Ctrl+C
   */
  async clearLine() {
    await this.terminal.click();
    await this.page.keyboard.press('Control+C');
    await this.waitForPrompt();
  }
}
