"use client";

import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Users,
  Megaphone,
  UserCheck,
  Paperclip,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  getConversations,
  getChatMessages,
  sendChatMessage,
  createConversation,
  type ConversationSummary,
} from "@/actions/chatActions";
import type { ChatMessageDoc } from "@/types";

export default function TutorChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessageDoc[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchConvs = async () => {
    setLoadingConvs(true);
    const res = await getConversations();
    if (res.success && res.conversations) {
      setConversations(res.conversations);
      if (!activeConv && res.conversations.length > 0) {
        setActiveConv(res.conversations[0]);
      }
    }
    setLoadingConvs(false);
  };

  const fetchMessagesForConv = async (convId: string) => {
    setLoadingMsgs(true);
    const res = await getChatMessages(convId);
    if (res.success && res.messages) {
      setMessages(res.messages);
    }
    setLoadingMsgs(false);
  };

  useEffect(() => {
    fetchConvs();
  }, []);

  useEffect(() => {
    if (activeConv) {
      fetchMessagesForConv(activeConv.id);
    }
  }, [activeConv?.id]);

  // Supabase Realtime Message Subscription
  useEffect(() => {
    if (!activeConv) return;

    const channel = supabase
      .channel(`chat_messages_${activeConv.id}`)
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
          setMessages((prev) => [
            ...prev,
            {
              id: newMsg.id,
              conversationId: newMsg.conversation_id,
              senderUid: newMsg.sender_uid,
              senderRole: newMsg.sender_role,
              text: newMsg.text,
              attachmentPath: newMsg.attachment_path,
              createdAt: newMsg.created_at,
              senderName: newMsg.sender_uid === user?.id ? "You" : "Participant",
            },
          ]);
        }
      )
      .subscribe();

    return () => {
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !inputText.trim() || sending) return;

    setSending(true);
    const textToSend = inputText;
    setInputText("");

    const res = await sendChatMessage(activeConv.id, textToSend);
    if (!res.success) {
      showToast(res.error || "Failed to send message", "error");
      setInputText(textToSend);
    }
    setSending(false);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim()) return;

    const res = await createConversation([], "announcement", undefined, announcementTitle);
    if (res.success) {
      showToast("Batch Announcement channel created! 📢");
      setIsModalOpen(false);
      setAnnouncementTitle("");
      await fetchConvs();
    } else {
      showToast(res.error || "Failed to create channel", "error");
    }
  };

  const filteredConvs = conversations.filter((c) =>
    (c.title || c.id).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 text-sm font-semibold transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl text-primary" style={{ background: "var(--color-primary-50)" }}>
              <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">Internal Chat System 💬</h1>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Realtime messaging with students, parents, and broadcast batch announcements.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:opacity-90 transition-all flex items-center gap-2 shadow-md shrink-0"
        >
          <Megaphone className="w-4 h-4" /> Broadcast Announcement
        </button>
      </div>

      {/* Split Chat Box */}
      <div
        className="rounded-2xl border shadow-sm overflow-hidden flex flex-col md:flex-row h-[75vh]"
        style={{
          background: "var(--color-card-bg)",
          borderColor: "var(--color-card-border)",
        }}
      >
        {/* Left Panel: Conversations List */}
        <div
          className="w-full md:w-80 border-r flex flex-col shrink-0"
          style={{ borderColor: "var(--color-border)", background: "var(--color-bg-secondary)" }}
        >
          {/* Search Bar */}
          <div className="p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "var(--color-border)" }}>
            {loadingConvs ? (
              <div className="p-8 text-center text-xs text-gray-500 flex justify-center items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading chats...
              </div>
            ) : filteredConvs.length === 0 ? (
              <EmptyState
                variant="chat"
                title="No conversations"
                description="No chats found."
                size="sm"
                className="mx-4 my-8"
              />
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
                          {conv.title || (isAnnouncement ? "Announcement" : "Direct Message")}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(conv.lastMessageAt || conv.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] truncate mt-0.5 text-gray-500 dark:text-gray-400 font-medium">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Active Chat Thread */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: "var(--color-bg)" }}>
          {activeConv ? (
            <>
              {/* Thread Header */}
              <div
                className="p-4 border-b flex items-center justify-between shrink-0"
                style={{ borderColor: "var(--color-border)", background: "var(--color-card-bg)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      activeConv.type === "announcement" ? "bg-amber-500/15 text-amber-600" : "bg-blue-500/15 text-blue-600"
                    }`}
                  >
                    {activeConv.type === "announcement" ? <Megaphone className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">
                      {activeConv.title || (activeConv.type === "announcement" ? "Batch Announcement" : "Direct Chat")}
                    </h3>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">
                      {activeConv.type} Channel • Realtime Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Message History */}
              <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3">
                {loadingMsgs ? (
                  <div className="py-12 flex justify-center items-center gap-2 text-xs text-gray-400">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState
                    variant="chat"
                    title="No messages yet"
                    description="Send a message to start chatting!"
                    size="sm"
                  />
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderUid === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div className="text-[10px] font-semibold text-gray-400 mb-1 px-1">
                          {msg.senderName} ({msg.senderRole.toUpperCase()})
                        </div>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-medium shadow-xs ${
                            isMe
                              ? "bg-primary text-white rounded-br-none"
                              : "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white rounded-bl-none border border-gray-200 dark:border-gray-800"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          <span
                            className={`text-[9px] block text-right mt-1 opacity-70 ${
                              isMe ? "text-white" : "text-gray-400"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t flex items-center gap-2 shrink-0"
                style={{ borderColor: "var(--color-border)", background: "var(--color-card-bg)" }}
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message or announcement..."
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
              <span className="font-semibold">Select a conversation from the sidebar to view chat history.</span>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateAnnouncement}
            className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl"
            style={{ background: "var(--color-card-bg)", borderColor: "var(--color-card-border)" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" /> Create Announcement Broadcast
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-gray-400">Broadcast Channel Title</label>
              <input
                type="text"
                required
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="e.g. HSC Physics Exam Announcement"
                className="w-full px-3.5 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border"
                style={{ borderColor: "var(--color-border)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-extrabold rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-md"
              >
                Create Channel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
