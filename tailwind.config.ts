import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
                display: ["Space Grotesk", "Inter", "sans-serif"],
            },
            colors: {
                hacker: {
                    green: "#00ff88",
                    cyan: "#00d4ff",
                    amber: "#ffb800",
                    rose: "#ff3366",
                    violet: "#8b5cf6",
                    bg: "#0a0a0a",
                    card: "rgba(17, 17, 17, 0.8)",
                },
                surface: {
                    0: "#0a0a0a",
                    1: "#111111",
                    2: "#181818",
                    3: "#222222",
                    4: "#2a2a2a",
                },
            },
            borderColor: {
                subtle: "rgba(255, 255, 255, 0.06)",
                glow: "rgba(0, 255, 136, 0.15)",
            },
            animation: {
                "float": "float 6s ease-in-out infinite",
                "pulse-glow": "pulse-glow 3s ease-in-out infinite",
                "blink": "blink 1s step-end infinite",
                "fade-in-up": "fadeInUp 0.6s ease-out forwards",
            },
            boxShadow: {
                "glow-green": "0 0 20px rgba(0, 255, 136, 0.1), 0 0 40px rgba(0, 255, 136, 0.03)",
                "glow-cyan": "0 0 20px rgba(0, 212, 255, 0.1), 0 0 40px rgba(0, 212, 255, 0.03)",
            },
        },
    },
    plugins: [],
};

export default config;
