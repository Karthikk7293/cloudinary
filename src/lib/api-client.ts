import { auth } from "./firebase";

/**
 * Authenticated fetch wrapper. Automatically attaches the
 * Firebase ID token to the Authorization header.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  const idToken = await currentUser.getIdToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${idToken}`,
    },
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }

  return json;
}
