import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import OnboardingModal from "@/components/OnboardingModal";
import HelpButton from "@/components/HelpButton";
import NotificationSettings from "@/components/NotificationSettings";
import ToastContainer from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beacon",
  description: "Monitor tech jobs from company feeds and employer pipelines",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-[family-name:var(--font-geist-sans)] min-h-screen bg-[var(--bg-primary)]">
        <OnboardingModal />
        <ToastContainer />

        <header className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
              Beacon
            </span>

            <div className="flex items-center gap-4">
              <NotificationSettings />
              <div className="w-px h-4 bg-[var(--border-default)]" />
              <HelpButton />
              <div className="w-px h-4 bg-[var(--border-default)]" />
              <a
                href="/api/rss"
                target="_blank"
                className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                RSS Feed
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>

        <footer className="border-t border-[var(--border-default)] mt-20">
          <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <p className="text-[12px] text-[var(--text-tertiary)]">Beacon</p>
            <a href="/api/rss" target="_blank"
               className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
              /api/rss
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
