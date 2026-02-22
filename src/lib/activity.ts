import { adminDb } from "./firebase-admin";
import type { ActivityAction } from "@/types";

/**
 * Logs a structural or destructive action to Firestore.
 * Called server-side only after the action succeeds.
 */
export async function logActivity(
  action: ActivityAction,
  performedBy: string,
  targetId: string
): Promise<void> {
  await adminDb.collection("activity_logs").add({
    action,
    performedBy,
    targetId,
    timestamp: Date.now(),
  });
}
