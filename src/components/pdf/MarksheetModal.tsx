"use client";

import { X, Printer, Award, CheckCircle } from "lucide-react";
import { triggerPrintWindow, calculateGrade } from "@/lib/pdfUtils";

export interface MarksheetData {
  examName: string;
  subjectName: string;
  batchName: string;
  studentName: string;
  studentPhone?: string;
  tutorName: string;
  institution?: string;
  marksObtained: number;
  totalMarks: number;
  highestMarks?: number;
  rank?: number;
  totalStudents?: number;
  examDate?: string;
  remarks?: string;
}

interface MarksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  marksheet: MarksheetData | null;
}

export function MarksheetModal({ isOpen, onClose, marksheet }: MarksheetModalProps) {
  if (!isOpen || !marksheet) return null;

  const { grade, color } = calculateGrade(marksheet.marksObtained, marksheet.totalMarks);
  const percentage = Math.round((marksheet.marksObtained / marksheet.totalMarks) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Action Header — Hidden when printing */}
        <div className="print:hidden bg-slate-100 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              Academic Marksheet / Report Card
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerPrintWindow()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Marksheet Printable Sheet Body */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-800 dark:text-slate-100 bg-white" id="printable-marksheet">
          
          {/* Header Banner */}
          <div className="text-center border-b border-slate-200 pb-6">
            <div className="inline-flex items-center justify-center gap-2 mb-1">
              <span className="text-3xl font-black text-indigo-600">TutorMate</span>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
              {marksheet.institution || "Academic Report Card & Marksheet"}
            </p>
            <h2 className="text-xl font-bold text-slate-900 mt-2 uppercase tracking-wide">
              {marksheet.examName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Subject: <strong>{marksheet.subjectName}</strong> | Batch: <strong>{marksheet.batchName}</strong>
            </p>
          </div>

          {/* Student Info Box */}
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Student Name</p>
              <p className="text-sm font-bold text-slate-900">{marksheet.studentName}</p>
              {marksheet.studentPhone && <p className="text-slate-500">Phone: {marksheet.studentPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">Instructor / Tutor</p>
              <p className="text-sm font-bold text-slate-900">{marksheet.tutorName}</p>
              {marksheet.examDate && <p className="text-slate-500">Date: {marksheet.examDate}</p>}
            </div>
          </div>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <p className="text-[10px] uppercase font-bold text-indigo-600">Marks Scored</p>
              <p className="text-2xl font-black text-indigo-900 mt-1">
                {marksheet.marksObtained} <span className="text-xs font-normal text-indigo-500">/ {marksheet.totalMarks}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <p className="text-[10px] uppercase font-bold text-emerald-600">Percentage & Grade</p>
              <p className={`text-2xl font-black mt-1 ${color}`}>
                {percentage}% ({grade})
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100">
              <p className="text-[10px] uppercase font-bold text-amber-600">Class Rank</p>
              <p className="text-2xl font-black text-amber-900 mt-1">
                {marksheet.rank ? `#${marksheet.rank}` : "N/A"}
                {marksheet.totalStudents && <span className="text-xs font-normal text-amber-600"> of {marksheet.totalStudents}</span>}
              </p>
            </div>
          </div>

          {/* Exam Details Table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider text-left">
                <th className="py-2.5 px-3">Subject / Evaluation</th>
                <th className="py-2.5 px-3 text-center">Total Marks</th>
                <th className="py-2.5 px-3 text-center">Highest in Batch</th>
                <th className="py-2.5 px-3 text-right">Marks Obtained</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3 px-3 font-semibold text-slate-800">{marksheet.subjectName}</td>
                <td className="py-3 px-3 text-center text-slate-600">{marksheet.totalMarks}</td>
                <td className="py-3 px-3 text-center text-slate-600">{marksheet.highestMarks ?? "N/A"}</td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">{marksheet.marksObtained}</td>
              </tr>
            </tbody>
          </table>

          {marksheet.remarks && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <p className="font-semibold text-slate-700">Tutor Remarks:</p>
              <p className="text-slate-600 italic mt-0.5">&ldquo;{marksheet.remarks}&rdquo;</p>
            </div>
          )}

          {/* Footer Authorization Block */}
          <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-400">
            <div>
              <p className="font-semibold text-slate-500 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Verified Academic Result
              </p>
              <p className="mt-0.5 text-[10px]">TutorMate Smart Tutor Management Platform</p>
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-slate-400 mb-1"></div>
              <p className="font-semibold text-slate-600">Tutor Signature</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
