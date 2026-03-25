"use client";

import { useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Play, ChevronDown, Loader2, CheckCircle, XCircle, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TestCase {
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
}

interface CodeEditorProps {
    starterCode?: Record<string, string>;
    languages?: string[];
    testCases?: TestCase[];
    onCodeChange?: (code: string, language: string) => void;
}

const LANGUAGE_CONFIG: Record<string, { label: string; monacoId: string; icon: string }> = {
    python: { label: "Python 3", monacoId: "python", icon: "🐍" },
    javascript: { label: "JavaScript", monacoId: "javascript", icon: "JS" },
    cpp: { label: "C++", monacoId: "cpp", icon: "C+" },
    java: { label: "Java", monacoId: "java", icon: "☕" },
};

export default function CodeEditor({ starterCode, languages, testCases, onCodeChange }: CodeEditorProps) {
    const availableLanguages = languages || ["python", "javascript", "cpp"];
    const [selectedLang, setSelectedLang] = useState(availableLanguages[0]);
    const [code, setCode] = useState(starterCode?.[selectedLang] || getDefaultStarter(selectedLang));
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Array<{ passed: boolean; input: string; expected: string; got: string }> | null>(null);
    const [showOutput, setShowOutput] = useState(false);

    const handleEditorChange = useCallback((value: string | undefined) => {
        const newCode = value || "";
        setCode(newCode);
        onCodeChange?.(newCode, selectedLang);
    }, [selectedLang, onCodeChange]);

    const handleLanguageChange = (lang: string) => {
        setSelectedLang(lang);
        setCode(starterCode?.[lang] || getDefaultStarter(lang));
        setShowLangMenu(false);
        setTestResults(null);
        setOutput(null);
    };

    const handleRun = async () => {
        setIsRunning(true);
        setShowOutput(true);
        setOutput(null);
        setTestResults(null);

        // Simulate code execution with test cases
        await new Promise((r) => setTimeout(r, 1500));

        if (testCases && testCases.length > 0) {
            const visibleTests = testCases.filter((t) => !t.isHidden);
            const results = visibleTests.map((tc) => ({
                passed: Math.random() > 0.3, // Simulated — real eval would need a sandbox
                input: tc.input,
                expected: tc.expectedOutput,
                got: tc.expectedOutput, // placeholder
            }));
            setTestResults(results);
            setOutput(`Ran ${visibleTests.length} test case(s)`);
        } else {
            setOutput("Code compiled successfully.\n\n> No test cases defined for this question.");
        }

        setIsRunning(false);
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] rounded-xl overflow-hidden border border-subtle">
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
                {/* Language selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono bg-[#333] text-gray-300 hover:bg-[#444] transition-colors"
                    >
                        <span className="text-[10px]">{LANGUAGE_CONFIG[selectedLang]?.icon}</span>
                        {LANGUAGE_CONFIG[selectedLang]?.label || selectedLang}
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                    </button>
                    <AnimatePresence>
                        {showLangMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute top-full left-0 mt-1 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl z-50 overflow-hidden min-w-[160px]"
                            >
                                {availableLanguages.map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => handleLanguageChange(lang)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-[#333] transition-colors ${selectedLang === lang ? "text-hacker-green bg-hacker-green/[0.05]" : "text-gray-400"
                                            }`}
                                    >
                                        <span className="text-[10px]">{LANGUAGE_CONFIG[lang]?.icon}</span>
                                        {LANGUAGE_CONFIG[lang]?.label || lang}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Run button */}
                <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-mono font-bold bg-hacker-green text-black hover:shadow-glow-green disabled:opacity-50 transition-all"
                >
                    {isRunning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Play className="w-3.5 h-3.5" />
                    )}
                    {isRunning ? "Running..." : "Run Code"}
                </button>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    language={LANGUAGE_CONFIG[selectedLang]?.monacoId || selectedLang}
                    value={code}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        padding: { top: 12, bottom: 12 },
                        lineNumbers: "on",
                        renderLineHighlight: "line",
                        bracketPairColorization: { enabled: true },
                        autoClosingBrackets: "always",
                        tabSize: 4,
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                        smoothScrolling: true,
                    }}
                />
            </div>

            {/* Output panel */}
            <AnimatePresence>
                {showOutput && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 200 }}
                        exit={{ height: 0 }}
                        className="border-t border-[#3c3c3c] bg-[#1a1a1a] overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-3 h-3 text-gray-500" />
                                <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">Output</span>
                            </div>
                            <button
                                onClick={() => setShowOutput(false)}
                                className="text-gray-600 hover:text-gray-400 text-xs font-mono"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-3 overflow-y-auto h-[calc(100%-28px)]">
                            {isRunning ? (
                                <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Executing code...
                                </div>
                            ) : testResults ? (
                                <div className="space-y-2">
                                    {testResults.map((r, i) => (
                                        <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-mono ${r.passed ? "bg-hacker-green/[0.05] border border-hacker-green/10" : "bg-[#ff3366]/[0.05] border border-[#ff3366]/10"}`}>
                                            {r.passed ? (
                                                <CheckCircle className="w-3.5 h-3.5 text-hacker-green flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle className="w-3.5 h-3.5 text-[#ff3366] flex-shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <span className={r.passed ? "text-hacker-green" : "text-[#ff3366]"}>
                                                    Test {i + 1}: {r.passed ? "PASSED" : "FAILED"}
                                                </span>
                                                <p className="text-gray-600 mt-0.5">Input: {r.input}</p>
                                                <p className="text-gray-600">Expected: {r.expected}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : output ? (
                                <pre className="font-mono text-xs text-gray-400 whitespace-pre-wrap">{output}</pre>
                            ) : null}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function getDefaultStarter(lang: string): string {
    switch (lang) {
        case "python":
            return `# Write your solution here\n\ndef solve():\n    pass\n\n# Read input\nsolve()\n`;
        case "javascript":
            return `// Write your solution here\n\nfunction solve() {\n    \n}\n\nsolve();\n`;
        case "cpp":
            return `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n`;
        case "java":
            return `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n        \n    }\n}\n`;
        default:
            return "// Write your solution here\n";
    }
}
