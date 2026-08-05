import Link from "next/link";
import { Star, CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 flex-col p-12 text-white relative overflow-hidden bg-[#4f46e5]">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-400/30 rounded-full blur-3xl"></div>
        </div>

        {/* Header */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit transition-opacity hover:opacity-90">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🎓</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">TutorMate</h1>
              <p className="text-xs text-white/80 font-medium">Smart Tutor Management</p>
            </div>
          </Link>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center mt-12 mb-12">
          <div className="max-w-lg">
            <h2 className="text-4xl xl:text-5xl font-bold leading-[1.15] mb-6 tracking-tight text-white">
              Streamline your tutoring business.
            </h2>
            <p className="text-lg text-white/80 mb-10 leading-relaxed">
              Join thousands of educators and students managing classes, fees, and attendance in one unified platform.
            </p>

            {/* Testimonial Card */}
            <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-white/95 text-base font-medium leading-relaxed italic mb-5">
                "Managing my 40+ students across 5 batches used to take hours. Now it takes minutes. The automated fee tracking alone is a lifesaver."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-800 flex items-center justify-center text-sm font-bold border-2 border-white/20 shadow-inner">
                  RA
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Rafiq Ahmed</div>
                  <div className="text-white/70 text-xs">Private Tutor, Dhaka</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Features */}
        <div className="relative z-10 flex flex-wrap items-center gap-6 text-white/80 text-xs font-semibold mt-auto pt-6 border-t border-white/10">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Batch Management</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Fee Tracking</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Smart Analytics</span>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50 dark:bg-[#0b0f19]">
        <div className="w-full max-w-md animate-fade-in bg-white dark:bg-[#131b2e] p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
          {children}
        </div>
      </div>
    </div>
  );
}
