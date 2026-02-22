"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useUIStore } from "@/stores/useUIStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        await auth.signOut();
        addToast("error", json.error ?? "Access denied");
        return;
      }

      // AuthProvider will detect the auth state change and redirect
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-light-bg dark:bg-dark-bg">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded bg-card-light p-8 shadow dark:bg-dark-card"
      >
        <h1 className="mb-1 text-lg font-bold text-primary">
          Cloudinary Media Admin
        </h1>
        <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
          Internal access only
        </p>

        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 w-full rounded border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-border-dark dark:bg-dark-bg dark:text-gray-100"
        />

        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-6 w-full rounded border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-border-dark dark:bg-dark-bg dark:text-gray-100"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-primary py-2 text-sm font-medium text-white hover:bg-soft-purple disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
