import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "ui-monospace", "monospace"],
            },
            colors: {
                cyber: {
                    cyan: "#00d4ff",
                    indigo: "#6366f1",
                    violet: "#8b5cf6",
                    dark: "#06060a",
                    darker: "#030306",
                    card: "rgba(15, 15, 25, 0.7)",
                },
                surface: {
                    0: "#06060a",
                    1: "#0a0a12",
                    2: "#0f0f1a",
                    3: "#141422",
                    4: "#1a1a2e",
                },
            },
            borderColor: {
                subtle: "rgba(100, 120, 255, 0.08)",
                glow: "rgba(0, 210, 255, 0.15)",
            },
            animation: {
                "float": "float 6s ease-in-out infinite",
                "pulse-glow": "pulse-glow 3s ease-in-out infinite",
                "spin-slow": "spin 8s linear infinite",
                "breathe": "breathe 4s ease-in-out infinite",
                "fade-in-up": "fadeInUp 0.6s ease-out forwards",
            },
            boxShadow: {
                "glow-cyan": "0 0 20px rgba(0, 210, 255, 0.15), 0 0 40px rgba(0, 210, 255, 0.05)",
                "glow-indigo": "0 0 20px rgba(99, 102, 241, 0.2), 0 0 40px rgba(99, 102, 241, 0.05)",
                "glow-lg": "0 0 40px rgba(0, 210, 255, 0.2), 0 0 80px rgba(99, 102, 241, 0.1)",
            },
        },
    },
    plugins: [],
};

export default config;
