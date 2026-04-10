import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const provider = body.provider;
    const order = body.order;

    const instance = process.env.PAYREXX_INSTANCE!;
    const apiKey = process.env.PAYREXX_API_KEY!;
    const successUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/?paid=1`;
    const failUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/?paid=0`;

    const amount = Math.round(order.total * 100);

    const payload = {
      amount,
      currency: "CHF",
      purpose: `Bestellung ${order.id}`,
      referenceId: order.id,
      successRedirectUrl: successUrl,
      failedRedirectUrl: failUrl,
      fields: {
        email: order.customer.email,
        forename: order.customer.firstName,
        surname: order.customer.lastName,
      },
      pm: provider === "twint" ? ["twint"] : ["visa", "mastercard"],
    };

    const res = await fetch(`https://${instance}.payrexx.com/api/v1.0/Gateway`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || "Payrexx Fehler" },
        { status: 500 },
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