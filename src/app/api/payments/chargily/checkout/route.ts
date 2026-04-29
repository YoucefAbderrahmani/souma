import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/lib/auth";
import { ChargilyClient } from "@chargily/chargily-pay";

type CheckoutItemInput = {
  id: number;
  title: string;
  quantity: number;
  unitPrice: number;
};

type CheckoutBody = {
  total: number;
  items: CheckoutItemInput[];
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  town?: string;
  country?: string;
  notes?: string;
};

function sanitizeText(value: string | undefined, maxLen = 250) {
  return (value ?? "").trim().slice(0, maxLen);
}

function normalizeChargilyCheckoutUrl(raw: string) {
  // Some responses may return http://pay.chargily.dz/... in test mode.
  // Force https to avoid browser mixed-content/navigation issues.
  return raw.replace(/^http:\/\/pay\.chargily\.(dz|net)\//i, "https://pay.chargily.$1/");
}

function toFlatMetadata(input: {
  source: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  town: string;
  country: string;
  notes: string;
  items: CheckoutItemInput[];
}) {
  return {
    source: input.source,
    user_id: input.userId ?? "",
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    customer_phone: input.customerPhone,
    address: input.address,
    town: input.town,
    country: input.country,
    notes: input.notes,
    items_json: JSON.stringify(
      input.items.map((item) => ({
        id: item.id,
        title: sanitizeText(item.title, 160),
        quantity: Math.max(1, Math.round(Number(item.quantity ?? 1))),
        unit_price: Math.max(0, Math.round(Number(item.unitPrice ?? 0))),
      }))
    ).slice(0, 1900),
  };
}

function detectAppOrigin(req: NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  const origin = req.headers.get("origin");
  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${protocol}://${host}`.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const secretKey =
      process.env.CHARGILY_SECRET_KEY?.trim() ?? process.env.CHARGILY_TEST_SECRET_KEY?.trim();

    if (!secretKey) {
      return NextResponse.json(
        {
          error:
            "Chargily secret key is missing. Set CHARGILY_SECRET_KEY (or CHARGILY_TEST_SECRET_KEY).",
          code: "CHARGILY_CONFIG_MISSING",
        },
        { status: 500 }
      );
    }

    let body: CheckoutBody;
    try {
      body = (await req.json()) as CheckoutBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const total = Math.round(Number(body.total ?? 0));
    const items = Array.isArray(body.items) ? body.items : [];
    if (!total || total <= 0 || items.length === 0) {
      return NextResponse.json({ error: "Checkout amount/items are invalid." }, { status: 400 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    const origin = detectAppOrigin(req);
    const successUrl = `${origin}/checkout?payment=success`;
    const failureUrl = `${origin}/checkout?payment=failed`;

    const customerName = `${sanitizeText(body.firstName, 100)} ${sanitizeText(body.lastName, 100)}`
      .trim()
      .slice(0, 200);

    const checkoutPayload = {
      amount: total,
      currency: "dzd",
      success_url: successUrl,
      failure_url: failureUrl,
      locale: "fr",
      description: `Vitrina Store order (${items.length} item${items.length > 1 ? "s" : ""})`,
      metadata: toFlatMetadata({
        source: "vitrina-store",
        userId: session?.user?.id ?? null,
        customerName,
        customerEmail: sanitizeText(body.email, 200),
        customerPhone: sanitizeText(body.phone, 40),
        address: sanitizeText(body.address, 250),
        town: sanitizeText(body.town, 100),
        country: sanitizeText(body.country, 100),
        notes: sanitizeText(body.notes, 500),
        items,
      }),
    };
    const explicitMode = process.env.CHARGILY_MODE?.trim().toLowerCase();
    const secretKeyIsTest = secretKey.startsWith("test_");
    let mode: "live" | "test" = secretKeyIsTest ? "test" : "live";
    if (explicitMode === "live" || explicitMode === "test") {
      // Safety: never allow live mode with a test key.
      mode = secretKeyIsTest && explicitMode === "live" ? "test" : explicitMode;
    }

    const client = new ChargilyClient({
      api_key: secretKey,
      mode,
    });

    const data = (await client.createCheckout(checkoutPayload as never)) as {
      id?: string;
      checkout_url?: string;
      url?: string;
    };

    const checkoutUrlRaw = data?.checkout_url || data?.url;
    const checkoutUrl = checkoutUrlRaw ? normalizeChargilyCheckoutUrl(checkoutUrlRaw) : "";
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Chargily response did not include checkout url." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      checkoutId: data?.id ?? null,
      checkoutUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initiate payment with Chargily.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
