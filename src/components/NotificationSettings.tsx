"use client";

import { useEffect, useState } from "react";
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
  getPollInterval,
  setPollInterval,
  requestNotificationPermission,
} from "@/hooks/useJobPolling";

const INTERVALS = [
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
];

export default function NotificationSettings() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [interval, setInterval_] = useState(15);
  const [permissionState, setPermissionState] = useState<string>("default");

  useEffect(() => {
    setEnabled(getNotificationsEnabled());
    setInterval_(getPollInterval());
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  async function handleToggle() {
    const next = !enabled;
    if (next) {
      const granted = await requestNotificationPermission();
      setPermissionState("Notification" in window ? Notification.permission : "denied");
      if (!granted) {
        // Still enable in-app toasts even if browser notifications denied
      }
    }
    setEnabled(next);
    setNotificationsEnabled(next);
  }

  function handleInterval(minutes: number) {
    setInterval_(minutes);
    setPollInterval(minutes);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`text-[13px] transition-colors ${
          enabled
            ? "text-[var(--text-primary)] font-medium"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
        title="Notification settings"
      >
        {enabled ? "Notifications on" : "Notifications"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-[var(--border-default)]
                          bg-[var(--bg-card)] shadow-lg animate-fade-in p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                Job alerts
              </span>
              <button
                onClick={handleToggle}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  enabled ? "bg-[var(--text-primary)]" : "bg-[var(--border-default)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    enabled ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {enabled && (
              <>
                <p className="text-[11px] text-[var(--text-tertiary)] mb-3">
                  Check for new jobs every:
                </p>
                <div className="flex gap-1.5 mb-3">
                  {INTERVALS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleInterval(opt.value)}
                      className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                        interval === opt.value
                          ? "border-[var(--border-active)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                          : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {permissionState === "denied" && (
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Browser notifications blocked. You'll still get in-app alerts.
                  </p>
                )}
                {permissionState === "granted" && (
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Desktop + in-app notifications active.
                  </p>
                )}
                {permissionState === "default" && (
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Browser will ask for notification permission.
                  </p>
                )}
              </>
            )}

            {!enabled && (
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Enable to get alerts when new jobs are posted.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
