export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-accent) 100%)",
        }}
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            TutorMate
          </h1>
          <p className="mt-2 text-white/70 text-sm">
            Smart Tutor Management
          </p>
        </div>

        <div className="space-y-6">
          <blockquote className="text-white/90 text-lg leading-relaxed">
            &ldquo;Managing my 40+ students across 5 batches used to take hours.
            Now it takes minutes.&rdquo;
          </blockquote>
          <div className="text-white/60 text-sm">
            — Rafiq Ahmed, Private Tutor, Dhaka
          </div>
        </div>

        <div className="flex items-center gap-8 text-white/50 text-sm">
          <span>📚 Batch Management</span>
          <span>💰 Fee Tracking</span>
          <span>❓ Ask Your Teacher</span>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[var(--color-bg)]">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
