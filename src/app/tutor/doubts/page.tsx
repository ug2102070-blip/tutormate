"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { usePresence, useUserPresence } from "@/hooks/usePresence";
import { postMessage, markDoubtAsRead, updateDoubtStatus } from "@/actions/doubtActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import { AudioPlayer } from "@/components/chat/AudioPlayer";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { ImageLightbox } from "@/components/chat/ImageLightbox";
import type { DoubtDoc, MessageDoc, AttachmentType } from "@/types";
import {
  Search,
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  CheckCircle,
  FileText,
  X,
  Download,
  HelpCircle,
  MessageSquare,
  ChevronLeft,
  Lock,
  Menu,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default function TutorDoubtsPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }>;
}) {
  const unwrappedSearchParams = searchParams ? use(searchParams) : undefined;
  const initialSelectedId = unwrappedSearchParams?.id;

  const { user, claims } = useAuth();
  const { t } = useLanguage();
  usePresence(user?.id);
  const supabase = createClient();

  const tutorId = claims && claims.role === "tutor" ? claims.tutorId : null;

  const [doubts, setDoubts] = useState<DoubtDoc[]>([]);
  const [selectedDoubtId, setSelectedDoubtId] = useState<string | null>(initialSelectedId || null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const activeDoubt = doubts.find((d) => d.id === selectedDoubtId);
  const studentPresence = useUserPresence(activeDoubt?.studentAuthUid);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const [newMessageText, setNewMessageText] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<{
    file: File;
    type: AttachmentType;
  } | null>(null);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef<boolean>(true);
  const prevDoubtIdRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef<number>(0);

  function handleScroll() {
    const container = chatContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isAtBottomRef.current = distanceFromBottom <= 100;
  }

  const fetchMessagesForThread = useCallback(async (doubtId: string) => {
    const { data } = await supabase
      .from("doubt_messages")
      .select("*")
      .eq("doubt_id", doubtId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(
        data.map((m) => ({
          id: m.id,
          senderUid: m.sender_uid,
          senderRole: m.sender_role,
          text: m.text,
          attachmentPath: m.attachment_path,
          attachmentType: m.attachment_type as AttachmentType,
          attachmentName: m.attachment_name,
          attachmentSize: m.attachment_size,
          createdAt: m.created_at,
        }))
      );
    }
  }, []);

  // Load Tutor Doubts
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchDoubts() {
      let query = supabase.from("doubts").select("*");
      if (tutorId) {
        query = query.eq("tutor_id", tutorId);
      }
      const { data } = await query.order("last_message_at", { ascending: false });

      if (data) {
        const list: DoubtDoc[] = data.map((d) => ({
          id: d.id,
          tutorId: d.tutor_id,
          studentDocId: d.student_doc_id,
          studentAuthUid: d.student_auth_uid,
          studentName: d.student_name,
          batchId: d.batch_id,
          title: d.title,
          initialQuestion: d.initial_question,
          attachmentPath: d.attachment_path,
          attachmentType: d.attachment_type as AttachmentType,
          attachmentName: d.attachment_name,
          attachmentSize: d.attachment_size,
          status: d.status,
          lastMessageAt: d.last_message_at,
          unreadByTutor: d.unread_by_tutor,
          unreadByStudent: d.unread_by_student,
          createdAt: d.created_at,
        }));
        setDoubts(list);
        if (!selectedDoubtId && list.length > 0) {
          setSelectedDoubtId(list[0].id);
        }
      }
      setLoading(false);
    }

    fetchDoubts();

    const channel = supabase
      .channel(`doubts_tutor_${tutorId || user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doubts",
          ...(tutorId ? { filter: `tutor_id=eq.${tutorId}` } : {}),
        },
        () => {
          fetchDoubts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, claims, tutorId, selectedDoubtId]);

  // Active doubt thread listener
  useEffect(() => {
    if (!user || !selectedDoubtId) {
      setMessages([]);
      return;
    }

    // Optimistically clear unread badge for tutor
    setDoubts((prev) =>
      prev.map((d) => (d.id === selectedDoubtId ? { ...d, unreadByTutor: false } : d))
    );

    markDoubtAsRead(selectedDoubtId);

    fetchMessagesForThread(selectedDoubtId);

    const channel = supabase
      .channel(`doubt_chat_${selectedDoubtId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "doubt_messages",
          filter: `doubt_id=eq.${selectedDoubtId}`,
        },
        () => {
          fetchMessagesForThread(selectedDoubtId);
        }
      )
      .on(
        "broadcast",
        { event: "new_message" },
        () => {
          fetchMessagesForThread(selectedDoubtId);
        }
      )
      .subscribe();

    activeChannelRef.current = channel;

    // 4s polling fallback to guarantee real-time updates even on network/subscription hiccups
    const pollInterval = setInterval(() => {
      fetchMessagesForThread(selectedDoubtId);
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      activeChannelRef.current = null;
    };
  }, [user, selectedDoubtId, fetchMessagesForThread]);

  useEffect(() => {
    const isThreadChanged = prevDoubtIdRef.current !== selectedDoubtId;
    const hasNewMessages = messages.length > prevMessageCountRef.current;

    prevDoubtIdRef.current = selectedDoubtId;
    prevMessageCountRef.current = messages.length;

    if (isThreadChanged || (hasNewMessages && isAtBottomRef.current)) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: isThreadChanged ? "auto" : "smooth",
        });
      }
    }
  }, [messages, selectedDoubtId]);

  // Signed URLs fetcher
  useEffect(() => {
    if (!user || (!activeDoubt && messages.length === 0)) return;

    async function fetchSignedUrls() {
      const pathsToFetch: string[] = [];

      if (activeDoubt?.attachmentPath) pathsToFetch.push(activeDoubt.attachmentPath);
      messages.forEach((m) => {
        if (m.attachmentPath) pathsToFetch.push(m.attachmentPath);
      });

      const newUrls: Record<string, string> = {};
      for (const path of pathsToFetch) {
        if (!signedUrls[path]) {
          try {
            const url = await getMediaSignedUrl(path);
            if (url) newUrls[path] = url;
          } catch (err) {
            console.error("Signed URL fetch error:", err);
          }
        }
      }

      if (Object.keys(newUrls).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...newUrls }));
      }
    }

    fetchSignedUrls();
  }, [user, activeDoubt, messages, signedUrls]);

  // Send Message Handler
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!user || !selectedDoubtId) return;
    if (!newMessageText.trim() && !selectedAttachment) return;

    setSending(true);
    setError("");

    try {
      let attachmentPath: string | null = null;
      let attachmentType: AttachmentType = null;
      let attachmentName: string | null = null;
      let attachmentSize: number | null = null;

      if (selectedAttachment) {
        const file = selectedAttachment.file;
        const tempId = `m_${Date.now()}`;
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
        attachmentPath = `${user.id}/${activeDoubt?.studentAuthUid}/${selectedDoubtId}/${tempId}_${cleanName}`;
        attachmentType = selectedAttachment.type;
        attachmentName = file.name;
        attachmentSize = file.size;

        const { error: uploadErr } = await supabase.storage
          .from("attachments")
          .upload(attachmentPath, file);

        if (uploadErr) throw uploadErr;
      }

      await postMessage(
        selectedDoubtId,
        {
          text: newMessageText.trim(),
          attachmentPath,
          attachmentType,
          attachmentName,
          attachmentSize,
        }
      );

      setNewMessageText("");
      setSelectedAttachment(null);

      // Instant local refetch so sender sees message immediately
      await fetchMessagesForThread(selectedDoubtId);

      // Broadcast to student over WebSockets
      if (activeChannelRef.current) {
        activeChannelRef.current.send({
          type: "broadcast",
          event: "new_message",
          payload: { doubtId: selectedDoubtId },
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message.";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  // Voice Note Send Handler
  async function handleSendVoice(audioBlob: Blob, duration: number) {
    if (!user || !selectedDoubtId) return;
    setSending(true);
    setError("");

    try {
      const fileName = `voice_${Date.now()}.webm`;
      const attachmentPath = `${user.id}/${activeDoubt?.studentAuthUid}/${selectedDoubtId}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("attachments")
        .upload(attachmentPath, audioBlob, {
          contentType: audioBlob.type || "audio/webm",
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      await postMessage(
        selectedDoubtId,
        {
          text: `Voice note (${duration}s)`,
          attachmentPath,
          attachmentType: "audio",
          attachmentName: fileName,
          attachmentSize: audioBlob.size,
        }
      );

      setShowVoiceRecorder(false);

      // Instant local refetch so sender sees voice note immediately
      await fetchMessagesForThread(selectedDoubtId);

      // Broadcast to student over WebSockets
      if (activeChannelRef.current) {
        activeChannelRef.current.send({
          type: "broadcast",
          event: "new_message",
          payload: { doubtId: selectedDoubtId },
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send voice note.";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  async function handleMarkResolved() {
    if (!user || !selectedDoubtId) return;
    try {
      await updateDoubtStatus(selectedDoubtId, "resolved");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resolve doubt.";
      setError(msg);
    }
  }

  const filteredDoubts = doubts.filter((d) => {
    const matchesFilter = statusFilter === "all" ? true : d.status === statusFilter;
    const matchesSearch =
      d.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.initialQuestion.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = doubts.filter((d) => d.status === "pending").length;

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="h-[calc(100vh-9.5rem)] md:h-[calc(100vh-7rem)] flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("doubts.title") || "Student Doubts & Questions"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t("doubts.subtitle")}
          </p>
        </div>

        {pendingCount > 0 && (
          <span className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-amber-500 text-white shadow-xs">
            {pendingCount} {t("doubts.pending") || "Pending"}
          </span>
        )}
      </div>

      {/* Dual Panel Messenger Inbox */}
      <div className="flex-1 flex flex-col md:flex-row bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 rounded-xl shadow-xs overflow-hidden min-h-0">
        {/* LEFT SIDEBAR: Student Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/50 dark:bg-[#0b0f19]/50 shrink-0 h-full ${
            selectedDoubtId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search & Filter */}
          <div className="p-3 space-y-2 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("doubts.searchPlaceholder")}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {["all", "pending", "answered", "resolved"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {st === "all" ? t("common.all") : t(`doubts.${st}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Threads list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl animate-shimmer bg-slate-200/60 dark:bg-[#2d2d40]/60" />
                ))}
              </div>
            ) : filteredDoubts.length === 0 ? (
              <EmptyState
                variant="doubts"
                title={t("doubts.noStudentDoubts")}
                description={t("doubts.noMatch")}
                size="sm"
                className="my-8 mx-4"
              />
            ) : (
              filteredDoubts.map((d) => {
                const isSelected = d.id === selectedDoubtId;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDoubtId(d.id)}
                    className={`w-full text-left p-3 transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-500/10 border-l-4 border-indigo-600"
                        : "hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                      {d.studentName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {d.studentName}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {d.lastMessageAt
                            ? new Date(d.lastMessageAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold text-indigo-600 truncate mt-0.5">
                        {d.title}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5">
                        {d.status === "pending" && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            {t("doubts.needsAnswer")}
                          </span>
                        )}
                        {d.status === "answered" && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            {t("doubts.answered")}
                          </span>
                        )}
                        {d.status === "resolved" && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-100 dark:bg-[#252535] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                            {t("doubts.resolved")}
                          </span>
                        )}

                        {d.unreadByTutor && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-600 text-white ml-auto shrink-0">
                            {t("doubts.new")}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Active Messenger Chat Area */}
        <div
          className={`flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-[#131b2e] ${
            selectedDoubtId ? "flex" : "hidden md:flex"
          }`}
        >
          {activeDoubt ? (
            <>
              {/* Header */}
              <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#131b2e] shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedDoubtId(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {activeDoubt.studentName.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        studentPresence.isOnline ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                      title={studentPresence.isOnline ? "Student is Online" : "Student is Offline"}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {activeDoubt.studentName}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          studentPresence.isOnline
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                            : "bg-slate-100 dark:bg-[#252535] text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {studentPresence.isOnline ? t("doubts.studentOnline") : studentPresence.lastSeenText}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs md:max-w-md font-medium">
                      {t("doubts.topic")} <strong className="text-slate-800 dark:text-slate-200">{activeDoubt.title}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeDoubt.status !== "resolved" && (
                    <button
                      onClick={handleMarkResolved}
                      className="px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#252535] hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {t("doubts.markResolved")}
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4 bg-slate-50/40 dark:bg-[#0b0f19]/40"
              >
                {/* Initial Question Overview */}
                <div className="max-w-xl mx-auto p-3.5 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 shadow-xs space-y-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center justify-between">
                    <span>{t("doubts.studentQuestion")}</span>
                    <span>{t("common.status")}: {t(`doubts.${activeDoubt.status}`) || activeDoubt.status}</span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                    {activeDoubt.initialQuestion}
                  </p>

                  {/* Initial Attachment */}
                  {activeDoubt.attachmentPath && signedUrls[activeDoubt.attachmentPath] && (
                    <div className="pt-2">
                      {activeDoubt.attachmentType === "image" || !activeDoubt.attachmentType ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={signedUrls[activeDoubt.attachmentPath]}
                          alt="Student photo attachment"
                          onClick={() => setLightboxImage(signedUrls[activeDoubt.attachmentPath!])}
                          className="max-h-64 rounded-xl border border-slate-200 dark:border-white/10 object-contain bg-black/5 cursor-zoom-in hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <a
                          href={signedUrls[activeDoubt.attachmentPath]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 p-2.5 rounded-lg bg-slate-100 dark:bg-[#252535] hover:bg-slate-200 text-xs font-bold text-indigo-600 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{activeDoubt.attachmentName || t("doubts.attachedDocument")}</span>
                          <Download className="w-3.5 h-3.5 ml-1 text-slate-400" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest my-2">
                  {t("doubts.replyThread")}
                </div>

                {messages.map((msg) => {
                  const isMe = msg.senderUid === user?.id;
                  const attachmentUrl = msg.attachmentPath ? signedUrls[msg.attachmentPath] : null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-xl text-xs space-y-2 shadow-xs ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-br-xs"
                            : "bg-white dark:bg-[#131b2e] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-bl-xs"
                        }`}
                      >
                        <div
                          className={`text-[10px] font-bold flex items-center justify-between gap-4 ${
                            isMe ? "text-indigo-200" : "text-slate-400"
                          }`}
                        >
                          <span>{isMe ? t("doubts.youTutor") : activeDoubt.studentName}</span>
                          <span>
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        {msg.text && (
                          <div className="leading-relaxed whitespace-pre-wrap font-medium">
                            {msg.text}
                          </div>
                        )}

                        {/* Attachment */}
                        {attachmentUrl && (
                          <div className="pt-1">
                            {msg.attachmentType === "audio" ? (
                              <AudioPlayer src={attachmentUrl} isMe={isMe} />
                            ) : msg.attachmentType === "image" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={attachmentUrl}
                                alt="Image Attachment"
                                onClick={() => setLightboxImage(attachmentUrl)}
                                className="max-h-60 rounded-xl border border-black/10 object-contain bg-black/5 cursor-zoom-in hover:opacity-90 transition-opacity"
                              />
                            ) : (
                              <a
                                href={attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-colors ${
                                  isMe
                                    ? "bg-indigo-700 text-white hover:bg-indigo-800"
                                    : "bg-slate-100 dark:bg-[#252535] text-indigo-600 hover:bg-slate-200"
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                                <span className="truncate max-w-[180px]">
                                  {msg.attachmentName || "Document"}
                                </span>
                                <span className="text-[10px] opacity-75">
                                  {formatFileSize(msg.attachmentSize)}
                                </span>
                                <Download className="w-3.5 h-3.5 ml-auto" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Bar */}
              <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] shrink-0 space-y-2">
                {error && (
                  <div className="p-2 text-xs rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                    {error}
                  </div>
                )}

                {/* Selected File Preview */}
                {selectedAttachment && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 text-xs font-semibold text-indigo-700">
                    <div className="flex items-center gap-2 truncate">
                      {selectedAttachment.type === "image" ? (
                        <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                      <span className="truncate">{selectedAttachment.file.name}</span>
                      <span className="text-[10px] text-indigo-500 font-mono">
                        ({formatFileSize(selectedAttachment.file.size)})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedAttachment(null)}
                      className="p-1 hover:bg-indigo-100 rounded-lg text-indigo-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Input Bar or Voice Recorder */}
                {showVoiceRecorder ? (
                  <VoiceRecorder
                    onSendAudio={handleSendVoice}
                    onCancel={() => setShowVoiceRecorder(false)}
                  />
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {/* Attach Image */}
                    <label
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                      title={t("doubts.attachImage")}
                    >
                      <ImageIcon className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setSelectedAttachment({ file: f, type: "image" });
                        }}
                      />
                    </label>

                    {/* Attach Document */}
                    <label
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                      title={t("doubts.attachDocument")}
                    >
                      <Paperclip className="w-5 h-5" />
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.zip,.txt,.ppt,.pptx,.xls,.xlsx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setSelectedAttachment({ file: f, type: "file" });
                        }}
                      />
                    </label>

                    {/* Voice Note Button */}
                    <button
                      type="button"
                      onClick={() => setShowVoiceRecorder(true)}
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title={t("doubts.recordVoice")}
                    >
                      <Mic className="w-5 h-5" />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder={t("doubts.replyTo").replace("{name}", activeDoubt.studentName)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-medium"
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={sending || (!newMessageText.trim() && !selectedAttachment)}
                      className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-[#0b0f19]/50">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("doubts.selectThreadTitle")}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                {t("doubts.selectThreadDesc")}
              </p>
            </div>
          )}
        </div>
      </div>

      {lightboxImage && (
        <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
