import { DatetimePicker, initDatetimePicker } from "./datetime-picker";
export { DatetimePicker, initDatetimePicker };
export type { DateTimeState, DateTimeChangeEvent } from "./datetime-picker";

// Get the singleton instance
const getDatetimePicker = (): DatetimePicker | null => {
  const picker = document.querySelector("recomped-datetime-picker");
  return picker instanceof DatetimePicker ? picker : null;
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

// Cleanup a single input element
export const cleanupDatetimePickerInput = (input: HTMLInputElement): void => {
  const picker = getDatetimePicker();
  if (!picker) {
    console.warn("DatetimePicker component not found.");
    return;
  }
  picker.cleanupInput(input);
};
