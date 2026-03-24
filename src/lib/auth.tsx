"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
    User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import type { UserRole } from "@/types";

interface AuthUser {
    uid: string;
    name: string;
    email: string;
    avatar: string;
    role: UserRole;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    setUserRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInWithGoogle: async () => {},
    signOut: async () => {},
    setUserRole: async () => {},
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Sync Firebase user with MongoDB
    const syncUserWithDB = async (firebaseUser: FirebaseUser): Promise<AuthUser | null> => {
        try {
            const res = await fetch("/api/auth/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firebaseUID: firebaseUser.uid,
                    name: firebaseUser.displayName || "User",
                    email: firebaseUser.email || "",
                    avatar: firebaseUser.photoURL || "",
                }),
            });

            if (res.ok) {
                const data = await res.json();
                return {
                    uid: firebaseUser.uid,
                    name: data.user.name,
                    email: data.user.email,
                    avatar: data.user.avatar || firebaseUser.photoURL || "",
                    role: data.user.role,
                };
            }
        } catch (error) {
            console.error("Failed to sync user with DB:", error);
        }

        // Fallback if API fails
        return {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "User",
            email: firebaseUser.email || "",
            avatar: firebaseUser.photoURL || "",
            role: "student",
        };
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const authUser = await syncUserWithDB(firebaseUser);
                setUser(authUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Google sign-in error:", error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Sign-out error:", error);
        }
    };

    const setUserRole = async (role: UserRole) => {
        if (!user) return;
        try {
            await fetch("/api/auth/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firebaseUID: user.uid,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                    role,
                }),
            });
            setUser({ ...user, role });
        } catch (error) {
            console.error("Failed to update role:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, setUserRole }}>
            {children}
        </AuthContext.Provider>
    );
}
