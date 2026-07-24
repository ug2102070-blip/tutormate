"use client";

import { useState } from "react";
import { MessageSquarePlus, X, Star, CheckCircle, Loader2 } from "lucide-react";
import { submitFeedbackAction } from "@/actions/feedbackActions";

interface FeedbackWidgetProps {
  userId: string;
  userRole: "tutor" | "student";
}

export function FeedbackWidget({ userId, userRole }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<
    "ease_of_use" | "missing_feature" | "bug_report" | "pricing" | "other"
  >("ease_of_use");
  const [message, setMessage] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setErrorMessage("");

    const res = await submitFeedbackAction({
      userId,
      userRole,
      rating,
      category,
      message,
      suggestedPrice,
    });

    setIsSubmitting(false);

    if (res.success) {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setIsOpen(false);
        setMessage("");
        setSuggestedPrice("");
        setRating(5);
      }, 2000);
    } else {
      setErrorMessage(res.error || "Failed to submit feedback.");
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Give Feedback"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {isSubmitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h3 className="text-lg font-bold text-slate-800">Feedback Submitted!</h3>
                <p className="text-sm text-slate-600">
                  Thank you for helping us improve TutorMate.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Send Pilot Feedback</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your feedback shapes the future of TutorMate.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
                    {errorMessage}
                  </div>
                )}

                {/* Rating */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Overall Experience
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 transition-transform hover:scale-110 focus:outline-hidden"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Feedback Topic
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="ease_of_use">Ease of Use / UX</option>
                    <option value="missing_feature">Missing Feature Request</option>
                    <option value="bug_report">Bug or Issue Report</option>
                    <option value="pricing">Pricing & Subscription</option>
                    <option value="other">General Feedback</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Thoughts
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what was easy, confusing, or could be improved..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Suggested Pricing (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reasonable Monthly Price (Optional)
                  </label>
                  <input
                    type="text"
                    value={suggestedPrice}
                    onChange={(e) => setSuggestedPrice(e.target.value)}
                    placeholder="e.g. 500 BDT / month, $10 / month"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-semibold text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Feedback"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
