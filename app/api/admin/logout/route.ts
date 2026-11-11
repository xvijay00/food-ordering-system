import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase-server";

async function performLogout(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Proceed with redirect even if Supabase env vars are missing
  }

  const requestUrl = new URL(request.url);
  const errorParam = requestUrl.searchParams.get("error");
  const redirectUrl = new URL("/admin/login", requestUrl.origin);

  if (errorParam === "unauthorized") {
    redirectUrl.searchParams.set("error", "unauthorized");
  }

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: Request) {
  return performLogout(request);
}

export async function POST(request: Request) {
  return performLogout(request);
}

