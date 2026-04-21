import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const provider = body.provider;
    const order = body.order;

    const instance = process.env.PAYREXX_INSTANCE;
    const apiKey = process.env.PAYREXX_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!instance || !apiKey || !baseUrl) {
      return NextResponse.json(
        { error: "Payrexx ist nicht korrekt konfiguriert." },
        { status: 500 }
      );
    }

    const successUrl = `${baseUrl}/?paid=1`;
    const failUrl = `${baseUrl}/?paid=0`;

    const basket = [
      ...order.items.map((item: any) => ({
        name: item.title,
        description: item.title,
        quantity: item.qty,
        amount: Math.round(item.price * 100),
      })),
    ];

    if (order.shipping && order.shipping > 0) {
      basket.push({
        name: "Versand",
        description: "Versandkosten",
        quantity: 1,
        amount: Math.round(order.shipping * 100),
      });
    }

    if (order.discount && order.discount > 0) {
      basket.push({
        name: "Rabatt",
        description: "Rabatt",
        quantity: 1,
        amount: -Math.round(order.discount * 100),
      });
    }

    const amount = basket.reduce(
      (sum: number, item: any) => sum + item.amount * item.quantity,
      0
    );

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
        street: order.customer.address,
        postcode: order.customer.zip,
        place: order.customer.city,
        country: order.customer.country,
      },
      pm:
        provider === "twint"
          ? ["twint"]
          : provider === "card"
          ? ["visa", "mastercard"]
          : [],
      basket,
    };

    const res = await fetch(
      `https://api.payrexx.com/v1.14/Gateway/?instance=${encodeURIComponent(instance)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();

    console.error("PAYREXX FULL RESPONSE:", JSON.stringify(data, null, 2));
    
    if (!res.ok) {
      return NextResponse.json(
        {
          error: data?.message || data?.error || "Payrexx Fehler",
          debug: data,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      paymentLink:
        data?.data?.link ||
        data?.data?.url ||
        data?.link ||
        data?.url ||
        null,
      debug: data,
    });