import { Meta, StoryFn } from "@storybook/web-components";
import { html } from "lit";
import "./datetime-picker";
import { initDatetimePicker } from "./datetime-picker";

export default {
  title: "Components/DatetimePicker",
  parameters: {
    layout: "centered",
  },
} as Meta;

const Template: StoryFn = () => {
  // コンポーネントのマウント時に初期化
  setTimeout(() => {
    initDatetimePicker();
  }, 0);

  return html`
    <div style="width: 300px;">
      <div style="margin-bottom: 1rem;">
        <label>日時を選択：</label>
        <input
          recomped-datetime-picker
          placeholder="YYYY/MM/DD HH:mm"
          style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; font-size: 0.875rem;" />
      </div>

      <div style="margin-bottom: 1rem;">
        <label>初期値あり：</label>
        <input
          recomped-datetime-picker
          value="2025/01/04 16:20"
          placeholder="YYYY/MM/DD HH:mm"
          style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; font-size: 0.875rem;" />
      </div>

      <div>
        <label>無効化：</label>
        <input
          recomped-datetime-picker
          disabled
          placeholder="YYYY/MM/DD HH:mm"
          style="width: 100%; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; font-size: 0.875rem; background: #f3f4f6;" />
      </div>

      <div>
        <label>スタイルなし：</label>
        <input recomped-datetime-picker placeholder="YYYY/MM/DD HH:mm" />
      </div>
    </div>
  `;
};

export const Default = Template.bind({});
Default.args = {};
