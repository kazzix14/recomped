import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface DateState {
  year: number | null;
  month: number | null;
  date: number | null;
}

export interface DateChangeEvent extends CustomEvent {
  detail: {
    value: string;
    date: DateState;
  };
}

// ---- バリデーション/パース/フォーマット関数 ----
function isValidDate(date: DateState): boolean {
  if (date.year == null || date.month == null || date.date == null) {
    return false;
  }
  const testDate = new Date(date.year, date.month, date.date);
  return (
    testDate.getFullYear() === date.year &&
    testDate.getMonth() === date.month &&
    testDate.getDate() === date.date
  );
}

interface ParseResult {
  isValid: boolean;
  date: DateState | null;
}

function parseDate(input: string): ParseResult {
  if (!input) {
    return { isValid: true, date: null };
  }

  const match = input.match(/^(\d{1,4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) {
    return { isValid: false, date: null };
  }

  const [, yearStr, monthStr, dateStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const date = parseInt(dateStr, 10);

  const dateState: DateState = { year, month, date };
  return {
    isValid: isValidDate(dateState),
    date: isValidDate(dateState) ? dateState : null,
  };
}

function formatDisplayDate(date: DateState | null): string {
  if (!date) return "";

  const y = date.year ?? "";
  const m = date.month != null ? String(date.month + 1).padStart(2, "0") : "";
  const d = date.date != null ? String(date.date).padStart(2, "0") : "";

  return y && m && d ? `${y}/${m}/${d}` : "";
}

// ---- Web Component 本体 ----
@customElement("recomped-date-picker")
export class DatePicker extends LitElement {
  static styles = css`
    :host {
      --dt-background: var(--dt-background, white);
      --dt-border-radius: var(--dt-border-radius, 0.5rem);
      --dt-border-color: var(--dt-border-color, #e5e7eb);
      --dt-text: var(--dt-text, #6b7280);
      --dt-header-text: var(--dt-header-text, #6b7280);
      --dt-hover-bg: var(--dt-hover-bg, #f3f4f6);
      --dt-selected-bg: var(--dt-selected-bg, rgb(235, 245, 255));
      --dt-sunday-color: var(--dt-sunday-color, #dc2626);
      --dt-saturday-color: var(--dt-saturday-color, #2563eb);
    }

    .picker-container {
      position: fixed;
      z-index: 1000;
      background: var(--dt-background);
      border: 1px solid var(--dt-border-color);
      border-radius: var(--dt-border-radius);
      padding: 1rem;
      display: none;
      color: var(--dt-text);
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .picker-container.open {
      display: block;
    }

    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      color: var(--dt-header-text);
    }

    .calendar-nav-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      color: var(--dt-text);
      border-radius: 0.25rem;
    }

    .calendar-nav-button:hover {
      background: var(--dt-hover-bg);
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.25rem;
      text-align: center;
    }

    .weekday-header {
      color: var(--dt-header-text);
      font-size: 0.875rem;
      padding: 0.25rem;
    }

    .day-cell {
      padding: 0.375rem;
      cursor: pointer;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }

    .day-cell:hover {
      background: var(--dt-hover-bg);
    }

    .day-cell.selected {
      background: var(--dt-selected-bg);
    }

    .day-cell.today {
      font-weight: bold;
    }

    .day-cell.out-of-month {
      color: var(--dt-text);
      opacity: 0.5;
    }

    .day-cell.sunday {
      color: var(--dt-sunday-color);
    }

    .day-cell.saturday {
      color: var(--dt-saturday-color);
    }

    .button-container {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
    }

    .today-button,
    .clear-button {
      background: none;
      border: 1px solid var(--dt-border-color);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      color: var(--dt-text);
      font-size: 0.875rem;
    }

    .today-button:hover,
    .clear-button:hover {
      background: var(--dt-hover-bg);
    }
  `;

  @property({ type: String })
  locale: string = "ja";

  @state()
  private year: number = new Date().getFullYear();

  @state()
  private month: number = new Date().getMonth();

  @state()
  private selectedDate?: number;

  @state()
  private isOpen: boolean = false;

  @state()
  private lastValidDate: DateState | null = null;

  private targetInput: HTMLInputElement | null = null;
  private inputEventListeners: Map<
    HTMLInputElement,
    {
      focus: () => void;
      input: (e: Event) => void;
      change: (e: Event) => void;
    }
  > = new Map();

  private boundHandleDocumentClick = this.handleDocumentClick.bind(this);

  connectedCallback() {
    super.connectedCallback();
    this.setupInputElements();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeDocumentClickHandler();
    this.cleanupInputElements();
  }

  private setupInputElements() {
    for (const input of document.querySelectorAll(
      "input[data-recomped-date-picker]"
    )) {
      if (input instanceof HTMLInputElement) {
        this.setupInput(input);
      }
    }
  }

  private cleanupInputElements() {
    for (const input of document.querySelectorAll(
      "input[data-recomped-date-picker]"
    )) {
      if (input instanceof HTMLInputElement) {
        this.cleanupInput(input);
      }
    }
  }

  public setupInput(input: HTMLInputElement) {
    const listeners = {
      focus: () => this.open(input),
      input: (e: Event) => this.handleInput(e),
      change: (e: Event) => this.handleChange(e),
    };

    this.inputEventListeners.set(input, listeners);

    input.addEventListener("focus", listeners.focus);
    input.addEventListener("input", listeners.input);
    input.addEventListener("change", listeners.change);
  }

  public cleanupInput(input: HTMLInputElement) {
    const listeners = this.inputEventListeners.get(input);
    if (listeners) {
      input.removeEventListener("focus", listeners.focus);
      input.removeEventListener("input", listeners.input);
      input.removeEventListener("change", listeners.change);
      this.inputEventListeners.delete(input);
    }
  }

  public open(input: HTMLInputElement) {
    console.log("open");
    this.targetInput = input;
    this.isOpen = true;

    const result = parseDate(input.value);
    if (result.isValid && result.date) {
      this.lastValidDate = result.date;
      this.year = result.date.year ?? new Date().getFullYear();
      this.month = result.date.month ?? new Date().getMonth();
      this.selectedDate = result.date.date ?? undefined;
    } else {
      const now = new Date();
      this.year = now.getFullYear();
      this.month = now.getMonth();
      this.selectedDate = undefined;
      this.lastValidDate = null;
    }

    console.log("open2");
    this.updatePickerPosition(input);
    this.addDocumentClickHandler();
  }

  private updatePickerPosition(input: HTMLInputElement) {
    console.log("updatePickerPosition");
    const rect = input.getBoundingClientRect();
    const picker = this.shadowRoot?.querySelector(
      ".picker-container"
    ) as HTMLElement;
    console.log("updatePickerPosition2");
    // .picker-containerがなさそう。
    console.log(picker);
    if (!picker) return;

    const viewportHeight = window.innerHeight;
    const pickerHeight = picker.offsetHeight;

    picker.style.left = `${rect.left}px`;
    if (rect.bottom + pickerHeight > viewportHeight) {
      picker.style.top = `${rect.top - pickerHeight - 8}px`;
    } else {
      picker.style.top = `${rect.bottom + 8}px`;
    }
  }

  private handleDateClick(date: number, event: Event) {
    event.stopPropagation();
    if (!this.targetInput) return;

    const newDate: DateState = {
      year: this.year,
      month: this.month,
      date,
    };
    this.lastValidDate = newDate;
    this.updatePickerState(newDate);
    this.updateInputValue(newDate);
    this.close();
  }

  private updatePickerState(date: DateState) {
    this.year = date.year ?? this.year;
    this.month = date.month ?? this.month;
    this.selectedDate = date.date ?? undefined;
  }

  private updateInputValue(date: DateState | null) {
    if (!this.targetInput) return;

    const formattedValue = formatDisplayDate(date);
    this.targetInput.value = formattedValue;

    // Dispatch change event
    const event = new CustomEvent("recomped-date-change", {
      detail: {
        value: formattedValue,
        date,
      },
    });
    this.targetInput.dispatchEvent(event);
  }

  private handleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const result = parseDate(input.value);

    if (result.isValid && result.date) {
      this.lastValidDate = result.date;
      this.updatePickerState(result.date);
    }
  }

  private handleChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const result = parseDate(input.value);

    if (!result.isValid) {
      this.updateInputValue(this.lastValidDate);
    } else {
      this.lastValidDate = result.date;
      this.updateInputValue(result.date);
    }
  }

  private handlePrevMonth() {
    if (this.month === 0) {
      this.month = 11;
      this.year--;
    } else {
      this.month--;
    }
  }

  private handleNextMonth() {
    if (this.month === 11) {
      this.month = 0;
      this.year++;
    } else {
      this.month++;
    }
  }

  private handleToday(event: Event) {
    event.stopPropagation();
    const now = new Date();
    const today: DateState = {
      year: now.getFullYear(),
      month: now.getMonth(),
      date: now.getDate(),
    };
    this.lastValidDate = today;
    this.updatePickerState(today);
    this.updateInputValue(today);
    this.close();
  }

  private handleClear(event: Event) {
    event.stopPropagation();
    this.lastValidDate = null;
    this.selectedDate = undefined;
    this.updateInputValue(null);
    this.close();
  }

  private addDocumentClickHandler() {
    document.addEventListener("click", this.boundHandleDocumentClick);
  }

  private removeDocumentClickHandler() {
    document.removeEventListener("click", this.boundHandleDocumentClick);
  }

  private handleDocumentClick(event: MouseEvent) {
    const path = event.composedPath();
    if (
      !path.includes(this) &&
      this.targetInput &&
      !path.includes(this.targetInput)
    ) {
      this.close();
    }
  }

  private close() {
    this.isOpen = false;
    this.removeDocumentClickHandler();
  }

  private isToday(date: number): boolean {
    const today = new Date();
    return (
      date === today.getDate() &&
      this.month === today.getMonth() &&
      this.year === today.getFullYear()
    );
  }

  private getMonthYearText(): string {
    const date = new Date(this.year, this.month);
    return new Intl.DateTimeFormat(this.locale, {
      year: "numeric",
      month: "long",
    }).format(date);
  }

  private getWeekdayHeaders(): string[] {
    const weekdays = [];
    const date = new Date(2024, 0, 7); // 2024-01-07 is a Sunday
    for (let i = 0; i < 7; i++) {
      weekdays.push(
        new Intl.DateTimeFormat(this.locale, { weekday: "short" }).format(date)
      );
      date.setDate(date.getDate() + 1);
    }
    return weekdays;
  }

  private renderDays() {
    const firstDay = new Date(this.year, this.month, 1);
    const lastDay = new Date(this.year, this.month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();
    const days = [];

    // 前月の空白埋め
    const prevMonthLastDate = new Date(this.year, this.month, 0);
    const prevMonthDays = prevMonthLastDate.getDate();
    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = prevMonthDays - firstDayOfWeek + i + 1;
      const isSunday = i === 0;
      const isSaturday = i === 6;
      days.push(
        html`<div
          class="day-cell out-of-month ${isSunday ? "sunday" : ""} ${isSaturday
            ? "saturday"
            : ""}">
          ${day}
        </div>`
      );
    }

    // 当月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        day === this.selectedDate &&
        this.year === this.lastValidDate?.year &&
        this.month === this.lastValidDate?.month;

      const isToday = this.isToday(day);
      const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;

      days.push(html`
        <div
          class="day-cell
            ${isSelected ? "selected" : ""}
            ${isToday ? "today" : ""}
            ${isSunday ? "sunday" : ""}
            ${isSaturday ? "saturday" : ""}
            ${day == null ? "disabled" : ""}
          "
          @click=${(e: Event) => this.handleDateClick(day, e)}>
          ${day}
        </div>
      `);
    }

    // 翌月の空白埋め
    const lastDayOfWeek = (firstDayOfWeek + daysInMonth - 1) % 7;
    const remainingDays = lastDayOfWeek < 6 ? 6 - lastDayOfWeek : 0;
    for (let i = 1; i <= remainingDays; i++) {
      const dayOfWeek = (firstDayOfWeek + daysInMonth + i - 1) % 7;
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;
      days.push(
        html`<div
          class="day-cell out-of-month ${isSunday ? "sunday" : ""} ${isSaturday
            ? "saturday"
            : ""}">
          ${i}
        </div>`
      );
    }

    return days;
  }

  render() {
    // if (!this.isOpen) return null;

    return html`
      <div
        class="picker-container ${this.isOpen ? "open" : ""}"
        @click=${(e: Event) => e.stopPropagation()}>
        <div class="calendar-header">
          <button
            class="calendar-nav-button"
            @click=${this.handlePrevMonth}
            aria-label="Previous month">
            ←
          </button>
          <span>${this.getMonthYearText()}</span>
          <button
            class="calendar-nav-button"
            @click=${this.handleNextMonth}
            aria-label="Next month">
            →
          </button>
        </div>

        <div class="calendar-grid">
          ${this.getWeekdayHeaders().map(
            (weekday) => html` <div class="weekday-header">${weekday}</div> `
          )}
          ${this.renderDays()}
        </div>

        <div class="button-container">
          <button class="today-button" @click=${this.handleToday}>
            ${this.locale === "ja" ? "今日" : "Today"}
          </button>
          <button class="clear-button" @click=${this.handleClear}>
            ${this.locale === "ja" ? "クリア" : "Clear"}
          </button>
        </div>
      </div>
    `;
  }
}

// 初期化関数
export function initDatePicker(): void {
  // カスタム要素の定義（未定義の場合のみ）
  if (!customElements.get("recomped-date-picker")) {
    customElements.define("recomped-date-picker", DatePicker);
  }

  // ピッカーの作成（存在しない場合のみ）
  if (!document.querySelector("recomped-date-picker")) {
    const picker = document.createElement("recomped-date-picker");
    document.body.appendChild(picker);
  }
}
