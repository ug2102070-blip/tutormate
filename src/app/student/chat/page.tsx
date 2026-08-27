"use client";

import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  Send,
  Search,
  Users,
  Megaphone,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  getConversations,
  getChatMessages,
  sendChatMessage,
  type ConversationSummary,
} from "@/actions/chatActions";
import type { ChatMessageDoc } from "@/types";

export default function StudentChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessageDoc[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchConvs = async (silent = false) => {
    if (!silent) setLoadingConvs(true);
    const res = await getConversations();
    if (res.success && res.conversations) {
      setConversations(res.conversations);
      if (!activeConv && res.conversations.length > 0) {
        setActiveConv(res.conversations[0]);
      }
    }
    if (!silent) setLoadingConvs(false);
  };

  const fetchMessagesForConv = async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    const res = await getChatMessages(convId);
    if (res.success && res.messages) {
      setMessages((prev) => {
        const optimisticOnes = prev.filter((m) => m.id.startsWith("temp-"));
        const confirmedMsgs = res.messages!;
        const remainingOptimistic = optimisticOnes.filter(
          (opt) => !confirmedMsgs.some((c) => c.text === opt.text && c.senderUid === opt.senderUid)
        );
        return [...confirmedMsgs, ...remainingOptimistic];
      });
    }
    if (!silent) setLoadingMsgs(false);
  };

  useEffect(() => {
    fetchConvs();
  }, []);

  useEffect(() => {
    if (activeConv) {
      fetchMessagesForConv(activeConv.id);
    }
  }, [activeConv?.id]);

  // Global Realtime listener for sidebar updates across all conversations
  useEffect(() => {
    if (!user?.id) return;

    const globalChannel = supabase
      .channel("student_chat_global_sidebar")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as any;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === newMsg.conversation_id
                ? { ...c, lastMessage: newMsg.text, lastMessageAt: newMsg.created_at }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user?.id]);

  // Realtime Subscription with Deduplication & Polling Fallback
  useEffect(() => {
    if (!activeConv) return;

    const channel = supabase
      .channel(`chat_messages_student_${activeConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newMsg.id);
            if (exists) return prev;

            const tempMatch = prev.find(
              (m) =>
                m.id.startsWith("temp-") &&
                m.text === newMsg.text &&
                m.senderUid === newMsg.sender_uid
            );

            if (tempMatch) {
              return prev.map((m) =>
                m.id === tempMatch.id
                  ? {
                      ...m,
                      id: newMsg.id,
                      createdAt: newMsg.created_at,
                    }
                  : m
              );
            }

            return [
              ...prev,
              {
                id: newMsg.id,
                conversationId: newMsg.conversation_id,
                senderUid: newMsg.sender_uid,
                senderRole: newMsg.sender_role,
                text: newMsg.text,
                attachmentPath: newMsg.attachment_path,
                createdAt: newMsg.created_at,
                senderName: newMsg.sender_uid === user?.id ? "You" : "Tutor/Participant",
              },
            ];
          });

          setConversations((prev) =>
            prev.map((c) =>
              c.id === newMsg.conversation_id
                ? { ...c, lastMessage: newMsg.text, lastMessageAt: newMsg.created_at }
                : c
            )
          );
        }
      )
      .subscribe();

    // 4s polling fallback to guarantee 100% sync
    const pollInterval = setInterval(() => {
      fetchMessagesForConv(activeConv.id, true);
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [activeConv?.id, user?.id]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConv || !inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText("");

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageDoc = {
      id: tempId,
      conversationId: activeConv.id,
      senderUid: user?.id || "",
      senderRole: "student",
      text: textToSend,
      attachmentPath: null,
      createdAt: new Date().toISOString(),
      senderName: "You",
    };

    // 1. Instant optimistic update in active thread
    setMessages((prev) => [...prev, optimisticMsg]);

    // 2. Instant optimistic update in conversation sidebar
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? { ...c, lastMessage: textToSend, lastMessageAt: optimisticMsg.createdAt }
          : c
      )
    );

    setSending(true);
    const res = await sendChatMessage(activeConv.id, textToSend);
    setSending(false);

    if (res.success && res.message) {
      const saved = res.message;
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? saved : m))
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, lastMessage: saved.text, lastMessageAt: saved.createdAt }
            : c
        )
      );
    } else if (!res.success) {
      // Rollback optimistic message if failed
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      showToast(res.error || "Failed to send message", "error");
      setInputText(textToSend);
    }
  };

  const filteredConvs = conversations.filter((c) =>
    (c.title || c.id).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
          Class Chat & Announcements 💬
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Communicate directly with your tutor and stay updated on batch announcements
        </p>
      </div>

      {/* Split Chat Box */}
      <div
        className="rounded-2xl border shadow-sm overflow-hidden flex flex-col md:flex-row h-[75vh]"
        style={{
          background: "var(--color-card-bg)",
          borderColor: "var(--color-card-border)",
        }}
      >
        {/* Left Panel */}
        <div
          className="w-full md:w-80 border-r flex flex-col shrink-0"
          style={{ borderColor: "var(--color-border)", background: "var(--color-bg-secondary)" }}
        >
          <div className="p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "var(--color-border)" }}>
            {loadingConvs ? (
              <div className="p-8 text-center text-xs text-gray-500 flex justify-center items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading chats...
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">No chat channels found.</div>
            ) : (
              filteredConvs.map((conv) => {
                const isActive = activeConv?.id === conv.id;
                const isAnnouncement = conv.type === "announcement";

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    className={`w-full p-3.5 text-left transition-all flex items-start gap-3 ${
                      isActive ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isAnnouncement ? "bg-amber-500/15 text-amber-600" : "bg-blue-500/15 text-blue-600"
                      }`}
                    >
                      {isAnnouncement ? <Megaphone className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs truncate">
                          {conv.title || (isAnnouncement ? "Batch Announcement" : "Tutor Chat")}
                        </span>
                      </div>
                      <p className="text-[11px] truncate mt-0.5 text-gray-500 font-medium">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: "var(--color-bg)" }}>
          {activeConv ? (
            <>
              <div
                className="p-4 border-b flex items-center justify-between shrink-0"
                style={{ borderColor: "var(--color-border)", background: "var(--color-card-bg)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">{activeConv.title || "Tutor Chat"}</h3>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">
                      {activeConv.type} Channel
                    </span>
                  </div>
                </div>
              </div>

              <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3">
                {loadingMsgs ? (
                  <div className="py-12 flex justify-center items-center gap-2 text-xs text-gray-400">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400 font-medium">
                    No messages in this chat thread.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderUid === user?.id;

                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className="text-[10px] font-semibold text-gray-400 mb-1 px-1">
                          {msg.senderName} ({msg.senderRole.toUpperCase()})
                        </div>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-medium ${
                            isMe
                              ? "bg-primary text-white rounded-br-none"
                              : "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white rounded-bl-none border border-gray-200 dark:border-gray-800"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t flex items-center gap-2 shrink-0"
                style={{ borderColor: "var(--color-border)", background: "var(--color-card-bg)" }}
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Reply to tutor..."
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="p-2.5 rounded-xl bg-primary text-white hover:opacity-90 disabled:opacity-40 transition-all shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 text-xs">
              <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
              <span>Select a chat channel to view messages.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
