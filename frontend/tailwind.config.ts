import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#101415",
        sidebar: "#191c1e",
        card: "#1d2022",
        border: "#2a2f32",
        muted: "#9aa3ab",
        primary: "#2563eb",
        "primary-hover": "#1d4ed8",
        success: "#16a34a",
        warning: "#d97706",
        danger: "#dc2626",
        text: "#e0e3e5",
        "text-muted": "#6b7680",
      },
    },
  },
  plugins: [],
};
export default config;
