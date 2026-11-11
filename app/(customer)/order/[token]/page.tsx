import { OrderTracker } from "@/components/customer/order-tracker";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <OrderTracker token={token} />;
}

