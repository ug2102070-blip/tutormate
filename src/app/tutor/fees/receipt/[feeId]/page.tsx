import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { getTutorId } from "@/lib/enrollment";
import { formatBDT } from "@/lib/utils";
import { ArrowLeft, Printer, CheckCircle, Receipt, Building, Calendar, User, Phone, ShieldCheck } from "lucide-react";

interface ReceiptPageProps {
  params: Promise<{ feeId: string }>;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default async function FeeReceiptPage({ params }: ReceiptPageProps) {
  const { feeId } = await params;
  const auth = await verifyUserAuth();
  const tutorId = getTutorId(auth);

  const supabase = createAdminClient();

  // 1. Fetch Fee record with tutor ownership verification
  const { data: fee, error: feeErr } = await supabase
    .from("fees")
    .select("*")
    .eq("id", feeId)
    .eq("tutor_id", tutorId)
    .single();

  if (feeErr || !fee) {
    notFound();
  }

  // 2. Fetch Student, Batch, and Tutor details in parallel
  const [studentRes, batchRes, tutorRes] = await Promise.all([
    supabase
      .from("students")
      .select("full_name, phone, guardian_phone, institution")
      .eq("id", fee.student_id)
      .single(),
    supabase
      .from("batches")
      .select("name, subject, grade_class")
      .eq("id", fee.batch_id)
      .single(),
    supabase
      .from("tutors")
      .select("full_name, institution, contact_phone, bkash_number")
      .eq("id", tutorId)
      .single(),
  ]);

  const student = studentRes.data;
  const batch = batchRes.data;
  const tutor = tutorRes.data;

  const receiptNo = `RCP-${fee.id.slice(0, 8).toUpperCase()}`;
  const monthName = months[(fee.month as number) - 1] || `Month ${fee.month}`;
  const amountDue = Number(fee.amount_due) || 0;
  const amountPaid = Number(fee.amount_paid) || 0;
  const balanceDue = Math.max(0, amountDue - amountPaid);
  const paidDateStr = fee.paid_at
    ? new Date(fee.paid_at).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })
    : new Date().toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-6">
      {/* Non-printable Action Bar */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/tutor/fees"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Fee Ledger</span>
        </Link>

        <button
          type="button"
          onClick={() => {}}
          // Note: In client or via window.print trigger
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
          id="print-receipt-btn"
        >
          <Printer className="w-4 h-4" />
          <span>Print Receipt / PDF</span>
        </button>
      </div>

      {/* Printable Receipt Voucher Container */}
      <div
        className="p-8 sm:p-10 rounded-2xl border shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 print:border-none print:shadow-none print:p-4 text-slate-900 dark:text-slate-100"
        id="printable-receipt"
      >
        {/* Receipt Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Receipt className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black tracking-tight">
                {tutor?.institution || "TutorMate Private Tuition"}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Instructor: <strong>{tutor?.full_name || "Tutor"}</strong>
              {tutor?.contact_phone ? ` · Tel: ${tutor.contact_phone}` : ""}
            </p>
          </div>

          <div className="text-right space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800">
              <CheckCircle className="w-3 h-3" /> Payment Receipt
            </div>
            <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
              {receiptNo}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Issued: {paidDateStr}
            </div>
          </div>
        </div>

        {/* Student & Batch Information Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Student Details
            </div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              {student?.full_name || "Student"}
            </div>
            {student?.phone && (
              <div className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> {student.phone}
              </div>
            )}
            {student?.institution && (
              <div className="text-slate-500 dark:text-slate-400 font-medium">
                School/College: {student.institution}
              </div>
            )}
          </div>

          <div className="space-y-1.5 sm:text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Batch & Academic Period
            </div>
            <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              {batch?.name || "Batch Tuition"}
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              {batch?.grade_class ? `Class ${batch.grade_class}` : ""} {batch?.subject ? `(${batch.subject})` : ""}
            </div>
            <div className="text-indigo-600 dark:text-indigo-400 font-bold">
              Fee For: {monthName} {fee.year}
            </div>
          </div>
        </div>

        {/* Payment Line Item Table */}
        <div className="py-6 border-b border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-center">Month</th>
                <th className="pb-2 text-center">Method</th>
                <th className="pb-2 text-right">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              <tr>
                <td className="py-3 font-bold">
                  Monthly Tuition Fee — {batch?.name || "Batch"}
                </td>
                <td className="py-3 text-center font-semibold">
                  {monthName} {fee.year}
                </td>
                <td className="py-3 text-center uppercase font-mono text-[11px] font-bold text-slate-500">
                  {fee.payment_method || "Cash"}
                </td>
                <td className="py-3 text-right font-black text-slate-900 dark:text-slate-100">
                  {formatBDT(amountDue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> Official Verified Receipt
            </div>
            <p className="text-[10px]">
              Payment received on {paidDateStr}. Thank you for your payment.
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-1.5 text-xs font-semibold">
            <div className="flex justify-between text-slate-500">
              <span>Total Invoiced:</span>
              <span>{formatBDT(amountDue)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 text-sm font-black">
              <span>Amount Paid:</span>
              <span>{formatBDT(amountPaid)}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between text-rose-500 font-bold border-t pt-1">
                <span>Remaining Due:</span>
                <span>{formatBDT(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Signature Box for Print */}
        <div className="mt-12 pt-8 border-t border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between text-center text-xs text-slate-400">
          <div>
            <div className="w-40 border-b border-slate-400 dark:border-slate-600 mb-1" />
            <span>Student / Guardian Signature</span>
          </div>
          <div>
            <div className="w-40 border-b border-slate-400 dark:border-slate-600 mb-1" />
            <span>Authorized Tutor Signature</span>
          </div>
        </div>
      </div>

      {/* Script for client-side print button */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('print-receipt-btn')?.addEventListener('click', function() {
              window.print();
            });
          `,
        }}
      />
    </div>
  );
}
