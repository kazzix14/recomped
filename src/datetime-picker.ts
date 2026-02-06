import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DateTimeState } from "./types";

export interface DateTimeChangeEvent extends CustomEvent {
  detail: {
    value: string;
    dateTime: DateTimeState;
  };
}

// ---- 単純なバリデーション/パース/フォーマット関数 ----
function isValidDateTime(dateTime: DateTimeState): boolean {
  if (
    dateTime.year == null ||
    dateTime.month == null ||
    dateTime.date == null
  ) {
    return false;
  }
  const testDate = new Date(
    dateTime.year,
    dateTime.month,
    dateTime.date,
    dateTime.hour ?? 0,
    dateTime.minute ?? 0
  );
  return (
    testDate.getFullYear() === dateTime.year &&
    testDate.getMonth() === dateTime.month &&
    testDate.getDate() === dateTime.date
  );
}

/**
 * 部分的な日時入力に対応したパース
 */
function parseDateTime(value: string): {
  isValid: boolean;
  dateTime: DateTimeState | null;
} {
  if (!value.trim()) {
    return { isValid: true, dateTime: null };
  }

  const dateTime: DateTimeState = {
    year: null,
    month: null,
    date: null,
    hour: null,
    minute: null,
  };

  // 日付と時刻を分離
  const [datePart, timePart] = value.split(" ");

  // 日付部分のパース
  if (datePart) {
    const dateParts = datePart.split("/");

    // 年のパース
    if (dateParts[0] && /^\d{4}$/.test(dateParts[0])) {
      const year = parseInt(dateParts[0]);
      if (year >= 1900 && year <= 2100) {
        dateTime.year = year;
      } else {
        return { isValid: false, dateTime: null };
      }
    }

    // 月のパース
    if (dateParts[1] && /^\d{1,2}$/.test(dateParts[1])) {
      const month = parseInt(dateParts[1]) - 1;
      if (month >= 0 && month < 12) {
        dateTime.month = month;
      } else {
        return { isValid: false, dateTime: null };
      }
    }

    // 日のパース
    if (dateParts[2] && /^\d{1,2}$/.test(dateParts[2])) {
      const date = parseInt(dateParts[2]);
      dateTime.date = date;
      // 日付が有効かチェック
      if (!isValidDateTime(dateTime)) {
        return { isValid: false, dateTime: null };
      }
    }
  }

  // 時刻部分のパース
  if (timePart) {
    const timeParts = timePart.split(":");

    // 時のパース
    if (timeParts[0] && /^\d{1,2}$/.test(timeParts[0])) {
      const hour = parseInt(timeParts[0]);
      if (hour >= 0 && hour <= 23) {
        dateTime.hour = hour;
      } else {
        return { isValid: false, dateTime: null };
      }
    }

    // 分のパース
    if (timeParts[1] && /^\d{1,2}$/.test(timeParts[1])) {
      const minute = parseInt(timeParts[1]);
      if (minute >= 0 && minute <= 59) {
        dateTime.minute = minute;
      } else {
        return { isValid: false, dateTime: null };
      }
    }
  }

  return { isValid: true, dateTime };
}

/**
 * 表示用に "YYYY/MM/DD HH:mm" 形式へフォーマット
 */
function formatDisplayDateTime(dateTime: DateTimeState | null): string {
  if (!dateTime) return "";

  const y = dateTime.year ?? "";
  const m =
    dateTime.month != null ? String(dateTime.month + 1).padStart(2, "0") : "";
  const d = dateTime.date != null ? String(dateTime.date).padStart(2, "0") : "";
  const h =
    dateTime.hour != null ? String(dateTime.hour).padStart(2, "0") : "--";
  const min =
    dateTime.minute != null ? String(dateTime.minute).padStart(2, "0") : "--";

  // すべて揃っていなければ途中で抜けるようにしたければ要調整
  const dateStr = y && m && d ? `${y}/${m}/${d}` : "";
  const timeStr = h && min ? `${h}:${min}` : "";

  // dateStr だけ、timeStr だけ、両方、などで出力揃えたい場合は好みに応じて
  if (dateStr && timeStr) {
    return `${dateStr} ${timeStr}`;
  }

  if (dateStr) {
    return dateStr;
  }

  return timeStr;
}

