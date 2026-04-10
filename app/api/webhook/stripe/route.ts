import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const event = JSON.parse(body);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const order = JSON.parse(session.metadata.order);

      await supabase.from("orders").insert([
        {
          id: order.id,
          created_at: order.createdAt,
          items: JSON.stringify(order.items),
          subtotal: order.subtotal,
          shipping: order.shipping,
          discount: order.discount,
          total: order.total,
          customer: JSON.stringify(order.customer),
          status: "bezahlt",
        },
      ]);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook Fehler" }, { status: 500 });
  }
}