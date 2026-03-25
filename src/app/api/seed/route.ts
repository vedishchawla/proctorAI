// ========================================
// ProctorAI — Seed API
// Populates the database with sample exams and data
// ========================================

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Exam from "@/models/Exam";

const SEED_EXAMS = [
    {
        title: "Data Structures & Algorithms",
        description: "Graphs, dynamic programming, trees, sorting algorithms, and complexity analysis.",
        duration: 60,
        questions: [
            {
                id: "dsa-1",
                text: "Given a weighted directed graph, which algorithm finds the shortest path from a single source to all other vertices, even with negative edge weights?",
                options: ["Dijkstra's Algorithm", "Bellman-Ford Algorithm", "Floyd-Warshall Algorithm", "Prim's Algorithm"],
                correctAnswer: 1, points: 10,
            },
            {
                id: "dsa-2",
                text: "What is the time complexity of detecting a cycle in a directed graph using DFS?",
                options: ["O(V²)", "O(V + E)", "O(E log V)", "O(V × E)"],
                correctAnswer: 1, points: 10,
            },
            {
                id: "dsa-3",
                text: "In the 0/1 Knapsack problem using dynamic programming, what is the space-optimized complexity?",
                options: ["O(n × W)", "O(W)", "O(n)", "O(n + W)"],
                correctAnswer: 1, points: 10,
            },
            {
                id: "dsa-4",
                text: "Which DP approach solves the Longest Common Subsequence (LCS) problem and what is its time complexity?",
                options: ["Greedy — O(n log n)", "Bottom-up DP — O(m × n)", "Divide and Conquer — O(n log n)", "Backtracking — O(2ⁿ)"],
                correctAnswer: 1, points: 10,
            },
            {
                id: "dsa-5",
                text: "In a binary search tree, the inorder traversal of the nodes yields:",
                options: ["Nodes in random order", "Nodes in non-decreasing sorted order", "Nodes in level order", "Nodes in reverse sorted order"],
                correctAnswer: 1, points: 5,
            },
            {
                id: "dsa-6",
                text: "What is the amortized time complexity of operations in a Union-Find with path compression and union by rank?",
                options: ["O(1)", "O(log n)", "O(α(n)) — inverse Ackermann", "O(n)"],
                correctAnswer: 2, points: 10,
            },
            {
                id: "dsa-7",
                text: "Given a matrix of 0s and 1s, which approach efficiently finds the largest square sub-matrix containing only 1s?",
                options: ["BFS from each cell — O(n⁴)", "DP with dp[i][j] = min of 3 neighbors + 1 — O(n²)", "Divide and conquer — O(n² log n)", "Sliding window — O(n³)"],
                correctAnswer: 1, points: 10,
            },
            {
                id: "dsa-8",
                text: "Kruskal's algorithm for MST uses which data structure to efficiently detect cycles?",
                options: ["Priority Queue", "Hash Map", "Disjoint Set Union (Union-Find)", "Stack"],
                correctAnswer: 2, points: 10,
            },
            {
                id: "dsa-9",
                text: "The coin change problem — 'minimum coins to make amount' — has which optimal substructure?",
                options: ["dp[i] = dp[i-1] + 1", "dp[i] = min(dp[i - coin] + 1) for all coins", "dp[i] = max(dp[i - coin]) for all coins", "dp[i] = dp[i/2] + dp[i%2]"],
                correctAnswer: 1, points: 10,
            },
            {
                id: "dsa-10",
                text: "Topological sorting is possible for which type of graph?",
                options: ["Undirected cyclic graph", "Directed Acyclic Graph (DAG)", "Complete graph", "Any connected graph"],
                correctAnswer: 1, points: 5,
            },
        ],
        settings: {
            webcamRequired: true,
            audioRequired: true,
            tabSwitchLimit: 3,
            autoSubmitOnCritical: false,
            calibrationDuration: 30,
        },
        createdBy: "admin",
        isActive: true,
    },
    {
        title: "Operating Systems & Systems Programming",
        description: "Process management, memory management, file systems, synchronization, and deadlocks.",
        duration: 45,
        questions: [
            {
                id: "os-1",
                text: "Which of the following is a necessary condition for a deadlock to occur?",
                options: ["Preemption", "Mutual Exclusion", "Round Robin Scheduling", "Paging"],
                correctAnswer: 1, points: 10,
            },
            {
                id: "os-2",
                text: "In which page replacement algorithm does Belady's anomaly occur?",
                options: ["LRU", "Optimal", "FIFO", "Clock"],
                correctAnswer: 2, points: 10,
            },
            {
                id: "os-3",
                text: "What is the primary purpose of the Translation Lookaside Buffer (TLB)?",
                options: ["Cache disk blocks", "Speed up virtual-to-physical address translation", "Store process control blocks", "Manage I/O devices"],
                correctAnswer: 1, points: 10,
            },
            {
                id: "os-4",
                text: "Which scheduling algorithm can lead to starvation of low-priority processes?",
                options: ["Round Robin", "FCFS", "Priority Scheduling without aging", "Shortest Job Next"],
                correctAnswer: 2, points: 10,
            },
            {
                id: "os-5",
                text: "A semaphore initialized to 1 is equivalent to which synchronization primitive?",
                options: ["Barrier", "Mutex lock", "Read-write lock", "Condition variable"],
                correctAnswer: 1, points: 10,
            },
        ],
        settings: {
            webcamRequired: true,
            audioRequired: true,
            tabSwitchLimit: 3,
            autoSubmitOnCritical: false,
            calibrationDuration: 30,
        },
        createdBy: "admin",
        isActive: true,
    },
    {
        title: "Database Management Systems",
        description: "SQL, normalization, transactions, indexing, query optimization, and NoSQL concepts.",
        duration: 45,
        questions: [
            {
                id: "db-1",
                text: "Which normal form eliminates transitive dependencies?",
                options: ["1NF", "2NF", "3NF", "BCNF"],
                correctAnswer: 2, points: 10,
            },
            {
                id: "db-2",
                text: "In a B+ tree index, data pointers are stored only at:",
                options: ["Root nodes", "Internal nodes", "Leaf nodes", "All nodes"],
                correctAnswer: 2, points: 10,
            },
            {
                id: "db-3",
                text: "Which isolation level in ACID prevents phantom reads?",
                options: ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"],
                correctAnswer: 3, points: 10,
            },
            {
                id: "db-4",
                text: "The CAP theorem states that a distributed database can guarantee at most how many of Consistency, Availability, and Partition tolerance simultaneously?",
                options: ["1", "2", "3", "All with tradeoffs"],
                correctAnswer: 1, points: 10,
            },
            {
                id: "db-5",
                text: "Which join operation returns all rows from both tables, filling unmatched rows with NULL?",
                options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"],
                correctAnswer: 3, points: 10,
            },
        ],
        settings: {
            webcamRequired: true,
            audioRequired: true,
            tabSwitchLimit: 3,
            autoSubmitOnCritical: false,
            calibrationDuration: 30,
        },
        createdBy: "admin",
        isActive: true,
    },
    {
        title: "DSA Coding Challenge",
        description: "Solve coding problems with a real code editor. Your solution is proctored by AI in real time.",
        duration: 60,
        questions: [
            {
                id: "code-1",
                text: "Two Sum\n\nGiven an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice.\n\nReturn the answer as a list of two indices sorted in ascending order.\n\nExample:\n  Input: nums = [2, 7, 11, 15], target = 9\n  Output: [0, 1]\n  Explanation: nums[0] + nums[1] = 2 + 7 = 9",
                type: "coding",
                starterCode: {
                    python: "def two_sum(nums: list[int], target: int) -> list[int]:\n    # Your solution here\n    pass\n\n# Read input\nimport sys\nnums = list(map(int, input().split(',')))\ntarget = int(input())\nprint(two_sum(nums, target))\n",
                    javascript: "function twoSum(nums, target) {\n    // Your solution here\n    \n}\n\n// Read input\nconst nums = readline().split(',').map(Number);\nconst target = Number(readline());\nconsole.log(twoSum(nums, target));\n",
                    cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Your solution here\n    return {};\n}\n\nint main() {\n    // Read input and call twoSum\n    return 0;\n}\n",
                },
                testCases: [
                    { input: "2,7,11,15\\n9", expectedOutput: "[0, 1]", isHidden: false },
                    { input: "3,2,4\\n6", expectedOutput: "[1, 2]", isHidden: false },
                    { input: "3,3\\n6", expectedOutput: "[0, 1]", isHidden: true },
                ],
                languages: ["python", "javascript", "cpp"],
                points: 20,
            },
            {
                id: "code-2",
                text: "Reverse String\n\nWrite a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.\n\nExample:\n  Input: ['h','e','l','l','o']\n  Output: ['o','l','l','e','h']",
                type: "coding",
                starterCode: {
                    python: "def reverse_string(s: list[str]) -> None:\n    # Modify s in-place\n    pass\n\n# Read input\nchars = list(input())\nreverse_string(chars)\nprint(''.join(chars))\n",
                    javascript: "function reverseString(s) {\n    // Modify s in-place\n    \n}\n\nconst s = readline().split('');\nreverseString(s);\nconsole.log(s.join(''));\n",
                    cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvoid reverseString(vector<char>& s) {\n    // Your solution here\n}\n\nint main() {\n    string input;\n    cin >> input;\n    vector<char> s(input.begin(), input.end());\n    reverseString(s);\n    for (char c : s) cout << c;\n    cout << endl;\n    return 0;\n}\n",
                },
                testCases: [
                    { input: "hello", expectedOutput: "olleh", isHidden: false },
                    { input: "Hannah", expectedOutput: "hannaH", isHidden: false },
                    { input: "a", expectedOutput: "a", isHidden: true },
                ],
                languages: ["python", "javascript", "cpp"],
                points: 15,
            },
            {
                id: "code-3",
                text: "FizzBuzz\n\nGiven an integer `n`, return a string array where:\n- answer[i] == \"FizzBuzz\" if i is divisible by 3 and 5.\n- answer[i] == \"Fizz\" if i is divisible by 3.\n- answer[i] == \"Buzz\" if i is divisible by 5.\n- answer[i] == i (as a string) otherwise.\n\nNote: i is 1-indexed.\n\nExample:\n  Input: n = 5\n  Output: [\"1\",\"2\",\"Fizz\",\"4\",\"Buzz\"]",
                type: "coding",
                starterCode: {
                    python: "def fizz_buzz(n: int) -> list[str]:\n    # Your solution here\n    pass\n\nn = int(input())\nresult = fizz_buzz(n)\nprint(','.join(result))\n",
                    javascript: "function fizzBuzz(n) {\n    // Your solution here\n    \n}\n\nconst n = Number(readline());\nconsole.log(fizzBuzz(n).join(','));\n",
                    cpp: "#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nvector<string> fizzBuzz(int n) {\n    // Your solution here\n    return {};\n}\n\nint main() {\n    int n;\n    cin >> n;\n    auto result = fizzBuzz(n);\n    for (int i = 0; i < result.size(); i++) {\n        if (i > 0) cout << \",\";\n        cout << result[i];\n    }\n    cout << endl;\n    return 0;\n}\n",
                },
                testCases: [
                    { input: "5", expectedOutput: "1,2,Fizz,4,Buzz", isHidden: false },
                    { input: "15", expectedOutput: "1,2,Fizz,4,Buzz,Fizz,7,8,Fizz,Buzz,11,Fizz,13,14,FizzBuzz", isHidden: false },
                ],
                languages: ["python", "javascript", "cpp"],
                points: 10,
            },
            {
                id: "mcq-1",
                text: "What is the time complexity of binary search?",
                type: "mcq",
                options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
                correctAnswer: 1,
                points: 5,
            },
            {
                id: "mcq-2",
                text: "Which data structure uses LIFO (Last In, First Out) ordering?",
                type: "mcq",
                options: ["Queue", "Array", "Stack", "Linked List"],
                correctAnswer: 2,
                points: 5,
            },
        ],
        settings: {
            webcamRequired: true,
            audioRequired: true,
            tabSwitchLimit: 3,
            autoSubmitOnCritical: false,
            calibrationDuration: 30,
        },
        createdBy: "admin",
        isActive: true,
    },
];

export async function POST() {
    try {
        await connectDB();

        // Check if exams already exist
        const existing = await Exam.countDocuments();
        if (existing > 0) {
            return NextResponse.json({
                message: `Database already has ${existing} exams. Skipping seed.`,
                seeded: false,
                existingCount: existing,
            });
        }

        // Insert seed exams
        const inserted = await Exam.insertMany(SEED_EXAMS);

        return NextResponse.json({
            message: `Successfully seeded ${inserted.length} exams into MongoDB.`,
            seeded: true,
            count: inserted.length,
            exams: inserted.map((e) => ({ id: e._id, title: e.title })),
        });
    } catch (error) {
        console.error("Seed error:", error);
        return NextResponse.json({ error: "Failed to seed database" }, { status: 500 });
    }
}
