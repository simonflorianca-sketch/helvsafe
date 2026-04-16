"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import {
  ShoppingCart,
  Heart,
  Truck,
  Lock,
  Mail,
  Phone,
  MapPin,
  Plus,
  Minus,
  CheckCircle2,
  Star,
  Menu,
  X,
  Settings,
  Package,
  Trash2,
  Pencil,
  CreditCard,
  FileText,
  Search,
} from "lucide-react";


type Product = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  image: string;
  badge: string;
  category: string;
  features: string[];
  active: boolean;
  stock: number;
  sku: string;
};

type CartItem = {
  id: number;
  title: string;
  price: number;
  qty: number;
};

type OrderStatus = "neu" | "bezahlt" | "versendet";
type LegalPage = "impressum" | "datenschutz" | "agb" | null;

type Order = {
  id: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    zip: string;
    city: string;
    country: string;
    notes: string;
  };
  status: OrderStatus;
};

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Pepper Spray",
    subtitle: "Kompakt & schnell einsatzbereit",
    description: "Kompaktes Pfefferspray zur Selbstverteidigung im Alltag. Einfach mitzunehmen und im Notfall schnell griffbereit.",
    price: 24.9,
    image: "/spray.jpg",
    badge: "Bestseller",
    category: "Selbstschutz",
    features: ["Kompakt", "Schnell einsetzbar", "Diskret"],
    active: true,
    stock: 30,
    sku: "HS-001",
  },
  {
    id: 2,
    title: "Personal Alarm",
    subtitle: "Lauter Sicherheitsalarm",
    description: "Persönlicher Alarm mit lauter Sirene zur Abschreckung und Aufmerksamkeitserzeugung in Gefahrensituationen.",
    price: 10.9,
    image: "/alarm.jpg",
    badge: "Top Wahl",
    category: "Alarm",
    features: ["Laut", "Einfach", "Alltagstauglich"],
    active: true,
    stock: 20,
    sku: "HS-002",
  },
  {
    id: 3,
    title: "Safety Light",
    subtitle: "Sichtbarkeit & Sicherheit",
    description: "Kompaktes Sicherheitslicht zur besseren Sichtbarkeit bei Nacht und unterwegs.",
    price: 9.9,
    image: "/light.jpg",
    badge: "Neu",
    category: "Sichtbarkeit",
    features: ["Hell", "Kompakt", "USB ladbar"],
    active: true,
    stock: 15,
    sku: "HS-003",
  },
];

const BACKEND_CONFIG = {
  ordersUrl: "/api/orders",
  contactUrl: "/api/contact",
  productsUrl: "/api/products",
  checkoutUrl: "/api/checkout/payrexx",
  useBackend: true,
};

const SHOP_SETTINGS = {
  name: "HelvSafe",
  email: "hello@helvsafe.ch",
  phone: "",
  address: "Leisihaldenstrasse 35c, 8623 Wetzikon ZH, Schweiz",
  shippingNotice: "Gratis Versand ab CHF 80 in der Schweiz und nach Liechtenstein",
  adminPassword: "helvsafe123",
  donationText: "5% jeder Bestellung gehen an Frauen-Notfallstellen in der Schweiz.",
};

const REVIEWS = [
  {
    name: "Mina, Zürich",
    text: "Ich mag, dass alles diskret und hochwertig wirkt. Der Shop fühlt sich ruhig und vertrauenswürdig an.",
  },
  {
    name: "Sara, Winterthur",
    text: "Der Bestellprozess ist einfach und das Safety Kit ist schön verpackt. Genau so etwas habe ich gesucht.",
  },
  {
    name: "Elena, St. Gallen",
    text: "Viel klarer als andere Shops. Nicht aggressiv, sondern stilvoll und verständlich.",
  },
];

function formatCHF(value: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(value);
}

function getLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function parseFeatures(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

const emptyProduct = (): Product => ({
  id: Date.now(),
  title: "",
  subtitle: "",
  description: "",
  price: 0,
  image: "",
  badge: "Neu",
  category: "Allgemein",
  features: [],
  active: true,
  stock: 0,
  sku: "",
});

export default function HelvSafeLandingPage() {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
    const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Product>(emptyProduct());
  const [legalPage, setLegalPage] = useState<LegalPage>(null);
  const [productSearch, setProductSearch] = useState("");
  const [adminTab, setAdminTab] = useState<"products" | "orders">("products");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"twint" | "card" | "invoice">("twint");
  const [checkoutData, setCheckoutData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    zip: "",
    city: "",
    country: "Schweiz",
    notes: "",
  });
  const [contactData, setContactData] = useState({
    name: "",
    email: "",
    message: "",
  });
    const [contactSent, setContactSent] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Supabase products load error:", error);
      setProducts(DEFAULT_PRODUCTS);
      return;
    }

    if (data && data.length > 0) {
      setProducts(
        data.map((p: any) => ({
          id: Number(p.id),
          title: p.title || "",
          subtitle: p.subtitle || "",
          description: p.description || "",
          price: Number(p.price) || 0,
          image: p.image || "https://placehold.co/800x1000/f8fafc/475569?text=Produktbild",
          badge: p.badge || "Neu",
          category: p.category || "Allgemein",
          features: parseFeatures(p.features),
          active: Boolean(p.active),
          stock: Number(p.stock) || 0,
          sku: p.sku || "",
        })) as Product[],
      );
      return;
    }

    setProducts(DEFAULT_PRODUCTS);
  };

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase orders load error:", error);
      return;
    }

    if (data) {
      setOrders(
        data.map((order: any) => ({
          id: order.id,
          createdAt: order.created_at,
          items: typeof order.items === "string" ? JSON.parse(order.items) : [],
          subtotal: Number(order.subtotal) || 0,
          shipping: Number(order.shipping) || 0,
          discount: Number(order.discount) || 0,
          total: Number(order.total) || 0,
          customer: typeof order.customer === "string" ? JSON.parse(order.customer) : {},
          status: order.status || "neu",
        }))
      );
    }
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
    setCart(getLS<CartItem[]>("helvsafe_cart", []));
  }, []);

  

  

  useEffect(() => {
    setLS("helvsafe_cart", cart);
  }, [cart]);

  const activeProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.active) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [products, productSearch]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...current, { id: product.id, title: product.title, price: product.price, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0),
    );
  };

  const removeProduct = async (id: number) => {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      setAdminMessage("Produkt konnte nicht gelöscht werden.");
      setTimeout(() => setAdminMessage(""), 2500);
      return;
    }

    setProducts((current) => current.filter((p) => p.id !== id));
    setCart((current) => current.filter((c) => c.id !== id));
    setAdminMessage("Produkt gelöscht.");
    setTimeout(() => setAdminMessage(""), 2500);
  };

  const saveProduct = async () => {
    if (!productForm.title.trim()) {
      setAdminMessage("Bitte Produktname eingeben.");
      return;
    }

    if (!productForm.description.trim()) {
      setAdminMessage("Bitte Beschreibung eingeben.");
      return;
    }

    const basePayload = {
      title: productForm.title.trim(),
      subtitle: productForm.subtitle.trim(),
      description: productForm.description.trim(),
      image: productForm.image?.trim() || "https://placehold.co/800x1000/f8fafc/475569?text=Produktbild",
      badge: productForm.badge?.trim() || "Neu",
      category: productForm.category?.trim() || "Allgemein",
      active: Boolean(productForm.active),
      price: Number(productForm.price) || 0,
      stock: Number(productForm.stock) || 0,
      features: parseFeatures(productForm.features).join(", "),
      sku: productForm.sku?.trim() || `HS-${Date.now()}`,
    };

    const payload = editingProduct
      ? { ...basePayload, id: productForm.id }
      : basePayload;

    const { error } = await supabase.from("products").upsert([payload]).select();

    if (error) {
      console.error("Supabase save product error:", error);
      setAdminMessage("Produkt konnte nicht gespeichert werden.");
      return;
    }

    await loadProducts();
    setAdminMessage(editingProduct ? "Produkt gespeichert." : "Produkt hinzugefügt.");
    setEditingProduct(null);
    setProductForm(emptyProduct());
    setTimeout(() => setAdminMessage(""), 2500);
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));
    if (BACKEND_CONFIG.useBackend) {
      try {
        await fetch(`${BACKEND_CONFIG.ordersUrl}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      } catch {}
    }
  };

  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const baseShipping = subtotal > 80 || subtotal === 0 ? 0 : 7.9;
  const shipping = shippingMethod === "express" ? baseShipping + (subtotal === 0 ? 0 : 6) : baseShipping;
  const discountAmount = subtotal * appliedDiscount;
  const total = subtotal + shipping - discountAmount;

  

  const placeOrder = async () => {
  if (
    !checkoutData.firstName ||
    !checkoutData.lastName ||
    !checkoutData.email ||
    !checkoutData.address ||
    !checkoutData.zip ||
    !checkoutData.city ||
    cart.length === 0
  ) {
    alert("Bitte fülle alle Pflichtfelder aus.");
    return;
  }

  if (paymentMethod === "invoice") {
    alert("Rechnung ist aktuell noch nicht aktiv.");
    return;
  }

  const newOrder: Order = {
    id: `HS-${Date.now()}`,
    createdAt: new Date().toISOString(),
    items: cart,
    subtotal,
    shipping,
    discount: discountAmount,
    total,
    customer: {
      ...checkoutData,
      notes: `${checkoutData.notes}${shippingMethod ? ` | Versand: ${shippingMethod}` : ""}${paymentMethod ? ` | Zahlung: ${paymentMethod}` : ""}`,
    },
    status: "neu",
  };

  setCheckoutLoading(true);
  try {
    const res = await fetch(BACKEND_CONFIG.checkoutUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: paymentMethod,
        order: newOrder,
      }),
    });

    const data = await res.json();

    if (data?.paymentLink || data?.checkoutUrl) {
      window.location.href = data.paymentLink || data.checkoutUrl;
      return;
    }

    alert(data?.error || "Zahlung konnte nicht gestartet werden");
  } catch (error) {
    console.error(error);
    alert("Fehler bei Zahlung");
  } finally {
    setCheckoutLoading(false);
  }
};


  const sendContactForm = async () => {
    if (!contactData.name || !contactData.email || !contactData.message) return;
    setContactLoading(true);
    try {
      if (BACKEND_CONFIG.useBackend) {
        await fetch(BACKEND_CONFIG.contactUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactData),
        });
      }
      setContactSent(true);
      setContactData({ name: "", email: "", message: "" });
      setTimeout(() => setContactSent(false), 2200);
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-[80] w-[92%] max-w-2xl -translate-x-1/2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-center text-sm font-medium text-white shadow-2xl">
        Diskrete Bestellung • Gratis Versand ab CHF 80 • 5% Unterstützung für Frauen-Notfallstellen
      </div>

      <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_45%,#eef2f7_100%)] text-slate-900">
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-200">
                <div className="absolute h-5 w-1.5 rounded bg-white" />
                <div className="absolute h-1.5 w-5 rounded bg-white" />
              </div>
              <div>
                <div className="text-xl font-semibold tracking-tight">{SHOP_SETTINGS.name}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Schweiz & Liechtenstein</div>
              </div>
            </div>

            <nav className="hidden items-center gap-8 text-sm md:flex">
              <a href="#produkte" className="transition hover:text-red-500">Produkte</a>
              <a href="#warenkorb" className="transition hover:text-red-500">Warenkorb</a>
              <a href="#kontakt" className="transition hover:text-red-500">Kontakt</a>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAdminOpen(true)}
                aria-label="Admin öffnen"
                className="hidden h-3 w-3 rounded-full bg-transparent opacity-0 pointer-events-none md:inline-flex"
              >
                <Settings className="h-3 w-3" />
              </button>
              <button
                onClick={() => setCheckoutOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-200 transition hover:scale-[1.02]"
              >
                <ShoppingCart className="h-4 w-4" /> {itemCount}
              </button>
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="rounded-full border border-slate-200 p-2 md:hidden"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
              <div className="flex flex-col gap-4 text-sm">
                <a href="#produkte">Produkte</a>
                <a href="#warenkorb">Warenkorb</a>
                <a href="#bewertungen">Bewertungen</a>
                <a href="#kontakt">Kontakt</a>
              </div>
            </div>
          )}
        </header>

        <main>
          <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50/80 px-4 py-1.5 text-sm font-medium text-red-600 shadow-sm">
                <Heart className="h-4 w-4" /> Für Studentinnen und erwachsene Frauen
              </div>

              <h1 className="text-5xl font-semibold leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Fühl dich sicher,
                <br />
                <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-red-500 bg-clip-text text-transparent">
                  heute noch.
                </span>
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl">
                Diskrete Sicherheitsprodukte für Studentinnen und erwachsene Frauen, die ihren Alltag, den Heimweg und belastende Situationen mit mehr Kontrolle, Ruhe und Handlungssicherheit gestalten möchten.
              </p>

              <p className="mt-4 text-base font-medium text-red-500">{SHOP_SETTINGS.donationText}</p>

              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm leading-7 text-slate-700">
                <div className="font-semibold text-slate-900">Soforthilfe und Beratung</div>
                <div className="mt-1">Bei akuter Gefahr ruf bitte sofort den Notruf <span className="font-semibold">117</span>.</div>
                <div>Schweizerisches Opferhilfetelefon: <span className="font-semibold">0800 112 112</span>.</div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#produkte"
                  className="rounded-full bg-gradient-to-r from-red-500 to-red-600 px-8 py-3.5 text-sm font-medium text-white shadow-xl shadow-red-200 transition hover:scale-[1.02]"
                >
                  Produkte ansehen
                </a>
                <button
                  onClick={() => setCheckoutOpen(true)}
                  className="rounded-full border border-slate-200 bg-white px-8 py-3.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  Diskret bestellen
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                  {SHOP_SETTINGS.shippingNotice}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                  Sichere Bestellung • Payrexx • TWINT • Kreditkarte
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98, x: 14 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute -left-6 top-10 h-40 w-40 rounded-full bg-red-200/70 blur-3xl" />
              <div className="absolute -right-6 bottom-8 h-44 w-44 rounded-full bg-slate-200 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2.25rem] border border-white/80 bg-white/90 p-3 shadow-[0_35px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl">
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />
                <img
  src="/hero.jpg"
  alt="Selbstbewusste Frau mit Selbstverteidigung"
  className="block h-[560px] w-full rounded-[1.75rem] object-cover object-[center_top] shadow-[0_40px_100px_rgba(0,0,0,0.25)] transition duration-700 hover:scale-[1.02]"
/>
              </div>
              <div className="absolute -bottom-5 left-6 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3 shadow-xl backdrop-blur">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Diskret</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">Für Alltag & Heimweg</div>
              </div>
            </motion.div>
          </section>

          <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm text-slate-500">Ausgewählte Produkte</div>
                <div className="mt-2 text-3xl font-semibold">{activeProducts.length}</div>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm text-slate-500">Diskreter Support</div>
                <div className="mt-2 text-3xl font-semibold">Persönlich</div>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm text-slate-500">Diskreter Versand</div>
                <div className="mt-2 text-3xl font-semibold">CH & FL</div>
              </div>
            </div>
          </section>

          <section id="produkte" className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">Auswahl</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Diskrete Produkte für Alltag und Heimweg</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Sorgfältig ausgewählte Produkte mit ruhiger, erwachsener Gestaltung – ohne alarmistische Bildsprache, aber mit klarer Funktion im Alltag. Die Inhalte von Sets und Produktkombinationen werden transparent beschrieben.</p>
              </div>
              <div className="relative w-full max-w-md md:w-auto">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Produkte suchen"
                  className="w-full rounded-full border border-slate-200 bg-white px-11 py-3 text-sm outline-none transition focus:border-red-300"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {activeProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
                >
                  <div className="relative overflow-hidden rounded-[1.25rem] bg-slate-50">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute left-4 top-4 rounded-full border border-white/80 bg-white/95 px-3 py-1 text-xs font-medium text-red-600 shadow-sm">
                      {product.badge}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{product.category}</div>
                    <h3 className="mt-2 text-lg font-semibold">{product.title}</h3>
                    <p className="mt-1 text-sm font-medium text-red-500">{product.subtitle}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{product.description}</p>
                  </div>

                  {product.category === "Kit" && (
                    <div className="mt-4 rounded-[1rem] border border-red-100 bg-red-50 px-3 py-3 text-xs leading-6 text-slate-700">
                      <div className="font-semibold text-slate-900">Inhalt des Sets</div>
                      <div className="mt-1">Persönlicher Sicherheitsalarm mit Sirene, Clip oder Schlüsselanhänger zur Befestigung sowie ergänzende kleine Sicherheits-Accessoires für Alltag und Heimweg.</div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>SKU {product.sku}</span>
                    <span>{product.stock > 0 ? `${product.stock} verfügbar • Schnell lieferbar` : "Ausverkauft"}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.features.map((feature) => (
                      <span key={feature} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {feature}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">{formatCHF(product.price)}</div>
                      <div className="text-xs text-red-500">Diskret verpackt</div>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className="rounded-full bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-200 transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {product.stock > 0 ? "In den Warenkorb" : "Ausverkauft"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          <section id="warenkorb" className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Deine Auswahl</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-red-500">{itemCount} Artikel</span>
                </div>

                {cart.length === 0 ? (
                  <div className="rounded-[1.5rem] bg-slate-50 p-8 text-center text-slate-500">Dein Warenkorb ist aktuell leer.</div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex flex-col gap-4 rounded-[1.25rem] border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-slate-500">{formatCHF(item.price)} pro Stück</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1">
                            <button onClick={() => updateQty(item.id, -1)}><Minus className="h-4 w-4" /></button>
                            <span className="min-w-6 text-center text-sm">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)}><Plus className="h-4 w-4" /></button>
                          </div>
                          <div className="w-24 text-right font-medium">{formatCHF(item.price * item.qty)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold">Bestellübersicht</h3>
                <div className="mt-2 text-xs text-red-500">5% deiner Bestellung gehen an Frauen-Notfallstellen</div>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="rounded-[1rem] bg-slate-50 p-4">
                    <div className="mb-3 text-sm font-medium">Versandart</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShippingMethod("standard")}
                        className={`rounded-full px-3 py-2 text-xs ${shippingMethod === "standard" ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : "bg-slate-200 text-slate-700"}`}
                      >
                        Standard
                      </button>
                      <button
                        onClick={() => setShippingMethod("express")}
                        className={`rounded-full px-3 py-2 text-xs ${shippingMethod === "express" ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : "bg-slate-200 text-slate-700"}`}
                      >
                        Express
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between"><span className="text-slate-500">Zwischensumme</span><span>{formatCHF(subtotal)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Versand</span><span>{shipping === 0 ? "Gratis" : formatCHF(shipping)}</span></div>
                                    <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold"><span>Total</span><span>{formatCHF(total)}</span></div>
                </div>

                <button
                  onClick={() => setCheckoutOpen(true)}
                  className="mt-6 w-full rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-red-200 transition hover:scale-[1.01]"
                >
                  Zur Bestellung
                </button>

                <div className="mt-5 rounded-[1rem] bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-medium">Zahlungsart</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setPaymentMethod("twint")}
                      className={`rounded-full px-3 py-2 text-xs ${paymentMethod === "twint" ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : "bg-slate-200 text-slate-700"}`}
                    >
                      TWINT
                    </button>
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={`rounded-full px-3 py-2 text-xs ${paymentMethod === "card" ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : "bg-slate-200 text-slate-700"}`}
                    >
                      Kreditkarte
                    </button>
                    <button
                      onClick={() => setPaymentMethod("invoice")}
                      className={`rounded-full px-3 py-2 text-xs ${paymentMethod === "invoice" ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : "bg-slate-200 text-slate-700"}`}
                    >
                      Rechnung
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">TWINT und Kreditkarte werden über Payrexx abgewickelt. Die Zahlarten stehen nach erfolgreicher Freischaltung des Zahlungsanbieters zur Verfügung.</div>
                </div>

                <div className="mt-5 space-y-2 text-sm text-slate-500">
                  <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-red-500" /> Versand in Schweiz & Liechtenstein</div>
                  <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-red-500" /> Zahlung wird über Payrexx weitergeleitet</div>
                </div>
              </div>
            </div>
          </section>

          

          <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
  <div id="kontakt" className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold">Kontakt und Unterstützung</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Für Fragen zu Versand, Produkten oder diskreter Bestellung. Die Seite richtet sich an erwachsene Frauen und Studentinnen, die sich klar, ruhig und ohne reißerische Ansprache informieren möchten. Bei akuter Gefahr nutze bitte zuerst den Notruf 117 oder die offizielle Opferhilfe.
      </p>
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-[1.25rem] bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Mail className="h-4 w-4 text-red-500" /> E-Mail</div>
        <div className="mt-2 text-sm text-slate-600">{SHOP_SETTINGS.email}</div>
      </div>
      <div className="rounded-[1.25rem] bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Lock className="h-4 w-4 text-red-500" /> Soforthilfe</div>
        <div className="mt-2 text-sm text-slate-600">Notruf 117 · Opferhilfe 0800 112 112</div>
      </div>
    </div>

    <div className="mt-6 flex flex-wrap gap-3">
      <button
        onClick={() => setAdminOpen(true)}
        className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-red-300 hover:text-red-500"
      >
        Interner Adminbereich
      </button>
    </div>

    <div className="mt-6 space-y-3">
      <input value={contactData.name} onChange={(e) => setContactData((d) => ({ ...d, name: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" placeholder="Name" />
      <input value={contactData.email} onChange={(e) => setContactData((d) => ({ ...d, email: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" placeholder="E-Mail" />
      <textarea value={contactData.message} onChange={(e) => setContactData((d) => ({ ...d, message: e.target.value }))} className="min-h-[130px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" placeholder="Nachricht" />
      <button onClick={sendContactForm} className="rounded-full bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-red-200">
        {contactLoading ? "Wird gesendet..." : "Nachricht senden"}
      </button>
      {contactSent && <div className="text-sm text-red-500">Nachricht gespeichert.</div>}
    </div>
  </div>
</section>

          
        </main>

        <footer className="border-t border-slate-200 bg-white/80">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 text-sm text-slate-500 md:grid-cols-4 lg:px-8">
            <div>
              <div className="font-semibold text-slate-900">{SHOP_SETTINGS.name}</div>
              <p className="mt-3 leading-7">Schweizer Online-Shop für diskrete Sicherheitsprodukte mit erwachsener, ruhiger Gestaltung, transparenter Produktbeschreibung und diskretem Versand. 5% aller Einnahmen unterstützen Frauen-Notfallstellen in der Schweiz.</p>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Shop</div>
              <div className="mt-3 space-y-2"><div>Produkte</div><div>Sets mit transparentem Inhalt</div><div>Checkout</div></div>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Rechtliches</div>
              <div className="mt-3 space-y-2">
                <button onClick={() => setLegalPage("impressum")}>Impressum</button>
                <button onClick={() => setLegalPage("datenschutz")}>Datenschutz</button>
                <button onClick={() => setLegalPage("agb")}>AGB</button>
                <button
                  onClick={() => setAdminOpen(true)}
                  className="text-sm text-slate-500 transition hover:text-red-500"
                >
                  Interner Adminbereich
                </button>
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Kontakt</div>
              <div className="mt-3 space-y-2"><div>{SHOP_SETTINGS.email}</div><div>8623 Wetzikon ZH, Schweiz</div></div>
            </div>
          </div>
        </footer>

        {checkoutOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Checkout</h2>
                  <p className="mt-1 text-sm text-slate-500">Zahlungen werden sicher über Payrexx weitergeleitet. Nach erfolgreicher Freischaltung durch den Zahlungsanbieter können TWINT und Kreditkarte genutzt werden.</p>
                </div>
                <button onClick={() => setCheckoutOpen(false)} className="rounded-full border border-slate-200 p-2"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input placeholder="Vorname" value={checkoutData.firstName} onChange={(e) => setCheckoutData((d) => ({ ...d, firstName: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                      <input placeholder="Nachname" value={checkoutData.lastName} onChange={(e) => setCheckoutData((d) => ({ ...d, lastName: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                    </div>
                    <input placeholder="E-Mail" value={checkoutData.email} onChange={(e) => setCheckoutData((d) => ({ ...d, email: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                    <input placeholder="Telefon" value={checkoutData.phone} onChange={(e) => setCheckoutData((d) => ({ ...d, phone: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                    <input placeholder="Strasse und Hausnummer" value={checkoutData.address} onChange={(e) => setCheckoutData((d) => ({ ...d, address: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                    <div className="grid gap-4 sm:grid-cols-3">
                      <input placeholder="PLZ" value={checkoutData.zip} onChange={(e) => setCheckoutData((d) => ({ ...d, zip: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                      <input placeholder="Ort" value={checkoutData.city} onChange={(e) => setCheckoutData((d) => ({ ...d, city: e.target.value }))} className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                    </div>
                    <select value={checkoutData.country} onChange={(e) => setCheckoutData((d) => ({ ...d, country: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300">
                      <option>Schweiz</option>
                      <option>Liechtenstein</option>
                    </select>
                    <textarea placeholder="Notizen zur Bestellung" value={checkoutData.notes} onChange={(e) => setCheckoutData((d) => ({ ...d, notes: e.target.value }))} className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                  </div>

                  <div className="rounded-[1.75rem] bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold">Bestellübersicht</h3>
                    <div className="mt-5 space-y-3 text-sm">
                      {cart.length === 0 ? (
                        <div className="text-slate-500">Noch keine Produkte im Warenkorb.</div>
                      ) : (
                        cart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3">
                            <div><div className="font-medium">{item.title}</div><div className="text-slate-500">Menge: {item.qty}</div></div>
                            <div>{formatCHF(item.price * item.qty)}</div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Zwischensumme</span><span>{formatCHF(subtotal)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Versand</span><span>{shipping === 0 ? "Gratis" : formatCHF(shipping)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Rabatt</span><span>{appliedDiscount > 0 ? `- ${formatCHF(discountAmount)}` : "—"}</span></div>
                      <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatCHF(total)}</span></div>
                    </div>
                    <button onClick={placeOrder} disabled={checkoutLoading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-red-200 disabled:opacity-60">
                      <CreditCard className="h-4 w-4" /> {checkoutLoading ? "Wird verarbeitet..." : paymentMethod === "twint" ? "Mit TWINT weiter" : paymentMethod === "card" ? "Mit Karte weiter" : "Bestellung abschicken"}
                    </button>
                    <p className="mt-3 text-xs leading-6 text-slate-500">Mit Klick auf den Button wirst du sicher zu Payrexx weitergeleitet. Dort stehen nach der Freischaltung TWINT und Kreditkarte als Zahlungsmethoden zur Verfügung.</p>
                  </div>
              </div>
            </div>
          </div>
        )}

        {adminOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Admin</h2>
                  <p className="mt-1 text-sm text-slate-500">Interner Bereich zur Verwaltung von Produkten und Bestellungen.</p>
                </div>
                <button onClick={() => setAdminOpen(false)} className="rounded-full border border-slate-200 p-2"><X className="h-5 w-5" /></button>
              </div>

              {!adminUnlocked ? (
                <div className="mx-auto max-w-md rounded-[1.5rem] bg-slate-50 p-6">
                  <div className="mb-3 flex items-center gap-2 font-medium text-slate-900"><Lock className="h-4 w-4 text-red-500" /> Admin freischalten</div>
                  <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Admin-Passwort" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                  <button onClick={() => setAdminUnlocked(adminPassword === SHOP_SETTINGS.adminPassword)} className="mt-4 w-full rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 py-3 text-sm font-medium text-white">Einloggen</button>
                </div>
              ) : (
                <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
                  <div>
                    <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><Package className="h-5 w-5 text-red-500" /> Produktverwaltung</div>
                    <div className="space-y-3 rounded-[1.5rem] border border-slate-200 p-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input value={productForm.sku} onChange={(e) => setProductForm((d) => ({ ...d, sku: e.target.value }))} placeholder="SKU" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                        <input type="number" value={productForm.stock} onChange={(e) => setProductForm((d) => ({ ...d, stock: Number(e.target.value) }))} placeholder="Lagerbestand" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                      </div>
                      <input value={productForm.title} onChange={(e) => setProductForm((d) => ({ ...d, title: e.target.value }))} placeholder="Produktname" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                      <input value={productForm.subtitle} onChange={(e) => setProductForm((d) => ({ ...d, subtitle: e.target.value }))} placeholder="Untertitel" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                      <textarea value={productForm.description} onChange={(e) => setProductForm((d) => ({ ...d, description: e.target.value }))} placeholder="Beschreibung" className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input type="number" value={productForm.price} onChange={(e) => setProductForm((d) => ({ ...d, price: Number(e.target.value) }))} placeholder="Preis" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                        <input value={productForm.category} onChange={(e) => setProductForm((d) => ({ ...d, category: e.target.value }))} placeholder="Kategorie" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                      </div>
                      <input value={productForm.badge} onChange={(e) => setProductForm((d) => ({ ...d, badge: e.target.value }))} placeholder="Badge" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                      <input value={productForm.image} onChange={(e) => setProductForm((d) => ({ ...d, image: e.target.value }))} placeholder="Bild-URL (optional)" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                      <input value={productForm.features.join(", ")} onChange={(e) => setProductForm((d) => ({ ...d, features: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} placeholder="Features, getrennt mit Komma" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-300" />
                      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={productForm.active} onChange={(e) => setProductForm((d) => ({ ...d, active: e.target.checked }))} /> Aktiv</label>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={saveProduct} className="rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 py-3 text-sm font-medium text-white">{editingProduct ? "Produkt speichern" : "Produkt hinzufügen"}</button>
                        <button onClick={() => { setEditingProduct(null); setProductForm(emptyProduct()); setAdminMessage(""); }} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium">Zurücksetzen</button>
                      </div>
                      {adminMessage && <div className="text-sm text-red-500">{adminMessage}</div>}
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5 text-red-500" /> Verwaltung</div>
                    <div className="rounded-[1.5rem] border border-slate-200 p-5">
                      <div className="mb-4 flex gap-2">
                        <button onClick={() => setAdminTab("products")} className={`rounded-full px-4 py-2 text-sm ${adminTab === "products" ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : "bg-slate-100 text-slate-700"}`}>Produkte</button>
                        <button onClick={() => setAdminTab("orders")} className={`rounded-full px-4 py-2 text-sm ${adminTab === "orders" ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : "bg-slate-100 text-slate-700"}`}>Bestellungen</button>
                      </div>

                      {adminTab === "products" ? (
                        <div className="space-y-3">
                          {products.map((product) => (
                            <div key={product.id} className="flex items-start justify-between gap-3 rounded-[1rem] bg-slate-50 p-4">
                              <div>
                                <div className="font-medium">{product.title}</div>
                                <div className="text-sm text-slate-500">
                                  {formatCHF(product.price)} · {product.stock} Stück · {product.active ? "aktiv" : "inaktiv"}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setProductForm(product);
                                  }}
                                  className="rounded-full border border-slate-200 p-2"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => removeProduct(product.id)}
                                  className="rounded-full border border-slate-200 p-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {orders.length === 0 ? (
                            <div className="text-sm text-slate-500">Noch keine Bestellungen.</div>
                          ) : (
                            orders.map((order) => (
                              <div key={order.id} className="rounded-[1rem] bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-medium">{order.id}</div>
                                  <div className="text-sm text-slate-500">{formatCHF(order.total)}</div>
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                  {order.customer?.firstName || ""} {order.customer?.lastName || ""} · {order.customer?.email || ""}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {(["neu", "bezahlt", "versendet"] as const).map((status) => (
                                    <button
                                      key={status}
                                      onClick={() => updateOrderStatus(order.id, status)}
                                      className={`rounded-full px-3 py-1 text-xs ${
                                        order.status === status
                                          ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {status}
                                    </button>
                                  ))}
                                </div>
                                <div className="mt-2 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("de-CH")}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {legalPage && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-semibold capitalize">{legalPage}</h2>
                <button onClick={() => setLegalPage(null)} className="rounded-full border border-slate-200 p-2"><X className="h-5 w-5" /></button>
              </div>
              {legalPage === "impressum" && (
                <div className="space-y-3 text-sm leading-7 text-slate-600">
                  <p><strong>{SHOP_SETTINGS.name}</strong></p>
                  <p>Candinas SF und Candinas M.</p>
                  <p>{SHOP_SETTINGS.address}</p>
                  <p>{SHOP_SETTINGS.email}</p>
                  <p>Verantwortlich für den Inhalt: Candinas SF und Candinas M.</p>
                </div>
              )}
              {legalPage === "datenschutz" && (
                <div className="space-y-3 text-sm leading-7 text-slate-600">
                  <p><strong>Datenschutzerklärung</strong></p>
                  <p>Der Schutz deiner persönlichen Daten ist uns wichtig. Wir behandeln personenbezogene Daten vertraulich und gemäss den geltenden Datenschutzbestimmungen der Schweiz.</p>

                  <p><strong>Erhebung und Verarbeitung von Daten</strong></p>
                  <p>Beim Besuch dieser Website werden technische Daten wie IP-Adresse, Browsertyp, Datum und Uhrzeit des Zugriffs verarbeitet, soweit dies für den sicheren Betrieb der Website erforderlich ist.</p>

                  <p><strong>Bestellungen</strong></p>
                  <p>Bei einer Bestellung verarbeiten wir deine Angaben wie Name, Adresse, E-Mail-Adresse, Telefonnummer sowie Bestelldaten zur Abwicklung der Bestellung, Lieferung und Kundenkommunikation. Bei Produkt-Sets werden die enthaltenen Bestandteile auf der Website transparent beschrieben.</p>

                  <p><strong>Zahlungsabwicklung</strong></p>
                  <p>Die Zahlungsabwicklung erfolgt über den Zahlungsdienstleister Payrexx. Dabei werden die für die Zahlung erforderlichen Daten an Payrexx weitergegeben. Es gelten ergänzend die Datenschutzbestimmungen von Payrexx.</p>

                  <p><strong>Hosting und technische Dienstleister</strong></p>
                  <p>Diese Website wird über Vercel gehostet. Produkt- und Bestelldaten können zur technischen Verarbeitung und Speicherung über Supabase verarbeitet werden.</p>

                  <p><strong>Kontaktaufnahme</strong></p>
                  <p>Wenn du uns per Kontaktformular oder E-Mail kontaktierst, verwenden wir deine Angaben ausschliesslich zur Bearbeitung deiner Anfrage.</p>

                  <p><strong>Speicherdauer</strong></p>
                  <p>Personenbezogene Daten werden nur so lange aufbewahrt, wie dies für die Vertragsabwicklung, gesetzliche Aufbewahrungspflichten oder berechtigte Interessen erforderlich ist.</p>

                  <p><strong>Rechte</strong></p>
                  <p>Du hast das Recht auf Auskunft, Berichtigung und Löschung deiner personenbezogenen Daten sowie auf Einschränkung der Verarbeitung im gesetzlich zulässigen Rahmen.</p>
                </div>
              )}
              {legalPage === "agb" && (
                <div className="space-y-3 text-sm leading-7 text-slate-600">
                  <p><strong>Allgemeine Geschäftsbedingungen (AGB)</strong></p>
                  <p><strong>1. Geltungsbereich</strong><br />Diese AGB gelten für alle Bestellungen über den Online-Shop HelvSafe.</p>
                  <p><strong>2. Angebot</strong><br />HelvSafe bietet diskrete Sicherheitsprodukte für den Alltag an, darunter persönliche Sicherheitsalarme, Sets mit transparent ausgewiesenen Bestandteilen sowie Produkte zur besseren Sichtbarkeit. Sämtliche Angebote sind freibleibend und unverbindlich.</p>
                  <p><strong>3. Preise</strong><br />Alle Preise verstehen sich in Schweizer Franken (CHF). Preisänderungen und Irrtümer bleiben vorbehalten.</p>
                  <p><strong>4. Zahlung</strong><br />Die Zahlung erfolgt über die im Checkout angebotenen Zahlungsmethoden, insbesondere über Payrexx. Verfügbare Zahlungsarten wie TWINT und Kreditkarte werden nach erfolgter Freischaltung angezeigt.</p>
                  <p><strong>5. Lieferung</strong><br />Die Lieferung erfolgt innerhalb der Schweiz und nach Liechtenstein an die vom Kunden angegebene Lieferadresse.</p>
                  <p><strong>6. Rückgabe und Mängel</strong><br />Beanstandungen sind uns innert angemessener Frist mitzuteilen. Rücksendungen erfolgen nur nach vorgängiger Kontaktaufnahme.</p>
                  <p><strong>7. Haftung</strong><br />HelvSafe haftet nicht für Schäden infolge unsachgemässer oder zweckwidriger Nutzung der angebotenen Produkte.</p>
                  <p><strong>8. Gerichtsstand und anwendbares Recht</strong><br />Es gilt schweizerisches Recht. Gerichtsstand ist, soweit zulässig, der Sitz des Unternehmens.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
