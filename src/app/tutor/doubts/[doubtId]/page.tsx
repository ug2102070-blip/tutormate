"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { postMessage, updateDoubtStatus } from "@/actions/doubtActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import type { DoubtDoc, MessageDoc } from "@/types";
import { ArrowLeft, Send, CheckCircle, Image as ImageIcon } from "lucide-react";

export default function TutorDoubtDetailPage({
  params,
}: {
  params: Promise<{ doubtId: string }>;
}) {
  const { doubtId } = use(params);
  const { user } = useAuth();
  const [doubt, setDoubt] = useState<DoubtDoc | null>(null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [replyText, setReplyText] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !doubtId) return;

    const unsubDoubt = onSnapshot(doc(db, "doubts", doubtId), (snap) => {
      if (snap.exists()) {
        setDoubt({ id: snap.id, ...snap.data() } as DoubtDoc);
      }
    });

    const unsubMessages = onSnapshot(
      collection(db, "doubts", doubtId, "messages"),
      (snap) => {
        const list: MessageDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as MessageDoc));
        list.sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());
        setMessages(list);
      }
    );

    return () => {
      unsubDoubt();
      unsubMessages();
    };
  }, [user, doubtId]);

  // Fetch signed URLs for storage media
  useEffect(() => {
    if (!user || !doubt) return;

    async function fetchSignedUrls() {
      const token = await user!.getIdToken();
      const pathsToFetch: string[] = [];

      if (doubt?.attachmentPath) pathsToFetch.push(doubt.attachmentPath);
      messages.forEach((m) => {
        if (m.attachmentPath) pathsToFetch.push(m.attachmentPath);
      });

      const newUrls: Record<string, string> = {};
      for (const path of pathsToFetch) {
        if (!signedUrls[path]) {
          try {
            const url = await getMediaSignedUrl(path, token);
            if (url) newUrls[path] = url;
          } catch {
            // signed url fetch error
          }
        }
      }

      if (Object.keys(newUrls).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...newUrls }));
      }
    }

    fetchSignedUrls();
  }, [user, doubt, messages, signedUrls]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !replyText.trim()) return;
    setSending(true);
    setError("");

    try {
      const token = await user.getIdToken();
      await postMessage(doubtId, { text: replyText.trim() }, token);
      setReplyText("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reply.";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(nextStatus: "pending" | "answered" | "resolved") {
    if (!user) return;
    setUpdatingStatus(true);
    try {
      const token = await user.getIdToken();
      await updateDoubtStatus(doubtId, nextStatus, token);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      setError(msg);
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (!doubt) {
    return (
      <div className="h-64 rounded-2xl animate-shimmer border border-[var(--color-border)]" />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/tutor/doubts"
            className="p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
              {doubt.title}
            </h1>
            <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
              <span>Student: <strong className="text-[var(--color-text)]">{doubt.studentName}</strong></span>
              <span>• Status: <strong className="capitalize">{doubt.status}</strong></span>
            </div>
          </div>
        </div>

        {/* Tutor Status Controls */}
        <div className="flex items-center gap-1.5">
          {doubt.status !== "resolved" && (
            <button
              onClick={() => handleStatusChange("resolved")}
              disabled={updatingStatus}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded-xl shadow-xs flex items-center gap-1 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          className="p-3 text-xs rounded-lg"
          style={{
            backgroundColor: "rgb(239 68 68 / 0.1)",
            color: "var(--color-error)",
          }}
        >
          {error}
        </div>
      )}

      {/* Main Student Question Card */}
      <div className="p-5 rounded-2xl border bg-[var(--color-surface)] border-[var(--color-border)] space-y-3 shadow-xs">
        <div className="text-xs font-semibold text-[var(--color-primary)]">
          Question from {doubt.studentName}
        </div>
        <p className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
          {doubt.initialQuestion}
        </p>

        {/* Attachment Image Render via Verified Signed URL */}
        {doubt.attachmentPath && (
          <div className="pt-3">
            {signedUrls[doubt.attachmentPath] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrls[doubt.attachmentPath]}
                alt="Student attachment"
                className="max-h-96 rounded-xl border border-[var(--color-border)] object-contain bg-black/5"
              />
            ) : (
              <div className="inline-flex items-center gap-1.5 p-2 rounded-lg bg-[var(--color-bg-secondary)] text-xs text-[var(--color-text-muted)]">
                <ImageIcon className="w-4 h-4" /> Fetching secure signed image...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thread Messages */}
      <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
          Replies ({messages.length})
        </h3>

        {messages.map((msg) => {
          const isMe = msg.senderUid === user?.uid;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl space-y-2 text-xs ${
                  isMe
                    ? "bg-[var(--color-primary)] text-white rounded-br-none"
                    : "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-bl-none"
                }`}
              >
                <div
                  className={`text-[10px] font-semibold ${
                    isMe ? "text-white/70" : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {isMe ? "You (Tutor)" : doubt.studentName}
                </div>
                <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>

                {msg.attachmentPath && signedUrls[msg.attachmentPath] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedUrls[msg.attachmentPath]}
                    alt="Attachment"
                    className="max-h-60 rounded-lg border border-black/10 object-contain"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Input Box */}
      <form onSubmit={handleSendReply} className="flex gap-2 pt-4">
        <input
          type="text"
          required
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type your answer / explanation for student..."
          className="flex-1 px-4 py-3 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none"
        />
        <button
          type="submit"
          disabled={sending || !replyText.trim()}
          className="px-5 py-3 text-xs font-semibold text-white rounded-xl shadow-md transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
          }}
        >
          <Send className="w-3.5 h-3.5" /> Post Reply
        </button>
      </form>
    </div>
  );
}
