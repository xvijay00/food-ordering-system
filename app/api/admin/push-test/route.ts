import { NextResponse } from "next/server";
import { sendStaffOrderPush } from "@/lib/push";

export async function POST(request: Request) {
  try {
    let orderNo = 1;
    let customerName = "Vijay Kumar";
    let amount = 459;

    try {
      const body = await request.json();
      if (body.orderNo) orderNo = body.orderNo;
      if (body.customerName) customerName = body.customerName;
      if (body.amount) amount = body.amount;
    } catch {
      // Use defaults if empty body
    }

    await sendStaffOrderPush({
      title: `🔔 New Order #${orderNo} Received from ${customerName}! (₹${amount})`,
      body: "1x Designer Birthday Cake · Tap to open live order details",
      url: "/admin/orders?alert=1",
    });

    return NextResponse.json({ success: true, message: "Push alert sent to staff devices." });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send test push alert." },
      { status: 500 }
    );
  }
}
