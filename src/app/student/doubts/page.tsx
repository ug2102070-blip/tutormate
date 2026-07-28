"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePresence, useUserPresence } from "@/hooks/usePresence";
import { createDoubt, postMessage, markDoubtAsRead, updateDoubtStatus } from "@/actions/doubtActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import { AudioPlayer } from "@/components/chat/AudioPlayer";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { ImageLightbox } from "@/components/chat/ImageLightbox";
import type { DoubtDoc, MessageDoc, BatchDoc, StudentDoc, AttachmentType } from "@/types";
import {
  Plus,
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
} from "lucide-react";

export default function StudentDoubtsPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }>;
}) {
  const unwrappedSearchParams = searchParams ? use(searchParams) : undefined;
  const initialSelectedId = unwrappedSearchParams?.id;

  const { user, claims } = useAuth();
  usePresence(user?.id);
  const supabase = createClient();

  const tutorId = claims && claims.role === "student" ? claims.tutorId : null;
  const tutorPresence = useUserPresence(tutorId);

  const [doubts, setDoubts] = useState<DoubtDoc[]>([]);
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [selectedDoubtId, setSelectedDoubtId] = useState<string | null>(initialSelectedId || null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const [newMessageText, setNewMessageText] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<{
    file: File;
    type: AttachmentType;
    previewUrl?: string;
  } | null>(null);

  const [title, setTitle] = useState("");
  const [initialQuestion, setInitialQuestion] = useState("");
  const [batchId, setBatchId] = useState("");
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [submittingModal, setSubmittingModal] = useState(false);
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
  }, [supabase]);

  // Load student doubts
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const currentUserId = user.id;

    async function fetchDoubts() {
      const { data } = await supabase
        .from("doubts")
        .select("*")
        .eq("student_auth_uid", currentUserId)
        .order("last_message_at", { ascending: false });

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
      .channel(`doubts_student_${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doubts",
          filter: `student_auth_uid=eq.${currentUserId}`,
        },
        () => {
          fetchDoubts();
        }
      )
      .subscribe();

    async function loadBatches() {
      // Fetch student's enrolled batch IDs first
      const { data: studentRow } = await supabase
        .from("students")
        .select("enrolled_batch_ids")
        .eq("auth_uid", currentUserId)
        .maybeSingle();

      const enrolledIds: string[] = studentRow?.enrolled_batch_ids || [];
      if (enrolledIds.length === 0) return;

      const { data: bData } = await supabase
        .from("batches")
        .select("*")
        .in("id", enrolledIds);

      if (bData) {
        const bList: BatchDoc[] = bData.map((b) => ({
          id: b.id,
          tutorId: b.tutor_id,
          name: b.name,
          subject: b.subject,
          gradeClass: b.grade_class,
          monthlyFee: Number(b.monthly_fee),
          schedule: b.schedule || [],
          studentCount: b.student_count,
          isArchived: b.is_archived,
          createdAt: b.created_at,
        }));
        setBatches(bList);
        if (bList.length > 0) {
          setBatchId((prev) => (prev ? prev : bList[0].id));
        }
      }
    }

    loadBatches();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, claims, selectedDoubtId, supabase]);

  // Active doubt thread listener
  useEffect(() => {
    if (!user || !selectedDoubtId) {
      setMessages([]);
      return;
    }

    // Optimistically mark unread flag as cleared locally
    setDoubts((prev) =>
      prev.map((d) => (d.id === selectedDoubtId ? { ...d, unreadByStudent: false } : d))
    );

    markDoubtAsRead(selectedDoubtId, user.id);

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
  }, [user, selectedDoubtId, supabase, fetchMessagesForThread]);

  useEffect(() => {
    const isThreadChanged = prevDoubtIdRef.current !== selectedDoubtId;
    const hasNewMessages = messages.length > prevMessageCountRef.current;

    prevDoubtIdRef.current = selectedDoubtId;
    prevMessageCountRef.current = messages.length;

    if (isThreadChanged || (hasNewMessages && isAtBottomRef.current)) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedDoubtId]);

  const activeDoubt = doubts.find((d) => d.id === selectedDoubtId);

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
            const url = await getMediaSignedUrl(path, user!.id);
            if (url) newUrls[path] = url;
          } catch (err) {
            console.error("Signed URL error:", err);
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
        attachmentPath = `${tutorId}/${user.id}/${selectedDoubtId}/${tempId}_${cleanName}`;
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
        },
        user.id
      );

      setNewMessageText("");
      setSelectedAttachment(null);

      // Instant local refetch so sender sees message immediately
      await fetchMessagesForThread(selectedDoubtId);

      // Broadcast to other participant over WebSockets
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
      const attachmentPath = `${tutorId}/${user.id}/${selectedDoubtId}/${fileName}`;

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
        },
        user.id
      );

      setShowVoiceRecorder(false);

      // Instant local refetch so sender sees voice note immediately
      await fetchMessagesForThread(selectedDoubtId);

      // Broadcast to other participant over WebSockets
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

  // Create New Topic Handler
  async function handleCreateDoubt(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSubmittingModal(true);

    try {
      let attachmentPath: string | null = null;
      let attachmentType: AttachmentType = null;
      let attachmentName: string | null = null;
      let attachmentSize: number | null = null;

      if (modalFile) {
        const doubtTempId = `d_${Date.now()}`;
        const cleanName = modalFile.name.replace(/[^a-zA-Z0-9._-]/g, "");
        attachmentPath = `${tutorId}/${user.id}/${doubtTempId}/${cleanName}`;
        attachmentType = modalFile.type.startsWith("image/") ? "image" : "file";
        attachmentName = modalFile.name;
        attachmentSize = modalFile.size;

        const { error: uploadErr } = await supabase.storage
          .from("attachments")
          .upload(attachmentPath, modalFile);

        if (uploadErr) throw uploadErr;
      }

      const res = await createDoubt(
        {
          title,
          initialQuestion,
          batchId,
          attachmentPath,
          attachmentType,
          attachmentName,
          attachmentSize,
        },
        user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
        user.id
      );

      setTitle("");
      setInitialQuestion("");
      setModalFile(null);
      setShowNewModal(false);
      if (res.doubtId) setSelectedDoubtId(res.doubtId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create topic.";
      setError(msg);
    } finally {
      setSubmittingModal(false);
    }
  }

  async function handleMarkResolved() {
    if (!user || !selectedDoubtId) return;
    try {
      await updateDoubtStatus(selectedDoubtId, "resolved", user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to mark resolved.";
      setError(msg);
    }
  }

  const filteredDoubts = doubts.filter((d) => {
    const matchesFilter = statusFilter === "all" ? true : d.status === statusFilter;
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.initialQuestion.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="h-[calc(100vh-9.5rem)] md:h-[calc(100vh-7rem)] flex flex-col space-y-3">
      {/* Page Header */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Inbox & Teacher Chat
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Direct real-time chat with your teacher, send voice notes, images & study files
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
          }}
        >
          <Plus className="w-4 h-4" /> New Topic
        </button>
      </div>

      {/* Main Inbox Dual Panel Layout */}
      <div className="flex-1 flex flex-col md:flex-row bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden min-h-0">
        {/* LEFT SIDEBAR: Threads & Conversations List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/50 dark:bg-[#0b0f19]/50 shrink-0 h-full ${
            selectedDoubtId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search & Filters */}
          <div className="p-3 space-y-2 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] outline-none focus:border-indigo-500"
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
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl animate-shimmer bg-slate-200/60 dark:bg-[#2d2d40]/60" />
                ))}
              </div>
            ) : filteredDoubts.length === 0 ? (
              <div className="py-12 text-center px-4">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No conversation threads</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click &quot;New Topic&quot; to send a message to your tutor.
                </p>
              </div>
            ) : (
              filteredDoubts.map((d) => {
                const isSelected = d.id === selectedDoubtId;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDoubtId(d.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-500/10 border-l-4 border-indigo-600"
                        : "hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs">
                      {d.studentName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{d.title}</h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {d.lastMessageAt
                            ? new Date(d.lastMessageAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {d.initialQuestion}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5">
                        {d.status === "pending" && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            Pending Answer
                          </span>
                        )}
                        {d.status === "answered" && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            Answered
                          </span>
                        )}
                        {d.status === "resolved" && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-100 dark:bg-[#252535] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                            Resolved
                          </span>
                        )}

                        {d.unreadByStudent && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 ml-auto shrink-0" />
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
              {/* Messenger Active Chat Header */}
              <div className="p-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#131b2e] shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedDoubtId(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Presence Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      T
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        tutorPresence.isOnline ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                      title={tutorPresence.isOnline ? "Teacher is Online" : "Teacher is Offline"}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Your Teacher</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tutorPresence.isOnline
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                            : "bg-slate-100 dark:bg-[#252535] text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {tutorPresence.lastSeenText}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs md:max-w-md font-medium">
                      Topic: <strong className="text-slate-800 dark:text-slate-200">{activeDoubt.title}</strong>
                    </p>
                  </div>
                </div>

                {activeDoubt.status === "answered" && (
                  <button
                    onClick={handleMarkResolved}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                  </button>
                )}
              </div>

              {/* Chat Messages Body */}
              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 p-4 overflow-y-auto min-h-0 space-y-4 bg-slate-50/40 dark:bg-[#0b0f19]/40"
              >
                {/* Initial Question Bubble */}
                <div className="max-w-xl mx-auto p-4 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-white/10 shadow-xs space-y-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                    Topic Question Overview
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
                          alt="Initial Attachment"
                          onClick={() => setLightboxImage(signedUrls[activeDoubt.attachmentPath!])}
                          className="max-h-64 rounded-xl border border-slate-200 dark:border-white/10 object-contain bg-black/5 cursor-zoom-in hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <a
                          href={signedUrls[activeDoubt.attachmentPath]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-[#252535] hover:bg-slate-200 text-xs font-bold text-indigo-600 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{activeDoubt.attachmentName || "Attached File"}</span>
                          <Download className="w-3.5 h-3.5 ml-1 text-slate-400" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest my-2">
                  Conversation Thread
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
                        className={`max-w-[80%] p-3.5 rounded-2xl text-xs space-y-2 shadow-xs ${
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
                          <span>{isMe ? "You" : "Teacher"}</span>
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

                        {/* Attachment Rendering */}
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

              {/* Input Bar Footer */}
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

                {/* Voice Recorder or Messenger Input Controls */}
                {showVoiceRecorder ? (
                  <VoiceRecorder
                    onSendAudio={handleSendVoice}
                    onCancel={() => setShowVoiceRecorder(false)}
                  />
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    {/* Attach Image Button */}
                    <label
                      className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                      title="Attach Photo"
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

                    {/* Attach File Button */}
                    <label
                      className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                      title="Attach File/Document"
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
                      className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Record Voice Note"
                    >
                      <Mic className="w-5 h-5" />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Type a message to your teacher..."
                      className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-medium"
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={sending || (!newMessageText.trim() && !selectedAttachment)}
                      className="p-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
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
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No active chat selected</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                Choose a conversation topic from the left sidebar or click &quot;New Topic&quot; to ask your teacher a question.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* NEW TOPIC MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl max-w-lg w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Ask Your Teacher</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDoubt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Select Batch / Subject
                </label>
                <select
                  required
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] outline-none focus:border-indigo-600 text-slate-900 dark:text-slate-100"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chapter 4 Integration Problem 5"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] outline-none focus:border-indigo-600 font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Question Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={initialQuestion}
                  onChange={(e) => setInitialQuestion(e.target.value)}
                  placeholder="Explain where you got stuck or what you didn't understand..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b0f19] outline-none focus:border-indigo-600 font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Attach Photo / Document (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setModalFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {submittingModal ? "Submitting..." : "Send Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lightboxImage && (
        <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
