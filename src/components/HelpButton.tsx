"use client";

// Dispatches a custom event to open the onboarding modal from anywhere
export default function HelpButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-help-modal"))}
      className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      title="How to use"
    >
      Help
    </button>
  );
}
