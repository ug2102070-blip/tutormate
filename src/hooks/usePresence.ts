"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateUserPresence } from "@/actions/presenceActions";

/**
 * Updates current user's presence heartbeat via Server Action.
 */
export function usePresence(uid: string | null | undefined) {
  useEffect(() => {
    if (!uid) return;

    const currentUid = uid;
    async function sendPresence(isOnline: boolean) {
      try {
        await updateUserPresence(currentUid, isOnline);
      } catch {
        // Silently swallow transient network errors
      }
    }

    function updateOnline() {
      sendPresence(true);
    }

    function updateOffline() {
      sendPresence(false);
    }

    updateOnline();

    const interval = setInterval(updateOnline, 35000);

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
 * Listens to real-time presence of a target user via Supabase Realtime channel or database query.
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

    const supabase = createClient();

    async function fetchPresence() {
      const { data } = await supabase
        .from("user_presence")
        .select("is_online, last_seen")
        .eq("uid", targetUid)
        .maybeSingle();

      if (!data || !data.last_seen) {
        setState({ isOnline: false, lastSeenText: "Offline", loading: false });
        return;
      }

      const lastSeenDate = new Date(data.last_seen);
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);

      const isOnline = Boolean(data.is_online) && diffSeconds < 70;

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
    }

    fetchPresence();

    const channel = supabase
      .channel(`presence_${targetUid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `uid=eq.${targetUid}`,
        },
        () => {
          fetchPresence();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUid]);

  return state;
}
