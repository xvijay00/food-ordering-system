import { NextResponse } from "next/server";

import { uploadImageFromFormData } from "@/lib/upload-image";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_UPLOADS = 15;
const uploadRateStore = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function allowUpload(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const recent = (uploadRateStore.get(ip) ?? []).filter((ts) => ts > windowStart);
  if (recent.length >= RATE_MAX_UPLOADS) {
    uploadRateStore.set(ip, recent);
    return false;
  }
  recent.push(now);
  uploadRateStore.set(ip, recent);
  return true;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!allowUpload(ip)) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  return uploadImageFromFormData(request, "custom-cakes");
}

