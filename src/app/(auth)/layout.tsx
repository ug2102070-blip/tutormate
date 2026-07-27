export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-600 text-white relative">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            TutorMate
          </h1>
          <p className="mt-1 text-white/80 text-sm font-medium">
            Smart Tutor Management
          </p>
        </div>

        <div className="space-y-4 max-w-md">
          <blockquote className="text-white/95 text-lg font-medium leading-relaxed italic">
            &ldquo;Managing my 40+ students across 5 batches used to take hours.
            Now it takes minutes.&rdquo;
          </blockquote>
          <div className="text-white/70 text-xs font-semibold">
            — Rafiq Ahmed, Private Tutor, Dhaka
          </div>
        </div>

        <div className="flex items-center gap-6 text-white/70 text-xs font-semibold">
          <span>📚 Batch Management</span>
          <span>💰 Fee Tracking</span>
          <span>❓ Ask Your Teacher</span>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50 dark:bg-[#0b0f19]">
        <div className="w-full max-w-md animate-fade-in bg-white dark:bg-[#131b2e] p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-white/10 shadow-md">
          {children}
        </div>
      </div>
    </div>
  );
}
