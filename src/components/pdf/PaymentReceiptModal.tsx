"use client";

import { X, Printer, Download, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { triggerPrintWindow } from "@/lib/pdfUtils";

export interface PaymentReceiptData {
  receiptNo: string;
  studentName: string;
  studentPhone?: string;
  batchName: string;
  subjectName?: string;
  tutorName: string;
  tutorPhone?: string;
  institution?: string;
  monthYear: string;
  amountDue: number;
  amountPaid: number;
  paymentMethod?: string;
  paidAt?: string;
  status: "paid" | "unpaid" | "partial";
}

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: PaymentReceiptData | null;
}

export function PaymentReceiptModal({ isOpen, onClose, receipt }: PaymentReceiptModalProps) {
  if (!isOpen || !receipt) return null;

  const isPaid = receipt.status === "paid";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Action Header — Hidden when printing */}
        <div className="print:hidden bg-slate-100 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              Payment Receipt / Voucher
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerPrintWindow()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
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

        {/* Receipt Printable Sheet Body */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-800 dark:text-slate-100 bg-white" id="printable-receipt">
          
          {/* Header Banner */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-indigo-600">TutorMate</span>
                <span className="text-xs uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  OFFICIAL RECEIPT
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Smart Tutor Management Platform</p>
              {receipt.institution && (
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{receipt.institution}</p>
              )}
            </div>

            <div className="text-right">
              <p className="text-xs font-mono font-bold text-slate-400">REC-NO: {receipt.receiptNo}</p>
              <p className="text-xs text-slate-500 mt-1">
                Date: {receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border">
                {isPaid ? (
                  <span className="bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PAID
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> UNPAID / DUE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Student & Tutor Details Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Student Details</p>
              <p className="text-sm font-bold text-slate-900">{receipt.studentName}</p>
              {receipt.studentPhone && <p className="text-slate-600 mt-0.5">Phone: {receipt.studentPhone}</p>}
              <p className="text-slate-600 mt-0.5">Batch: <strong>{receipt.batchName}</strong></p>
            </div>

            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Tutor / Institution</p>
              <p className="text-sm font-bold text-slate-900">{receipt.tutorName}</p>
              {receipt.tutorPhone && <p className="text-slate-600 mt-0.5">Contact: {receipt.tutorPhone}</p>}
              <p className="text-slate-600 mt-0.5">Billing Month: <strong>{receipt.monthYear}</strong></p>
            </div>
          </div>

          {/* Payment Summary Table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 uppercase tracking-wider text-left">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Batch</th>
                <th className="py-2.5 px-3 text-right">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-3 font-medium">Monthly Tuition Fee ({receipt.monthYear})</td>
                <td className="py-3 px-3 text-slate-600">{receipt.batchName}</td>
                <td className="py-3 px-3 text-right font-bold">৳ {receipt.amountDue.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={2} className="py-3 px-3 font-bold text-right text-slate-700">Total Paid:</td>
                <td className="py-3 px-3 text-right font-black text-sm text-indigo-700">
                  ৳ {receipt.amountPaid.toLocaleString("en-IN")}
                </td>
              </tr>
              {receipt.paymentMethod && (
                <tr>
                  <td colSpan={2} className="py-1 px-3 text-right text-slate-400">Payment Method:</td>
                  <td className="py-1 px-3 text-right font-semibold text-slate-600 uppercase">{receipt.paymentMethod}</td>
                </tr>
              )}
            </tfoot>
          </table>

          {/* Footer Authorization Block */}
          <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-400">
            <div>
              <p className="font-semibold text-slate-500">Thank you for your payment!</p>
              <p className="mt-0.5 text-[10px]">Generated automatically via TutorMate SaaS Platform</p>
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-slate-400 mb-1"></div>
              <p className="font-semibold text-slate-600">Authorized Signature</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
