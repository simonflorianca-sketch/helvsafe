import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const provider = body.provider;
    const order = body.order;

    const instance = process.env.PAYREXX_INSTANCE!;
    const apiKey = process.env.PAYREXX_API_KEY!;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

    const successUrl = `${baseUrl}/?paid=1`;
    const failUrl = `${baseUrl}/?paid=0`;

    const amount = Math.round(order.total * 100);

    const payload = {
      amount,
      currency: "CHF",
      purpose: `Bestellung ${order.id}`,
      referenceId: order.id,
      successRedirectUrl: successUrl,
      failedRedirectUrl: failUrl,
      cancelRedirectUrl: failUrl,
      skipResultPage: true,
      fields: {
        email: order.customer.email,
        forename: order.customer.firstName,
        surname: order.customer.lastName,
      },
      pm: provider === "twint" ? ["twint"] : ["visa", "mastercard"],
      basket: order.items.map((item: any) => ({
        name: item.title,
        description: item.title,
        quantity: item.qty,
        amount: Math.round(item.price * 100),
      })),
    };

    const res = await fetch(
      `https://api.payrexx.com/v1.14/Gateway/?instance=${encodeURIComponent(instance)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Payrexx API error:", data);
      return NextResponse.json(
        { error: data?.message || data?.error || "Payrexx Fehler" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      paymentLink: data?.data?.link,
    });
  } catch (error) {
    console.error("Payrexx checkout error:", error);
    return NextResponse.json({ error: "Checkout Fehler" }, { status: 500 });
  }
}