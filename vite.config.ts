import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: "src/datetime-picker.ts",
      formats: ["es"],
    },
  },
});
