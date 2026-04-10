import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?paid=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?paid=0`,
      metadata: {
        order: JSON.stringify(body),
      },
      line_items: body.items.map((item: any) => ({
        price_data: {
          currency: "chf",
          product_data: {
            name: item.title,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty,
      })),
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Stripe Fehler" }, { status: 500 });
  }
}