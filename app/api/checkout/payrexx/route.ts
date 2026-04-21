import { NextResponse } from "next/server";

type BasketItem = {
  name: string;
  description: string;
  quantity: number;
  amount: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const provider = body?.provider;
    const order = body?.order;

    const instance = process.env.PAYREXX_INSTANCE;
    const apiKey = process.env.PAYREXX_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!instance || !apiKey || !baseUrl) {
      return NextResponse.json(
        { error: "Payrexx ist nicht korrekt konfiguriert." },
        { status: 500 }
      );
    }

    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      return NextResponse.json(
        { error: "Bestellung ist unvollständig." },
        { status: 400 }
      );
    }

    const successUrl = `${baseUrl}/?paid=1`;
    const failedUrl = `${baseUrl}/?paid=0`;
    const cancelUrl = `${baseUrl}/?paid=0`;

    const basket: BasketItem[] = order.items.map((item: any) => ({
      name: item.title,
      description: item.title,
      quantity: Number(item.qty) || 1,
      amount: Math.round((Number(item.price) || 0) * 100),
    }));

    if (order.shipping && Number(order.shipping) > 0) {
      basket.push({
        name: "Versand",
        description: "Versandkosten",
        quantity: 1,
        amount: Math.round(Number(order.shipping) * 100),
      });
    }

    if (order.discount && Number(order.discount) > 0) {
      basket.push({
        name: "Rabatt",
        description: "Rabatt",
        quantity: 1,
        amount: -Math.round(Number(order.discount) * 100),
      });
    }

    const amount = basket.reduce(
      (sum, item) => sum + item.amount * item.quantity,
      0
    );

    const payload = {
      amount,
      currency: "CHF",
      purpose: `Bestellung ${order.id}`,
      referenceId: order.id,
      successRedirectUrl: successUrl,
      failedRedirectUrl: failedUrl,
      cancelRedirectUrl: cancelUrl,
      skipResultPage: true,
      pm:
        provider === "twint"
          ? ["twint"]
          : provider === "card"
          ? ["visa", "mastercard"]
          : [],
      basket,
      fields: {
        forename: { value: order.customer?.firstName || "" },
        surname: { value: order.customer?.lastName || "" },
        email: { value: order.customer?.email || "" },
        street: { value: order.customer?.address || "" },
        postcode: { value: order.customer?.zip || "" },
        place: { value: order.customer?.city || "" },
        country: { value: order.customer?.country || "CH" },
        phone: { value: order.customer?.phone || "" },
      },
    };

    const res = await fetch(
      `https://api.payrexx.com/v1.14/Gateway/?instance=${encodeURIComponent(
        instance
      )}`,
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

    const paymentLink =
      data?.link ??
      data?.data?.link ??
      data?.data?.url ??
      data?.data?.[0]?.link ??
      data?.data?.[0]?.url ??
      data?.url ??
      null;

    if (!paymentLink) {
      return NextResponse.json(
        {
          error: "Payrexx hat keinen Zahlungslink zurückgegeben.",
          debug: data,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      paymentLink,
    });
  } catch (error) {
    console.error("Payrexx checkout error:", error);
    return NextResponse.json(
      { error: "Checkout Fehler" },
      { status: 500 }
    );
  }
}