import type { Metadata } from "next";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — TutorMate",
  description: "Get in touch with the TutorMate team. We are here to help with setup, billing, or any questions.",
};

const CONTACTS = [
  { icon: Mail, label: "Email", value: "iamjahid.2025@gmail.com", href: "mailto:iamjahid.2025@gmail.com" },
  { icon: Phone, label: "WhatsApp", value: "+880 1704-642575", href: "https://wa.me/8801704642575" },
  { icon: MapPin, label: "Location", value: "Dhaka, Bangladesh", href: null },
  { icon: MessageCircle, label: "Response Time", value: "Within 24 hours", href: null },
];

export default function ContactPage() {
  return (
    <div className="py-16 px-6 lg:px-16 max-w-4xl mx-auto">
      <div className="text-center mb-14 space-y-3">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: "var(--color-primary-50)", color: "var(--color-primary)", border: "1px solid var(--color-primary-100)" }}
        >
          💬 Get in Touch
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          We are here to help
        </h1>
        <p className="text-base max-w-lg mx-auto" style={{ color: "var(--color-text-secondary)" }}>
          Have questions? Need help with setup? Want to give feedback? Reach out — we love hearing from tutors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Info */}
        <div className="space-y-4">
          {CONTACTS.map(c => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--color-primary-50)" }}>
                  <Icon className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>{c.label}</p>
                  {c.href ? (
                    <a href={c.href} className="text-sm font-semibold hover:underline" style={{ color: "var(--color-text)" }}>
                      {c.value}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{c.value}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Form */}
        <div className="rounded-2xl p-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-base font-bold mb-5" style={{ color: "var(--color-text)" }}>Send a Message</h2>
          <form className="space-y-3" action="mailto:support@tutormate.app" method="GET">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Your Name</label>
              <input
                type="text" name="name" required placeholder="e.g. Rahim Uddin"
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Email Address</label>
              <input
                type="email" name="email" required placeholder="you@example.com"
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
                style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Message</label>
              <textarea
                name="body" required rows={4}
                placeholder="How can we help you?"
                className="w-full px-3 py-2.5 text-sm rounded-xl outline-none resize-none"
                style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))" }}
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