// ---- ここから Web Component 本体 ----
@customElement("recomped-datetime-picker")
export class DatetimePicker extends LitElement {
  @property({ type: String }) locale = "ja";
  @property({ type: Boolean }) disabled = false;

  @state() private isOpen = false;
  @state() private isEditing = false;
  private boundHandleDocumentClick: (e: MouseEvent) => void;
  private boundHandleKeydown: (e: KeyboardEvent) => void;
  private boundHandleResize: () => void;
  private resizeRafId = 0;
  private targetInput: HTMLInputElement | null = null;
  private inputEventListeners: Map<
    HTMLInputElement,
    {
      focus: () => void;
      input: (e: Event) => void;
      change: (e: Event) => void;
    }
  > = new Map();

  // インスタンス固有の状態を constructor で初期化
  @state() private year: number;
  @state() private month: number;
  @state() private selectedDate?: number;
  @state() private selectedHour?: number;
  @state() private selectedMinute?: number;
  private lastValidDateTime: DateTimeState | null;
  private currentInputValue: string;

  constructor() {
    super();
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth();
    this.lastValidDateTime = null;
    this.currentInputValue = "";
    this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
    this.boundHandleKeydown = this.handleKeydown.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);
  }

  // ----------------------------------------
  // CSS
  // ----------------------------------------
  static styles = css`
    :host {
      display: contents;
    }
    .picker-container {
      position: absolute;
      z-index: 9999;
      background: var(--dt-background, white);
      border-radius: var(--dt-border-radius, 0.5rem);
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      display: none;
      padding: 0.75rem;
      width: fit-content;
    }
    .picker-container.open {
      display: block;
    }
    .picker-content {
      display: grid;
      grid-template-columns: auto auto;
      grid-template-areas: "calendar time";
      gap: 0.75rem;
    }
    .calendar-section {
      grid-area: calendar;
      display: flex;
      flex-direction: column;
    }
    .calendar-with-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .time-section {
      grid-area: time;
      border-left: 1px solid var(--dt-border-color, #e5e7eb);
      padding-left: 0.75rem;
    }
    .picker-footer {
      display: flex;
      justify-content: end;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--dt-border-color, #e5e7eb);
    }
    button {
      padding: 0.375rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .clear-button,
    .today-button {
      border: 1px solid var(--dt-border-color, #e5e7eb);
      color: var(--dt-text, #6b7280);
      background: #ffffff;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.125rem;
    }
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
    }
    .calendar-nav-button {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      color: var(--dt-text, rgb(107, 114, 128));
      border: none;
      height: 1.8rem;
      width: 2rem;
      padding: 0.5rem;
      cursor: pointer;
      border-radius: 0.5rem;
    }
    .calendar-nav-button:hover {
      background: var(--dt-hover-bg, #f8f9fa);
    }
    .day-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 1.8rem;
      width: 2rem;
      cursor: pointer;
      border-radius: 0.5rem;
    }
    .day-cell.out-of-month {
      opacity: 0.2;
      cursor: default;
    }
    .day-cell.out-of-month:hover {
      background: inherit;
    }
    .day-cell:hover {
      background: var(--dt-hover-bg, #f3f4f6);
    }
    .day-cell.selected {
      background: var(--dt-selected-bg, rgb(235, 245, 255));
      color: rgb(28, 100, 242);
    }
    .day-cell.today:not(.selected) {
      background: rgb(243, 244, 246);
    }
    .day-header {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      color: var(--dt-header-text, #6b7280);
      height: 2rem;
      width: 2rem;
    }
    .sunday,
    .day-cell.sunday:not(.selected) {
      color: var(--dt-sunday-color, #dc2626);
    }
    .saturday,
    .day-cell.saturday:not(.selected) {
      color: var(--dt-saturday-color, #2563eb);
    }
    .time-picker {
      display: flex;
      flex-direction: column;
    }
    .time-display {
      text-align: center;
      font-size: 1.25rem;
      font-weight: bold;
      color: var(--dt-text, #1f2937);
      margin-bottom: 0.75rem;
    }
    .time-grid {
      display: grid;
      grid-template-columns: min-content min-content min-content;
    }
    .time-column {
      display: grid;
      grid-template-rows: auto repeat(12, 1fr);
      gap: 0.125rem;
    }
    .time-column:nth-child(2) {
      border-right: 1px solid var(--dt-border-color, #e5e7eb);
      padding-right: 0.5rem;
      margin-right: 0.5rem;
    }
    .column-header {
      text-align: center;
      font-weight: 500;
      color: var(--dt-header-text, #6b7280);
      font-size: 0.75rem;
      padding-bottom: 0.25rem;
    }
    .time-button {
      padding: 0.125rem;
      width: 2.5rem;
      white-space: nowrap;
      padding: auto 0.5rem;
      text-align: center;
      border-radius: 0.25rem;
      cursor: pointer;
      border: none;
      background: none;
      font-size: 0.75rem;
    }
    .time-button:hover {
      background: var(--dt-hover-bg, #f3f4f6);
    }
    .time-button.selected {
      background: var(--dt-selected-bg, rgb(235, 245, 255));
      color: rgb(28, 100, 242);
    }
  `;

  // ----------------------------------------
  // render
  // ----------------------------------------
  render() {
    return html`
      <div
        class="picker-container ${this.isOpen ? "open" : ""}"
        @click=${(e: Event) => e.stopPropagation()}>
        <div class="picker-content">
          <div class="calendar-section">
            ${this.renderCalendar()}
            <div class="picker-footer">
              <button class="clear-button" @click=${this.handleClear}>
                ${this.locale === "ja" ? "クリア" : "Clear"}
              </button>
              <button class="today-button" @click=${this.handleToday}>
                ${this.locale === "ja" ? "今日" : "Today"}
              </button>
            </div>
          </div>
          <div class="time-section">${this.renderTimePicker()}</div>
        </div>
      </div>
    `;
  }

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------
  connectedCallback() {
    super.connectedCallback();
    this.setupInputElements();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeDocumentClickHandler();
    document.removeEventListener("keydown", this.boundHandleKeydown);
    window.removeEventListener("resize", this.boundHandleResize);
    cancelAnimationFrame(this.resizeRafId);
    this.cleanupInputElements();
  }

  private setupInputElements() {
    for (const input of document.querySelectorAll(
      "input[data-recomped-datetime-picker]"
    )) {
      if (input instanceof HTMLInputElement) {
        this.setupInput(input);
      }
    }
  }

  private cleanupInputElements() {
    for (const input of document.querySelectorAll(
      "input[data-recomped-datetime-picker]"
    )) {
      if (input instanceof HTMLInputElement) {
        this.cleanupInput(input);
      }
    }
  }

  public setupInput(input: HTMLInputElement) {
    // Create bound event listeners
    const listeners = {
      focus: () => this.open(input),
      input: (e: Event) => this.handleInput(e),
      change: (e: Event) => this.handleChange(e),
    };

    // Store the listeners for later cleanup
    this.inputEventListeners.set(input, listeners);

    // Add the event listeners
    input.addEventListener("focus", listeners.focus);
    input.addEventListener("input", listeners.input);
    input.addEventListener("change", listeners.change);
  }

  public cleanupInput(input: HTMLInputElement) {
    const listeners = this.inputEventListeners.get(input);
    if (listeners) {
      // Remove event listeners using stored references
      input.removeEventListener("focus", listeners.focus);
      input.removeEventListener("input", listeners.input);
      input.removeEventListener("change", listeners.change);

      // Remove from the Map
      this.inputEventListeners.delete(input);
    }
  }

  public open(input: HTMLInputElement) {
    if (this.disabled) return;
    if (this.isOpen && input === this.targetInput) return;
    if (this.isOpen) this.closePicker();

    this.targetInput = input;
    this.isOpen = true;

    // 入力値に基づいて状態を初期化
    const result = parseDateTime(input.value);
    if (result.isValid && result.dateTime) {
      this.lastValidDateTime = result.dateTime;
      this.year = result.dateTime.year ?? new Date().getFullYear();
      this.month = result.dateTime.month ?? new Date().getMonth();
      this.selectedDate = result.dateTime.date ?? undefined;
      this.selectedHour = result.dateTime.hour ?? undefined;
      this.selectedMinute = result.dateTime.minute ?? undefined;
    } else {
      // 未入力の場合は現在の年月のみ設定し、その他はリセット
      const now = new Date();
      this.year = now.getFullYear();
      this.month = now.getMonth();
      this.selectedDate = undefined;
      this.selectedHour = undefined;
      this.selectedMinute = undefined;
      this.lastValidDateTime = null;
    }

    this.updatePickerPosition(input);
    this.addDocumentClickHandler();
    document.addEventListener("keydown", this.boundHandleKeydown);
    window.addEventListener("resize", this.boundHandleResize);
  }

  private updatePickerPosition(input: HTMLInputElement) {
    const rect = input.getBoundingClientRect();
    const picker = this.shadowRoot?.querySelector(
      ".picker-container"
    ) as HTMLElement;
    if (!picker) return;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const pickerHeight = picker.offsetHeight;
    const pickerWidth = picker.offsetWidth;

    // 横位置: 左右はみ出し対応
    let left = rect.left + window.scrollX;
    if (rect.left + pickerWidth > viewportWidth) {
      left = rect.right + window.scrollX - pickerWidth;
    }
    if (left < window.scrollX) {
      left = window.scrollX;
    }
    picker.style.left = `${left}px`;

    // 縦位置: 下方向に収まらない場合は上方向に配置
    if (rect.bottom + pickerHeight > viewportHeight) {
      picker.style.top = `${rect.top + window.scrollY - pickerHeight - 8}px`;
    } else {
      picker.style.top = `${rect.bottom + window.scrollY + 8}px`;
    }
  }

  private handleDateClick(date: number, event: Event) {
    event.stopPropagation(); // イベントの伝播を停止
    if (!this.targetInput) return;

    const newDateTime: DateTimeState = {
      year: this.year,
      month: this.month,
      date,
      hour: this.selectedHour ?? null,
      minute: this.selectedMinute ?? null,
    };
    this.lastValidDateTime = newDateTime;
    this.updatePickerState(newDateTime);
    this.updateInputValue(newDateTime);
  }

  private handleHourClick(hour: number, event: Event) {
    event.stopPropagation();
    if (!this.targetInput) return;

    const newDateTime: DateTimeState = {
      year: this.lastValidDateTime?.year ?? null,
      month: this.lastValidDateTime?.month ?? null,
      date: this.lastValidDateTime?.date ?? null,
      hour,
      minute: this.selectedMinute ?? null,
    };
    this.lastValidDateTime = newDateTime;
    this.updatePickerState(newDateTime);
    this.updateInputValue(newDateTime);
  }

  private handleMinuteClick(minute: number, event: Event) {
    event.stopPropagation();
    if (!this.targetInput) return;

    const newDateTime: DateTimeState = {
      year: this.lastValidDateTime?.year ?? null,
      month: this.lastValidDateTime?.month ?? null,
      date: this.lastValidDateTime?.date ?? null,
      hour: this.selectedHour ?? null,
      minute,
    };
    this.lastValidDateTime = newDateTime;
    this.updatePickerState(newDateTime);
    this.updateInputValue(newDateTime);
  }

  private handleClear() {
    if (this.targetInput) {
      this.targetInput.value = "";
      this.lastValidDateTime = null;
      this.closePicker();
    }
  }

  private handleToday() {
    if (!this.targetInput) return;

    const now = new Date();
    const newDateTime: DateTimeState = {
      year: now.getFullYear(),
      month: now.getMonth(),
      date: now.getDate(),
      hour: now.getHours(),
      minute: Math.floor(now.getMinutes() / 5) * 5,
    };
    this.lastValidDateTime = newDateTime;
    this.updatePickerState(newDateTime);
    this.updateInputValue(newDateTime);
  }

  private updateInputValue(dateTime: DateTimeState) {
    if (!this.targetInput) return;
    const formattedValue = formatDisplayDateTime(dateTime);
    if (this.targetInput.value !== formattedValue) {
      // 値が実際に変更される場合のみイベントを発火
      this.targetInput.value = formattedValue;
      // カスタムイベントを発火
      const event = new CustomEvent("datetime-change", {
        detail: {
          value: formattedValue,
          dateTime: dateTime,
        },
        bubbles: false, // イベントの伝播を防ぐ
        composed: false, // Shadow DOMの境界を越えないようにする
      });
      this.targetInput.dispatchEvent(event);
      this.targetInput.dispatchEvent(new Event("change", { bubbles: false }));
    }
  }

  private handleDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isTargetInputClick = this.targetInput === target;
    const isPickerClick = this.shadowRoot?.contains(target);

    // 入力欄のクリック以外は無視（ピッカー内のクリックは既にstopPropagationされている）
    if (!isTargetInputClick && !isPickerClick) {
      this.closePicker();
    }
  }

  private closePicker() {
    this.isOpen = false;
    this.removeDocumentClickHandler();
    document.removeEventListener("keydown", this.boundHandleKeydown);
    window.removeEventListener("resize", this.boundHandleResize);
    cancelAnimationFrame(this.resizeRafId);
    // ピッカーを閉じる時に選択状態をリセット
    this.selectedDate = undefined;
    this.selectedHour = undefined;
    this.selectedMinute = undefined;
    this.targetInput = null;
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.closePicker();
    }
  }

  private handleResize() {
    cancelAnimationFrame(this.resizeRafId);
    this.resizeRafId = requestAnimationFrame(() => {
      if (this.targetInput) {
        this.updatePickerPosition(this.targetInput);
      }
    });
  }

  // ----------------------------------------
  // カレンダー表示
  // ----------------------------------------
  private renderCalendar() {
    return html`
      <div class="calendar">
        <div class="calendar-header">
          <button class="calendar-nav-button" @click=${this.previousMonth}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 10">
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 5H1m0 0L5 9M1 5l4-4"></path>
            </svg>
          </button>
          <span>${this.formatMonthYear()}</span>
          <button class="calendar-nav-button" @click=${this.nextMonth}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 10">
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M1 5h12m0 0L9 1m4 4L9 9"></path>
            </svg>
          </button>
        </div>
        <div class="calendar-grid">
          ${this.renderDayHeaders()} ${this.renderDays()}
        </div>
      </div>
    `;
  }

  private formatMonthYear() {
    return new Date(this.year, this.month).toLocaleDateString(this.locale, {
      year: "numeric",
      month: "long",
    });
  }

  private renderDayHeaders() {
    const days =
      this.locale === "ja"
        ? ["日", "月", "火", "水", "木", "金", "土"]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map(
      (day, i) => html`
        <div
          class="day-header ${i === 0 ? "sunday" : i === 6 ? "saturday" : ""}">
          ${day}
        </div>
      `
    );
  }

  private renderDays() {
    const firstDay = new Date(this.year, this.month, 1);
    const lastDay = new Date(this.year, this.month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();
    const days = [];

    // 前月の空白埋め
    // 前月の日付を計算
    const prevMonthLastDate = new Date(this.year, this.month, 0);
    const prevMonthDays = prevMonthLastDate.getDate();
    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = prevMonthDays - firstDayOfWeek + i + 1;
      const isSunday = i === 0;
      const isSaturday = i === 6;
      days.push(
        html`<div
          class="day-cell out-of-month ${isSunday ? "sunday" : ""} ${
            isSaturday ? "saturday" : ""
          }">
          ${day}
        </div>`
      );
    }

    // 当月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      let isSelected = false;
      if (this.isEditing) {
        const result = parseDateTime(this.currentInputValue);
        if (result.isValid && result.dateTime) {
          isSelected =
            day === result.dateTime.date &&
            this.year === result.dateTime.year &&
            this.month === result.dateTime.month;
        }
      } else {
        isSelected =
          day === this.selectedDate &&
          this.year === this.lastValidDateTime?.year &&
          this.month === this.lastValidDateTime?.month;
      }

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
    // 最後の日の曜日から7を引いた余りの日数だけ埋める
    const lastDayOfWeek = (firstDayOfWeek + daysInMonth - 1) % 7;
    const remainingDays = lastDayOfWeek < 6 ? 6 - lastDayOfWeek : 0;
    for (let i = 1; i <= remainingDays; i++) {
      const dayOfWeek = (firstDayOfWeek + daysInMonth + i - 1) % 7;
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;
      days.push(
        html`<div
          class="day-cell out-of-month ${isSunday ? "sunday" : ""} ${
            isSaturday ? "saturday" : ""
          }">
          ${i}
        </div>`
      );
    }

    return days;
  }

  private isToday(day: number): boolean {
    const today = new Date();
    return (
      today.getFullYear() === this.year &&
      today.getMonth() === this.month &&
      today.getDate() === day
    );
  }

  private previousMonth() {
    if (this.month === 0) {
      this.month = 11;
      this.year--;
    } else {
      this.month--;
    }
  }
  private nextMonth() {
    if (this.month === 11) {
      this.month = 0;
      this.year++;
    } else {
      this.month++;
    }
  }

  // ----------------------------------------
  // 時刻ピッカー表示
  // ----------------------------------------
  private renderTimePicker() {
    return html`
      <div class="time-picker">
        <div class="time-display">${this.formatTime()}</div>
        <div class="time-grid">
          ${this.renderHoursPicker()} ${this.renderMinutesPicker()}
        </div>
      </div>
    `;
  }

  private formatTime() {
    if (this.isEditing) {
      const result = parseDateTime(this.currentInputValue);
      if (result.isValid && result.dateTime) {
        const hour =
          result.dateTime.hour != null
            ? String(result.dateTime.hour).padStart(2, "0")
            : "--";
        const minute =
          result.dateTime.minute != null
            ? String(result.dateTime.minute).padStart(2, "0")
            : "--";
        return `${hour}:${minute}`;
      }
    }

    const hour =
      this.lastValidDateTime?.hour != null
        ? String(this.lastValidDateTime.hour).padStart(2, "0")
        : "--";
    const minute =
      this.lastValidDateTime?.minute != null
        ? String(this.lastValidDateTime.minute).padStart(2, "0")
        : "--";
    return `${hour}:${minute}`;
  }

  private renderHoursPicker() {
    const amLabel = this.locale === "ja" ? "午前" : "AM";
    const pmLabel = this.locale === "ja" ? "午後" : "PM";

    return html`
      <div class="time-column">
        <div class="column-header">${amLabel}</div>
        ${Array.from(
          { length: 12 },
          (_, i) => html`
            <button
              class="time-button ${this.selectedHour === i ? "selected" : ""}"
              @click=${(e: Event) => this.handleHourClick(i, e)}>
              ${(() => {
                const hour = this.locale === "ja" ? i : i === 0 ? 12 : i;
                return this.locale === "ja" ? `${hour}時` : `${hour} AM`;
              })()}
            </button>
          `
        )}
      </div>
      <div class="time-column">
        <div class="column-header">${pmLabel}</div>
        ${Array.from(
          { length: 12 },
          (_, i) => html`
            <button
              class="time-button ${
                this.selectedHour === i + 12 ? "selected" : ""
              }"
              @click=${(e: Event) => this.handleHourClick(i + 12, e)}>
              ${(() => {
                const hour = this.locale === "ja" ? i + 12 : i === 0 ? 12 : i;
                return this.locale === "ja" ? `${hour}時` : `${hour} PM`;
              })()}
            </button>
          `
        )}
      </div>
    `;
  }

  private renderMinutesPicker() {
    const minLabel = this.locale === "ja" ? "分" : "Min";
    return html`
      <div class="time-column">
        <div class="column-header">${minLabel}</div>
        ${Array.from({ length: 12 }, (_, i) => {
          const mVal = i * 5;
          return html`
            <button
              class="time-button ${
                this.selectedMinute === mVal ? "selected" : ""
              }"
              @click=${(e: Event) => this.handleMinuteClick(mVal, e)}>
              ${mVal}${this.locale === "ja" ? "分" : ""}
            </button>
          `;
        })}
      </div>
    `;
  }

  // ----------------------------------------
  // Utility
  // ----------------------------------------
  private addDocumentClickHandler() {
    document.addEventListener("click", this.boundHandleDocumentClick);
  }
  private removeDocumentClickHandler() {
    document.removeEventListener("click", this.boundHandleDocumentClick);
  }

  private updatePickerState(dateTime: DateTimeState) {
    if (dateTime.year != null) this.year = dateTime.year;
    if (dateTime.month != null) this.month = dateTime.month;
    if (dateTime.date != null) this.selectedDate = dateTime.date;
    if (dateTime.hour != null) this.selectedHour = dateTime.hour;
    if (dateTime.minute != null) this.selectedMinute = dateTime.minute;
    this.requestUpdate();
  }

  private handleInput(e: Event) {
    if (!this.targetInput) return;
    const input = e.target as HTMLInputElement;
    const result = parseDateTime(input.value);

    if (result.isValid && result.dateTime) {
      // 部分的な更新を許可
      this.updatePickerState(result.dateTime);

      // 入力中フラグを設定
      this.isEditing = true;
      this.currentInputValue = input.value;
    }
  }

  private handleChange(e: Event) {
    if (!this.targetInput) return;
    const input = e.target as HTMLInputElement;
    const result = parseDateTime(input.value);

    if (result.isValid && result.dateTime) {
      // 完全な日時の場合のみlastValidDateTimeを更新
      if (
        result.dateTime.year != null &&
        result.dateTime.month != null &&
        result.dateTime.date != null &&
        result.dateTime.hour != null &&
        result.dateTime.minute != null
      ) {
        this.lastValidDateTime = result.dateTime;
        this.updatePickerState(result.dateTime);
        // フォーマットして表示を更新
        this.updateInputValue(result.dateTime);
      } else if (input.value.trim() !== "") {
        // 不完全な日時は前回の有効な値に戻す
        if (this.lastValidDateTime) {
          this.updateInputValue(this.lastValidDateTime);
          this.updatePickerState(this.lastValidDateTime);
        } else {
          input.value = "";
        }
      }
    } else if (input.value.trim() !== "") {
      // 無効な値は前回の有効な値に戻す
      if (this.lastValidDateTime) {
        this.updateInputValue(this.lastValidDateTime);
        this.updatePickerState(this.lastValidDateTime);
      } else {
        input.value = "";
      }
    }

    this.isEditing = false;
  }
}

// 初期化用のグローバル関数
export function initDatetimePicker() {
  if (!customElements.get("recomped-datetime-picker")) {
    customElements.define("recomped-datetime-picker", DatetimePicker);
  }

  // 既存のピッカーがなければ作成
  if (!document.querySelector("recomped-datetime-picker")) {
    const picker = document.createElement("recomped-datetime-picker");
    document.body.appendChild(picker);
  }
}
