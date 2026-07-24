"use client";

import { useEffect, useState, useRef, use } from "react";
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { usePresence, useUserPresence } from "@/hooks/usePresence";
import { createDoubt, postMessage, markDoubtAsRead, updateDoubtStatus } from "@/actions/doubtActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import { AudioPlayer } from "@/components/chat/AudioPlayer";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
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
  usePresence(user?.uid);

  // Presence for Tutor
  const tutorId = claims && claims.role === "student" ? claims.tutorId : null;
  const tutorPresence = useUserPresence(tutorId);

  const [doubts, setDoubts] = useState<DoubtDoc[]>([]);
  const [batches, setBatches] = useState<BatchDoc[]>([]);
  const [selectedDoubtId, setSelectedDoubtId] = useState<string | null>(initialSelectedId || null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // UI state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // Form & Attachment State
  const [newMessageText, setNewMessageText] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<{
    file: File;
    type: AttachmentType;
    previewUrl?: string;
  } | null>(null);

  // New Topic Form
  const [title, setTitle] = useState("");
  const [initialQuestion, setInitialQuestion] = useState("");
  const [batchId, setBatchId] = useState("");
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [submittingModal, setSubmittingModal] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load student doubts
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "doubts"),
      where("studentAuthUid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: DoubtDoc[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as DoubtDoc));
        list.sort((a, b) => (b.lastMessageAt?.toMillis() || 0) - (a.lastMessageAt?.toMillis() || 0));
        setDoubts(list);
        setLoading(false);

        // Auto select first thread if none selected
        if (!selectedDoubtId && list.length > 0) {
          setSelectedDoubtId(list[0].id);
        }
      },
      (err) => {
        console.error("Doubts snapshot error:", err);
        setLoading(false);
      }
    );

    async function loadBatches() {
      if (!user) return;
      try {
        let effectiveTutorId = claims?.role === "student" ? claims.tutorId : null;
        let effectiveStudentDocId = claims?.role === "student" ? claims.studentDocId : null;
        let enrolledBatchIds: string[] = [];

        // Fallback 1: Fetch user doc if claims not populated
        if (!effectiveTutorId) {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            effectiveTutorId = uData.tutorId || null;
            effectiveStudentDocId = uData.studentDocId || null;
          }
        }

        // Fallback 2: Fetch student doc by studentDocId or authUid
        if (effectiveStudentDocId) {
          const sSnap = await getDoc(doc(db, "students", effectiveStudentDocId));
          if (sSnap.exists()) {
            const sData = sSnap.data() as StudentDoc;
            enrolledBatchIds = sData.enrolledBatchIds || [];
            if (!effectiveTutorId) effectiveTutorId = sData.tutorId;
          }
        } else {
          const sQuery = query(collection(db, "students"), where("authUid", "==", user.uid));
          const sSnap = await getDocs(sQuery);
          if (!sSnap.empty) {
            const sData = sSnap.docs[0].data() as StudentDoc;
            enrolledBatchIds = sData.enrolledBatchIds || [];
            if (!effectiveTutorId) effectiveTutorId = sData.tutorId;
          }
        }

        if (!effectiveTutorId) return;

        // Fetch batches for tutorId
        const bSnap = await getDocs(
          query(collection(db, "batches"), where("tutorId", "==", effectiveTutorId))
        );
        let bList: BatchDoc[] = [];
        bSnap.forEach((d) => bList.push({ id: d.id, ...d.data() } as BatchDoc));

        // Filter by enrolledBatchIds if defined
        if (enrolledBatchIds.length > 0) {
          const enrolledSet = new Set(enrolledBatchIds);
          const filtered = bList.filter((b) => enrolledSet.has(b.id));
          if (filtered.length > 0) {
            bList = filtered;
          }
        }

        setBatches(bList);
        if (bList.length > 0) {
          setBatchId((prev) => (prev ? prev : bList[0].id));
        }
      } catch (err) {
        console.error("Error loading batches for student:", err);
      }
    }
    loadBatches();

    return unsubscribe;
  }, [user, claims, selectedDoubtId]);

  // Active doubt thread listener
  useEffect(() => {
    if (!user || !selectedDoubtId) {
      setMessages([]);
      return;
    }

    // Mark as read
    user.getIdToken().then((token) => markDoubtAsRead(selectedDoubtId, token));

    const unsubMessages = onSnapshot(
      collection(db, "doubts", selectedDoubtId, "messages"),
      (snap) => {
        const list: MessageDoc[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as MessageDoc));
        list.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        setMessages(list);
      }
    );

    return unsubMessages;
  }, [user, selectedDoubtId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedDoubtId]);

  // Fetch Signed URLs for media attachments
  const activeDoubt = doubts.find((d) => d.id === selectedDoubtId);

  useEffect(() => {
    if (!user || (!activeDoubt && messages.length === 0)) return;

    async function fetchSignedUrls() {
      const token = await user!.getIdToken();
      const pathsToFetch: string[] = [];

      if (activeDoubt?.attachmentPath) pathsToFetch.push(activeDoubt.attachmentPath);
      messages.forEach((m) => {
        if (m.attachmentPath) pathsToFetch.push(m.attachmentPath);
      });

      const newUrls: Record<string, string> = {};
      for (const path of pathsToFetch) {
        if (!signedUrls[path]) {
          try {
            const url = await getMediaSignedUrl(path, token);
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
        attachmentPath = `doubts/${tutorId}/${user.uid}/${selectedDoubtId}/${tempId}_${cleanName}`;
        attachmentType = selectedAttachment.type;
        attachmentName = file.name;
        attachmentSize = file.size;

        const storageRef = ref(storage, attachmentPath);
        await uploadBytes(storageRef, file);
      }

      const token = await user.getIdToken();
      await postMessage(
        selectedDoubtId,
        {
          text: newMessageText.trim(),
          attachmentPath,
          attachmentType,
          attachmentName,
          attachmentSize,
        },
        token
      );

      setNewMessageText("");
      setSelectedAttachment(null);
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
      const attachmentPath = `doubts/${tutorId}/${user.uid}/${selectedDoubtId}/${fileName}`;
      const storageRef = ref(storage, attachmentPath);
      await uploadBytes(storageRef, audioBlob);

      const token = await user.getIdToken();
      await postMessage(
        selectedDoubtId,
        {
          text: `Voice note (${duration}s)`,
          attachmentPath,
          attachmentType: "audio",
          attachmentName: fileName,
          attachmentSize: audioBlob.size,
        },
        token
      );

      setShowVoiceRecorder(false);
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
    if (!user || !claims || claims.role !== "student") return;
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
        attachmentPath = `doubts/${claims.tutorId}/${user.uid}/${doubtTempId}/${cleanName}`;
        attachmentType = modalFile.type.startsWith("image/") ? "image" : "file";
        attachmentName = modalFile.name;
        attachmentSize = modalFile.size;

        const storageRef = ref(storage, attachmentPath);
        await uploadBytes(storageRef, modalFile);
      }

      const token = await user.getIdToken();
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
        user.displayName || "Student",
        token
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
      const token = await user.getIdToken();
      await updateDoubtStatus(selectedDoubtId, "resolved", token);
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
    <div className="h-[calc(100vh-9.5rem)] md:h-[calc(100vh-6.5rem)] flex flex-col space-y-3">
      {/* Page Header */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Inbox & Teacher Chat
          </h1>
          <p className="text-xs text-slate-500 font-medium">
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
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden min-h-0">
        {/* LEFT SIDEBAR: Threads & Conversations List */}
        <div
          className={`md:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50 ${
            selectedDoubtId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search & Filters */}
          <div className="p-3 space-y-2 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {["all", "pending", "answered", "resolved"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-500 hover:text-slate-900"
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
                  <div key={i} className="h-16 rounded-xl animate-shimmer bg-slate-200/60" />
                ))}
              </div>
            ) : filteredDoubts.length === 0 ? (
              <div className="py-12 text-center px-4">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No conversation threads</p>
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
                        ? "bg-indigo-50/70 border-l-4 border-indigo-600"
                        : "hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs">
                      {d.studentName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{d.title}</h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {d.lastMessageAt
                            ? new Date(d.lastMessageAt.toMillis()).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {d.initialQuestion}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5">
                        {d.status === "pending" && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Answer
                          </span>
                        )}
                        {d.status === "answered" && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Answered
                          </span>
                        )}
                        {d.status === "resolved" && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
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
          className={`md:col-span-8 flex flex-col h-full bg-white ${
            selectedDoubtId ? "flex" : "hidden md:flex"
          }`}
        >
          {activeDoubt ? (
            <>
              {/* Messenger Active Chat Header */}
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedDoubtId(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
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
                      <h3 className="text-sm font-bold text-slate-900">Your Teacher</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tutorPresence.isOnline
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {tutorPresence.lastSeenText}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate max-w-xs md:max-w-md font-medium">
                      Topic: <strong className="text-slate-800">{activeDoubt.title}</strong>
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
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
                {/* Initial Question Bubble */}
                <div className="max-w-xl mx-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                    Topic Question Overview
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
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
                          className="max-h-64 rounded-xl border border-slate-200 object-contain bg-black/5"
                        />
                      ) : (
                        <a
                          href={signedUrls[activeDoubt.attachmentPath]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-indigo-600 transition-colors"
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
                  const isMe = msg.senderUid === user?.uid;
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
                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
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
                              ? new Date(msg.createdAt.toMillis()).toLocaleTimeString([], {
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
                                className="max-h-60 rounded-xl border border-black/10 object-contain bg-black/5"
                              />
                            ) : (
                              <a
                                href={attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-colors ${
                                  isMe
                                    ? "bg-indigo-700 text-white hover:bg-indigo-800"
                                    : "bg-slate-100 text-indigo-600 hover:bg-slate-200"
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
              <div className="p-3 border-t border-slate-200 bg-white shrink-0 space-y-2">
                {error && (
                  <div className="p-2 text-xs rounded-lg bg-red-50 text-red-600 border border-red-200">
                    {error}
                  </div>
                )}

                {/* Selected File Preview */}
                {selectedAttachment && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700">
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
                      className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
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
                      className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
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
                      className="p-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Record Voice Note"
                    >
                      <Mic className="w-5 h-5" />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500 text-slate-900 font-medium"
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Select a conversation thread</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose a topic from the left sidebar or click &quot;New Topic&quot; to start chatting with your teacher.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Topic Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Start New Chat Topic</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 text-xs rounded-lg bg-red-50 text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateDoubt} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Batch</label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none text-slate-800"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Topic Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Physics Math Doubt Chapter 3"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Question / Message</label>
                <textarea
                  required
                  rows={3}
                  value={initialQuestion}
                  onChange={(e) => setInitialQuestion(e.target.value)}
                  placeholder="Explain your doubt or question..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional Photo or File Attachment
                </label>
                <input
                  type="file"
                  onChange={(e) => setModalFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal || !title || !initialQuestion}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {submittingModal ? "Starting..." : "Start Chat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
