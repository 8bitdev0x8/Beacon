// ── POST /api/companies ──
// Toggle pin or save-for-later on a company feed.
// Body: { feedUrl: string, action: "pin" | "save" }

import { NextRequest, NextResponse } from "next/server";
import { togglePin, toggleSave } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const { feedUrl, action } = await req.json();

  if (!feedUrl || !["pin", "save"].includes(action)) {
    return NextResponse.json(
      { error: "feedUrl and action (pin|save) are required" },
      { status: 400 }
    );
  }

  const newState =
    action === "pin" ? togglePin(feedUrl) : toggleSave(feedUrl);

  return NextResponse.json({ feedUrl, action, active: newState });
}
