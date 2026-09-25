import PDFDocument from "pdfkit";
import type { Invoice, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../env.js";
import { num } from "../lib/serialize.js";
import { financialYear, splitGst, stateCodeFor, stateName } from "../lib/gst.js";
import { getNumberSetting, getSetting } from "./settings.js";
import { mailUser } from "./mail.js";
import { signedLink } from "../lib/private-files.js";

/** Public route for invoice PDFs; links are signed and expire after an hour. */
export const INVOICE_PDF_ROUTE = "/api/v1/invoice-files";
export const invoicePdfUrl = (id: bigint) => signedLink(INVOICE_PDF_ROUTE, `${id}.pdf`);

/** How invoices appear in lists for providers and the admin team. */
export function presentInvoice(i: Invoice) {
  return {
    id: i.id,
    number: i.number,
    transactionId: i.transactionId,
    total: num(i.total),
    taxable: num(i.taxable),
    tax: (num(i.cgst) ?? 0) + (num(i.sgst) ?? 0) + (num(i.igst) ?? 0),
    status: i.status,
    issuedAt: i.issuedAt,
    pdfUrl: invoicePdfUrl(i.id),
  };
}

interface Party {
  name: string;
  address: string | null;
  stateCode: string | null;
  state: string | null;
  gstin: string | null;
}

interface InvoiceLine {
  description: string;
  sac: string;
  period: string | null;
  taxable: number;
}

const dateFmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: env.timezone });

async function seller(): Promise<Party> {
  const [name, gstin, address, stateCode] = await Promise.all([
    getSetting("invoice_legal_name"),
    getSetting("invoice_gstin"),
    getSetting("invoice_address"),
    getSetting("invoice_state_code"),
  ]);
  return { name: name || "DialNFind", gstin: gstin || null, address: address || null, stateCode: stateCode || null, state: stateName(stateCode) };
}

/**
 * Issues the GST invoice for a successful payment we collected. Safe to call twice: a payment has at
 * most one invoice. Store purchases are not invoiced by us (Apple and Google are the seller).
 */
export async function issueInvoice(transactionId: bigint, opts: { email?: boolean } = {}): Promise<Invoice | null> {
  const txn = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      invoice: true,
      provider: true,
      subscription: { include: { plan: { select: { name: true } } } },
    },
  });
  if (!txn || txn.status !== "success" || txn.invoice) return txn?.invoice ?? null;
  if (txn.gateway === "app_store" || txn.gateway === "play_store") return null;

  const [from, rate, sac, prefix] = await Promise.all([
    seller(),
    getNumberSetting("invoice_gst_rate", 18),
    getSetting("invoice_sac"),
    getSetting("invoice_prefix"),
  ]);
  const p = txn.provider;
  const buyerState = p.billingStateCode ?? stateCodeFor(p.state);
  const billedTo: Party = {
    name: p.billingName || p.businessName,
    address: p.billingAddress || [p.addressLine, p.locality, p.city, p.pincode].filter(Boolean).join(", "),
    stateCode: buyerState,
    state: stateName(buyerState) ?? p.state,
    gstin: p.gstin,
  };
  const total = num(txn.amount) ?? 0;
  // Without a seller state we cannot tell; IGST is the safe default for inter-state supply.
  const intraState = !!from.stateCode && from.stateCode === buyerState;
  const tax = splitGst(total, rate, intraState);
  const sub = txn.subscription;
  const description =
    txn.type === "subscription"
      ? `DialNFind ${sub?.plan.name ?? "plan"} subscription${sub ? ` (${sub.billingCycle})` : ""}`
      : txn.type === "sponsored_ad"
        ? "DialNFind sponsored listing campaign"
        : "DialNFind lead fee";
  const lines: InvoiceLine[] = [
    { description, sac: sac || "998365", period: sub?.endDate ? `Until ${dateFmt(sub.endDate)}` : null, taxable: tax.taxable },
  ];

  const fy = financialYear(txn.createdAt, env.timezone);
  const invoice = await prisma.$transaction(async (tx) => {
    const seq = await tx.invoiceSequence.upsert({ where: { fy }, create: { fy, next: 2 }, update: { next: { increment: 1 } } });
    const n = seq.next - 1;
    return tx.invoice.create({
      data: {
        number: `${prefix || "DNF"}/${fy}/${String(n).padStart(5, "0")}`,
        providerId: p.id,
        transactionId: txn.id,
        billedTo: billedTo as unknown as Prisma.InputJsonValue,
        seller: { ...from, gstRate: rate } as unknown as Prisma.InputJsonValue,
        lines: lines as unknown as Prisma.InputJsonValue,
        taxable: tax.taxable,
        cgst: tax.cgst,
        sgst: tax.sgst,
        igst: tax.igst,
        total,
        placeOfSupply: billedTo.state,
        issuedAt: txn.createdAt,
      },
    });
  });
  if (opts.email !== false) {
    void mailUser(p.userId, {
      subject: `Invoice ${invoice.number} from DialNFind`,
      lines: [`Thank you for your payment of Rs ${total.toFixed(2)}.`, "Your GST invoice is ready to download from Plan and billing."],
      action: { label: "Download invoice", url: `${env.providerUrl}/subscription` },
    });
  }
  return invoice;
}

