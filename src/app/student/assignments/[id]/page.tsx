"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getAssignments, getStudentSubmissions, submitAssignment } from "@/actions/assignmentActions";
import { getMediaSignedUrl } from "@/actions/mediaActions";
import { ArrowLeft, CheckCircle, Clock, FileDown, Loader2, Upload, File as FileIcon, X, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { AssignmentDoc } from "@/types";

export default function StudentAssignmentDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { user, loading: authLoading } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentDoc | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, id]);

  async function loadData() {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");

      // Load assignment details
      const assignments = await getAssignments(token);
      const assign = assignments.find(a => a.id === id);
      if (assign) setAssignment(assign);

      // Load student's submission
      const subs = await getStudentSubmissions(token);
      const sub = subs.find((s: any) => s.assignmentId === id);
      if (sub) setSubmission(sub);

    } catch (err) {
      console.error("Failed to load assignment details:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = async (path: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const url = await getMediaSignedUrl(path, token);
      if (url) window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to get URL", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !submission) {
      setUploadError("Please select a file to upload.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token || !user) throw new Error("Authentication error");

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const storagePath = `submissions/${id}/${user.id}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadErr } = await supabase.storage
        .from("attachments")
        .upload(storagePath, file);

      if (uploadErr) throw new Error("Failed to upload file to storage.");

      // Save submission record
      await submitAssignment(submission.id, storagePath, token);

      setFile(null);
      await loadData();
    } catch (err: any) {
      setUploadError(err.message || "Failed to submit assignment");
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!assignment || !submission) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Assignment Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">The assignment you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/student/assignments" className="inline-block mt-4 text-indigo-600 font-medium">Go back to Assignments</Link>
      </div>
    );
  }

  const isOverdue = submission.status === 'pending' && new Date(assignment.deadline) < new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/student/assignments" className="inline-flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Assignments
      </Link>

      <div className="bg-white dark:bg-[#1e1e2e] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{assignment.title}</h1>
              {submission.status === 'graded' && <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-200 dark:border-emerald-500/20"><CheckCircle className="w-3 h-3" /> Graded</span>}
            </div>
            <p className={`flex items-center text-sm font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
              <Clock className="w-4 h-4 mr-1" />
              Due: {new Date(assignment.deadline).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            {submission.status === 'graded' ? (
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-indigo-600">{submission.marksObtained} <span className="text-lg text-slate-400">/ {assignment.maxMarks}</span></span>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Score</p>
              </div>
            ) : (
              <div>
                <span className="text-xl font-bold text-indigo-600">{assignment.maxMarks}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Points</p>
              </div>
            )}
          </div>
        </div>
        
        {assignment.description && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Instructions</h3>
            <div className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#13131f] p-4 rounded-xl text-sm border border-slate-100 dark:border-white/5 whitespace-pre-wrap">
              {assignment.description}
            </div>
          </div>
        )}
        
        {submission.status === 'graded' && submission.feedback && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Tutor Feedback</h3>
            <div className="text-indigo-900 bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl text-sm border border-indigo-100 italic">
              "{submission.feedback}"
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#1e1e2e] rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          My Work
        </h3>

        {submission.status === 'pending' ? (
          <form onSubmit={handleSubmit}>
            {uploadError && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-700 text-sm rounded-xl mb-4">
                {uploadError}
              </div>
            )}

            {!file ? (
              <div 
                className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-indigo-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Click to upload your assignment</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">PDF, Word, Images, or Video files accepted. Make sure your file is clear and readable.</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#13131f] border border-slate-200 dark:border-white/10 rounded-xl">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileIcon className="w-8 h-8 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setFile(null)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-70 shadow-sm"
                >
                  {isUploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Turning in...</>
                  ) : (
                    <>Turn in Assignment</>
                  )}
                </button>
              </div>
            )}
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-[#13131f] border border-slate-200 dark:border-white/10 rounded-xl gap-4">
            <div className="flex items-center gap-4 text-left w-full sm:w-auto">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Assignment Submitted</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Turned in on {new Date(submission.submittedAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            {submission.filePath && (
              <button
                onClick={() => handleDownload(submission.filePath)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 bg-white dark:bg-[#1e1e2e] border border-slate-200 dark:border-white/10 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                <FileDown className="w-4 h-4" /> View Submission File
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
