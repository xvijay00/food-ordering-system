import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { uploadImageFromFormData } from "@/lib/upload-image";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  return uploadImageFromFormData(request, "items");
}
