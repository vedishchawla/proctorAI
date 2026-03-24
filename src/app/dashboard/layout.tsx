"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Settings, LogOut, Shield, Menu, X } from "lucide-react";

const navItems = [
    { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
    { icon: Users, label: "Students", path: "/dashboard/students" },
    { icon: FileText, label: "Exams", path: "/dashboard/exams" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== "admin")) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-surface-0 flex items-center justify-center font-mono text-xs text-gray-600">
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    authenticating...
                </motion.span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-0 flex">
            {/* Sidebar */}
            <aside className={`fixed lg:sticky top-0 left-0 h-screen w-56 z-50 flex flex-col border-r border-subtle bg-surface-0 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                {/* Logo */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-subtle">
                    <a href="/" className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-hacker-green/10 border border-hacker-green/20 flex items-center justify-center">
                            <span className="text-hacker-green font-mono text-[10px] font-bold">P</span>
                        </div>
                        <span className="text-xs font-mono font-semibold text-white">
                            proctor<span className="text-hacker-green">AI</span>
                        </span>
                    </a>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-600 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <a
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-300 ${
                                    isActive
                                        ? "text-hacker-green bg-hacker-green/[0.05] border border-hacker-green/10"
                                        : "text-gray-600 hover:text-gray-300 hover:bg-white/[0.02] border border-transparent"
                                }`}
                            >
                                <item.icon className="w-3.5 h-3.5" />
                                {item.label}
                            </a>
                        );
                    })}
                </nav>

                {/* User + Logout */}
                <div className="px-3 py-4 border-t border-subtle space-y-2">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                        <div className="w-6 h-6 rounded-md bg-hacker-green/10 flex items-center justify-center text-[10px] font-bold text-hacker-green">
                            {user.name?.charAt(0) || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-mono text-white truncate">{user.name}</p>
                            <p className="text-[9px] font-mono text-gray-600 truncate">{user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { signOut(); router.push("/"); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-mono text-gray-600 hover:text-[#ff3366] hover:bg-[#ff3366]/[0.03] transition-all"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Top bar */}
                <header className="sticky top-0 z-40 glass flex items-center justify-between px-4 py-3 border-b border-subtle">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600 hover:text-white">
                        <Menu className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 font-mono text-xs text-gray-600">
                        <Shield className="w-3.5 h-3.5 text-hacker-green" />
                        <span>Admin Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="status-dot live" />
                        <span className="font-mono text-[10px] text-gray-600">System Active</span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {children}
                </main>
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}
        </div>
    );
}
