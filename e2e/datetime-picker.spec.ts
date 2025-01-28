import { test, expect } from "@playwright/test";

test.describe("DatetimePicker", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Storybook
    await page.goto(
      "http://localhost:6006/?path=/story/components-datetimepicker--default"
    );
    await page.waitForLoadState("networkidle");

    // Press 'f' key to enter fullscreen mode
    await page.keyboard.press("f");
  });

  test("should open picker on input focus", async ({ page }) => {
    const frame = page.frameLocator("#storybook-preview-iframe").first();
    const input = frame.locator("input[recomped-datetime-picker]").first();

    await expect(input).toBeVisible();
    await input.click();

    const pickerContainer = frame
      .locator("recomped-datetime-picker")
      .locator(".picker-container");
    await expect(pickerContainer).toBeVisible();
  });

  test("should select a date and time", async ({ page }) => {
    const frame = page.frameLocator("#storybook-preview-iframe").first();
    const input = frame.locator("input[recomped-datetime-picker]").first();

    await input.click();

    // Select a date
    const dateCell = frame
      .locator("recomped-datetime-picker")
      .locator(".day-cell:not(.out-of-month)")
      .first();
    await dateCell.click();

    // Select time (1:05)
    const hourButton = frame
      .locator("recomped-datetime-picker")
      .locator(".time-button")
      .filter({ hasText: "1時" })
      .first();
    await hourButton.click();

    const minuteButton = frame
      .locator("recomped-datetime-picker")
      .locator(".time-button")
      .filter({ hasText: "5分" })
      .first();
    await minuteButton.click();

    // Check if the input value matches the expected format
    const value = await input.inputValue();
    expect(value).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  test("should clear input value", async ({ page }) => {
    const frame = page.frameLocator("#storybook-preview-iframe").first();
    const input = frame.locator("input[recomped-datetime-picker]").first();

    // First set a value
    await input.click();
    const dateCell = frame
      .locator("recomped-datetime-picker")
      .locator(".day-cell:not(.out-of-month)")
      .first();
    await dateCell.click();

    // Click clear button
    const clearButton = frame
      .locator("recomped-datetime-picker")
      .locator(".clear-button");
    await clearButton.click();

    // Check if the input is cleared
    const value = await input.inputValue();
    expect(value).toBe("");
  });

  test("should set today's date", async ({ page }) => {
    const frame = page.frameLocator("#storybook-preview-iframe").first();
    const input = frame.locator("input[recomped-datetime-picker]").first();

    await input.click();

    // Click today button
    const todayButton = frame
      .locator("recomped-datetime-picker")
      .locator(".today-button");
    await todayButton.click();

    // Check if the input value is today's date
    const value = await input.inputValue();
    expect(value).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  test("should navigate between months", async ({ page }) => {
    const frame = page.frameLocator("#storybook-preview-iframe").first();
    const input = frame.locator("input[recomped-datetime-picker]").first();

    await input.click();

    // Get current month text
    const monthYearText = await frame
      .locator("recomped-datetime-picker")
      .locator(".calendar-header span")
      .textContent();

    // Click next month
    const nextButton = frame
      .locator("recomped-datetime-picker")
      .locator(".calendar-nav-button")
      .last();
    await nextButton.click();

    // Check if month changed
    const newMonthYearText = await frame
      .locator("recomped-datetime-picker")
      .locator(".calendar-header span")
      .textContent();

    expect(newMonthYearText).not.toBe(monthYearText);
  });

  test("should update picker UI when typing date", async ({ page }) => {
    const frame = page.frameLocator("#storybook-preview-iframe").first();
    const input = frame.locator("input[recomped-datetime-picker]").first();

    await input.click();
    await input.fill("2024/02/15");

    // 入力した日付がカレンダーで選択状態になっていることを確認
    const selectedDate = frame
      .locator("recomped-datetime-picker")
      .locator(".day-cell.selected");
    await expect(selectedDate).toHaveText("15");
  });

  test("should update input text when selecting from picker", async ({
    page,
  }) => {
    const frame = page.frameLocator("#storybook-preview-iframe").first();
    const input = frame.locator("input[recomped-datetime-picker]").first();

    await input.click();

    // 日付を選択
    const dateCell = frame
      .locator("recomped-datetime-picker")
      .locator(".day-cell:not(.out-of-month)")
      .first();
    const dateCellText = (await dateCell.textContent())!.replace(/\s+/g, "");
    await dateCell.click();

    // 時刻を選択
    const hourButton = frame
      .locator("recomped-datetime-picker")
      .locator(".time-button")
      .filter({ hasText: "10時" })
      .first();
    await hourButton.click();

    const minuteButton = frame
      .locator("recomped-datetime-picker")
      .locator(".time-button")
      .filter({ hasText: "30分" })
      .first();
    await minuteButton.click();

    // 入力値が正しくフォーマットされていることを確認
    const value = await input.inputValue();
    const today = new Date();
    const expectedDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${dateCellText?.padStart(2, "0")}`;
    expect(value).toBe(`${expectedDate} 10:30`);
  });

  test("should revert to last valid value on invalid input", async ({
    page,
  }) => {
    const frame = page.frameLocator("#storybook-preview-iframe").first();
    const input = frame.locator("input[recomped-datetime-picker]").first();

    // まず有効な値を設定
    await input.click();
    await input.fill("2024/02/15 10:30");
    await input.press("Enter");
    const validValue = await input.inputValue();

    // 不正な値を入力
    await input.fill("invalid date");
    await input.press("Enter");

    // 最後に有効だった値に戻ることを確認
    expect(await input.inputValue()).toBe(validValue);
  });

  test("should handle partial and invalid inputs", async ({ page }) => {
    const frame = page.frameLocator("#storybook-preview-iframe").first();
    const input = frame.locator("input[recomped-datetime-picker]").first();

    // まず有効な値を設定
    await input.click();
    await input.fill("2024/02/15 10:30");
    await input.press("Enter");
    const validValue = await input.inputValue();

    // 部分的な日付入力（無効）
    await input.fill("2024/2");
    await input.press("Enter");
    expect(await input.inputValue()).toBe(validValue);

    // 1桁の数字を含む有効な入力
    await input.fill("2024/2/3 9:5");
    await input.press("Enter");
    expect(await input.inputValue()).toBe("2024/02/03 09:05");

    // 不正な値を入力
    await input.fill("invalid date");
    await input.press("Enter");
    expect(await input.inputValue()).toBe("2024/02/03 09:05");

    // 空の入力
    await input.fill("");
    await input.press("Enter");
    expect(await input.inputValue()).toBe("");
  });
});
