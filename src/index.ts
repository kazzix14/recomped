import { DatePicker, initDatePicker } from "./date-picker";
import { DatetimePicker, initDatetimePicker } from "./datetime-picker";
export { DatetimePicker, initDatetimePicker, DatePicker, initDatePicker };
export type { DateTimeState } from "./types";
export type { DateTimeChangeEvent } from "./datetime-picker";
export type { DateState, DateChangeEvent } from "./date-picker";

// Get the singleton instances
const getDatetimePicker = (): DatetimePicker | null => {
  const picker = document.querySelector("recomped-datetime-picker");
  return picker instanceof DatetimePicker ? picker : null;
};

const getDatePicker = (): DatePicker | null => {
  const picker = document.querySelector("recomped-date-picker");
  return picker instanceof DatePicker ? picker : null;
};

// Setup a single input element
export const setupDatetimePickerInput = (input: HTMLInputElement): void => {
  const picker = getDatetimePicker();
  if (!picker) {
    console.warn(
      "DatetimePicker component not found. Make sure to call initDatetimePicker() first."
    );
    return;
  }
  picker.setupInput(input);
};

export const setupDatePickerInput = (input: HTMLInputElement): void => {
  const picker = getDatePicker();
  if (!picker) {
    console.warn(
      "DatePicker component not found. Make sure to call initDatePicker() first."
    );
    return;
  }
  picker.setupInput(input);
};

// Cleanup a single input element
export const cleanupDatetimePickerInput = (input: HTMLInputElement): void => {
  const picker = getDatetimePicker();
  if (!picker) {
    console.warn("DatetimePicker component not found.");
    return;
  }
  picker.cleanupInput(input);
};

export const cleanupDatePickerInput = (input: HTMLInputElement): void => {
  const picker = getDatePicker();
  if (!picker) {
    console.warn("DatePicker component not found.");
    return;
  }
  picker.cleanupInput(input);
};
