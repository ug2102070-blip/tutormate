"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { updateUserPresence } from "@/actions/presenceActions";

/**
 * Updates current user's presence heartbeat via Server Action (Admin SDK).
 * Guarantees zero permission errors regardless of client Firestore security rules status.
 */
export function usePresence(uid: string | null | undefined) {
  useEffect(() => {
    if (!uid) return;

    async function sendPresence(isOnline: boolean) {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const token = await currentUser.getIdToken();
        if (token) {
          await updateUserPresence(token, isOnline);
        }
      } catch {
        // Silently swallow any transient network or auth errors
      }
    }

    function updateOnline() {
      sendPresence(true);
    }

    function updateOffline() {
      sendPresence(false);
    }

    // Set online immediately
    updateOnline();

    // Heartbeat every 35 seconds
    const interval = setInterval(updateOnline, 35000);

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateOnline();
      } else {
        updateOffline();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", updateOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", updateOffline);
      updateOffline();
    };
  }, [uid]);
}

export interface PresenceState {
  isOnline: boolean;
  lastSeenText: string;
  loading: boolean;
}

/**
 * Listens to real-time presence of a target user (e.g., teacher or student).
 */
export function useUserPresence(targetUid: string | null | undefined): PresenceState {
  const [state, setState] = useState<PresenceState>({
    isOnline: false,
    lastSeenText: "Offline",
    loading: true,
  });

  useEffect(() => {
    if (!targetUid) {
      setState({ isOnline: false, lastSeenText: "Offline", loading: false });
      return;
    }

    const presenceRef = doc(db, "presence", targetUid);

    const unsubscribe = onSnapshot(
      presenceRef,
      (snap) => {
        if (!snap.exists()) {
          setState({ isOnline: false, lastSeenText: "Offline", loading: false });
          return;
        }

        const data = snap.data();
        const rawIsOnline = Boolean(data.isOnline);
        const lastSeenTs = data.lastSeen as Timestamp | undefined;

        if (!lastSeenTs) {
          setState({ isOnline: false, lastSeenText: "Offline", loading: false });
          return;
        }

        const lastSeenDate = lastSeenTs.toDate();
        const now = new Date();
        const diffSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);

        // Active if updated in the last 70 seconds
        const isOnline = rawIsOnline && diffSeconds < 70;

        let lastSeenText = "Offline";
        if (isOnline) {
          lastSeenText = "Active now";
        } else if (diffSeconds < 60) {
          lastSeenText = "Active a moment ago";
        } else if (diffSeconds < 3600) {
          const mins = Math.floor(diffSeconds / 60);
          lastSeenText = `Active ${mins}m ago`;
        } else if (diffSeconds < 86400) {
          const hours = Math.floor(diffSeconds / 3600);
          lastSeenText = `Active ${hours}h ago`;
        } else {
          lastSeenText = `Last seen ${lastSeenDate.toLocaleDateString()}`;
        }

        setState({ isOnline, lastSeenText, loading: false });
      },
      () => {
        // Handle fallback silently if read fails
        setState({ isOnline: false, lastSeenText: "Offline", loading: false });
      }
    );

    return unsubscribe;
  }, [targetUid]);

  return state;
}
