import { Meta, StoryFn } from "@storybook/web-components";
import { html } from "lit";
import "./date-picker";
import { initDatePicker } from "./date-picker";

export default {
  title: "Components/DatePicker",
  parameters: {
    layout: "centered",
  },
} as Meta;

const Template: StoryFn = () => {
  // コンポーネントのマウント時に初期化
  requestAnimationFrame(() => {
    initDatePicker();
  });

  return html`
    <div style="width: 300px;">
      <div style="margin-bottom: 1rem;">
        <label>日付を選択：</label>
        <input
          data-recomped-date-picker
          placeholder="YYYY/MM/DD"
          style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; font-size: 0.875rem;" />
      </div>

      <div style="margin-bottom: 1rem;">
        <label>初期値あり：</label>
        <input
          data-recomped-date-picker
          value="2025/01/04"
          placeholder="YYYY/MM/DD"
          style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; font-size: 0.875rem;" />
      </div>

      <div>
        <label>無効化：</label>
        <input
          data-recomped-date-picker
          disabled
          placeholder="YYYY/MM/DD"
          style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; font-size: 0.875rem; background: #f3f4f6;" />
      </div>

      <div>
        <label>スタイルなし：</label>
        <input data-recomped-date-picker placeholder="YYYY/MM/DD" />
      </div>
    </div>
  `;
};

export const Default = Template.bind({});
Default.args = {};
