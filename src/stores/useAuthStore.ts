import { create } from "zustand";
import type { UserRole, UserAccess } from "@/types";

interface AuthSnapshot {
  uid: string | null;
  email: string | null;
  role: UserRole | null;
  access: UserAccess | null;
  isAuthenticated: boolean;
}

interface AuthStore extends AuthSnapshot {
  setAuth: (data: Omit<AuthSnapshot, "isAuthenticated">) => void;
  clearAuth: () => void;
}

const initialState: AuthSnapshot = {
  uid: null,
  email: null,
  role: null,
  access: null,
  isAuthenticated: false,
};

/**
 * Client-side auth snapshot for UI convenience only.
 * All security decisions MUST be validated server-side.
 * This store is NOT persisted — it resets on page reload.
 */
export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setAuth: (data) =>
    set({
      uid: data.uid,
      email: data.email,
      role: data.role,
      access: data.access,
      isAuthenticated: !!data.uid,
    }),
  clearAuth: () => set(initialState),
}));