const money = (v: unknown) => `Rs ${(num(v) ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Renders an issued invoice as a PDF from its stored snapshot. */
export function renderInvoicePdf(invoice: Invoice): Promise<Buffer> {
  const billedTo = invoice.billedTo as unknown as Party;
  const from = invoice.seller as unknown as Party & { gstRate?: number };
  const lines = invoice.lines as unknown as InvoiceLine[];
  const rate = from.gstRate ?? 18;
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Invoice ${invoice.number}` } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const ink = "#1f2340";
  const muted = "#6b7090";
  const left = 48;
  const right = doc.page.width - 48;

  doc.fillColor("#2a2f7a").font("Helvetica-Bold").fontSize(20).text("DialNFind", left, 48);
  doc.fillColor(ink).fontSize(14).text(invoice.status === "void" ? "TAX INVOICE (VOID)" : "TAX INVOICE", left, 48, { align: "right" });
  doc.font("Helvetica").fontSize(9).fillColor(muted);
  doc.text(`Invoice no. ${invoice.number}`, { align: "right" });
  doc.text(`Date ${dateFmt(invoice.issuedAt)}`, { align: "right" });

  const party = (title: string, p: Party, x: number, y: number) => {
    doc.fillColor(muted).fontSize(8).font("Helvetica-Bold").text(title, x, y);
    doc.fillColor(ink).fontSize(10).font("Helvetica-Bold").text(p.name, x, y + 12, { width: 230 });
    doc.font("Helvetica").fontSize(9);
    if (p.address) doc.text(p.address, { width: 230 });
    if (p.state) doc.text(`State: ${p.state}${p.stateCode ? ` (${p.stateCode})` : ""}`);
    doc.text(`GSTIN: ${p.gstin || "Unregistered"}`);
  };
  party("FROM", from, left, 120);
  party("BILL TO", billedTo, 310, 120);

  let y = 230;
  doc.moveTo(left, y).lineTo(right, y).strokeColor("#e6e8f2").stroke();
  y += 8;
  doc.fillColor(muted).fontSize(8).font("Helvetica-Bold");
  doc.text("DESCRIPTION", left, y);
  doc.text("SAC", 330, y);
  doc.text("TAXABLE VALUE", 400, y, { width: right - 400, align: "right" });
  y += 16;
  doc.fillColor(ink).font("Helvetica").fontSize(10);
  for (const l of lines) {
    doc.text(l.description, left, y, { width: 270 });
    if (l.period) doc.fillColor(muted).fontSize(8).text(l.period, left, doc.y, { width: 270 }).fillColor(ink).fontSize(10);
    doc.text(l.sac, 330, y);
    doc.text(money(l.taxable), 400, y, { width: right - 400, align: "right" });
    y = Math.max(doc.y, y + 14) + 8;
  }
  doc.moveTo(left, y).lineTo(right, y).strokeColor("#e6e8f2").stroke();
  y += 10;

  const row = (label: string, value: string, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 10).fillColor(ink);
    doc.text(label, 330, y);
    doc.text(value, 400, y, { width: right - 400, align: "right" });
    y += bold ? 18 : 15;
  };
  row("Taxable value", money(invoice.taxable));
  if (num(invoice.igst)) row(`IGST @ ${rate}%`, money(invoice.igst));
  else {
    row(`CGST @ ${rate / 2}%`, money(invoice.cgst));
    row(`SGST @ ${rate / 2}%`, money(invoice.sgst));
  }
  row("Total", money(invoice.total), true);

  doc.fillColor(muted).font("Helvetica").fontSize(8);
  doc.text(`Place of supply: ${invoice.placeOfSupply ?? "-"}. Amounts include GST. Reverse charge: No.`, left, y + 20, { width: right - left });
  doc.text("This is a computer-generated invoice and does not need a signature.", { width: right - left });
  doc.end();
  return done;
}
