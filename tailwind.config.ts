import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0B5FFF",
          dark: "#003BCC",
        },
        danger: "#E53935",
        warning: "#F59E0B",
        success: "#10B981",
      },
    },
  },
  plugins: [],
};
export default config;
