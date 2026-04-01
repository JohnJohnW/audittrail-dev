/**
 * CISO Executive Summary API
 *
 * Disabled — AI board summaries will return in a future release.
 * This endpoint was removed from the $5/mo plan to control API costs.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      status: "unavailable",
      message: "AI board summaries are coming in a future release.",
    },
    { status: 501 }
  );
}
