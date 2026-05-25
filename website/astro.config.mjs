// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://chouchiu.github.io",
  base: "/heya.skill",
  vite: {
    plugins: [tailwindcss()],
  },
});
