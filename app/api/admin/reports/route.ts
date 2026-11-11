import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import {
  fetchSalesReport,
  isValidReportRange,
  type ReportRangeKey,
} from "@/lib/reports";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawRange = searchParams.get("range");
  const range: ReportRangeKey = isValidReportRange(rawRange)
    ? rawRange
    : "today";

  const { report, rpcError } = await fetchSalesReport(range);
  if (rpcError) {
    return NextResponse.json({ error: rpcError, report }, { status: 500 });
  }

  return NextResponse.json({ report });
}

