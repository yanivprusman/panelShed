import "server-only";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import type { Quote } from "@/lib/quotes";
import {
  BANK_TRANSFER,
  BUSINESS_ID,
  EMAIL,
  LEGAL_NAME,
  PHONE_DISPLAY,
} from "@/app/_components/contact";
import { SITE_NAME } from "@/lib/site";

const execFileAsync = promisify(execFile);

/** Israeli VAT since 2025-01-01. Shop prices are VAT-inclusive; the PDF splits it out. */
const VAT_RATE = 0.18;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const ils = (n: number) =>
  `₪${n.toLocaleString("he-IL", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const cm = (n: number) => `${n} ס"מ`;

/**
 * The quote as an A4 HTML page, built for Chrome's print engine.
 *
 * Font weights are capped at 700 on purpose: only Noto Sans Hebrew Regular and
 * Bold are installed, and anything heavier silently falls back to a serif face
 * with old-style numerals — a quote whose numbers look broken.
 */
export function quoteHtml(q: Quote): string {
  const c = q.customer;
  const beforeVat = Math.round((q.totalIls / (1 + VAT_RATE)) * 100) / 100;
  const vat = Math.round((q.totalIls - beforeVat) * 100) / 100;

  const rows = [
    `<tr><td>${esc(q.title)}<div class="sub">${cm(q.widthCm)} רוחב · ${cm(q.depthCm)} עומק · ${cm(q.heightCm)} גובה${q.custom ? " · מידה מותאמת אישית" : ""}</div></td><td class="num">${ils(q.basePrice)}</td></tr>`,
    ...q.choiceLines.map(
      (l) =>
        `<tr><td><span class="grp">${esc(l.groupLabel)}:</span> ${esc(l.choiceLabel)}</td><td class="num">${l.price != null ? ils(l.price) : '<span class="muted">ללא תוספת</span>'}</td></tr>`,
    ),
  ].join("\n");

  const customer = [
    `<div class="cname">${esc(c.name)}</div>`,
    c.phone && `<div>טלפון: <span dir="ltr">${esc(c.phone)}</span></div>`,
    c.email && `<div>דוא"ל: <span dir="ltr">${esc(c.email)}</span></div>`,
    c.address && `<div>כתובת: ${esc(c.address)}</div>`,
  ]
    .filter(Boolean)
    .join("\n");

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>הצעת מחיר ${esc(q.number)}</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Noto Sans Hebrew", "Noto Sans", "Liberation Sans", sans-serif;
    font-variant-numeric: lining-nums tabular-nums;
    font-feature-settings: "lnum" 1, "tnum" 1;
    color: #2a2a2a;
    font-size: 11.5pt;
    line-height: 1.5;
  }
  header { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #2f8fd6; padding-bottom: 12px; }
  .brand { font-size: 22pt; font-weight: 700; color: #2f8fd6; line-height: 1.1; }
  .biz { font-size: 9.5pt; color: #666; margin-top: 4px; }
  .doc { text-align: left; }
  .doc h1 { margin: 0; font-size: 18pt; font-weight: 700; }
  .doc .meta { font-size: 9.5pt; color: #555; }
  .to { margin: 20px 0 16px; padding: 12px 14px; background: #f5f8fb; border-radius: 6px; }
  .to .lbl { font-size: 9pt; color: #777; }
  .cname { font-weight: 700; font-size: 13pt; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { text-align: right; font-size: 9.5pt; color: #666; font-weight: 700;
    border-bottom: 1.5px solid #ccc; padding: 6px 4px; }
  th.num { text-align: left; }
  td { padding: 9px 4px; border-bottom: 1px solid #e6e6e6; vertical-align: top; }
  td.num { text-align: left; white-space: nowrap; }
  .sub { font-size: 9.5pt; color: #777; }
  .grp { color: #666; }
  .muted { color: #999; font-size: 10pt; }
  .totals { width: 46%; margin-right: auto; margin-top: 14px; }
  .totals td { border: none; padding: 3px 4px; }
  .totals .grand td { border-top: 2px solid #2a2a2a; padding-top: 8px; font-size: 14pt; font-weight: 700; }
  .notes { margin-top: 20px; padding: 10px 14px; border: 1px solid #e3e3e3; border-radius: 6px; white-space: pre-wrap; }
  .bank { margin-top: 20px; padding: 10px 14px; background: #f5f8fb; border-radius: 6px; font-size: 10.5pt; }
  .bank h2 { margin: 0 0 6px; font-size: 11pt; font-weight: 700; }
  .bank table { width: auto; margin: 0; }
  .bank td { border: none; padding: 1px 0 1px 18px; }
  .bank td.k { color: #666; }
  .terms { margin-top: 22px; font-size: 9.5pt; color: #555; }
  .terms li { margin-bottom: 3px; }
  footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9pt; color: #777; text-align: center; }
</style>
</head>
<body>
  <header>
    <div>
      <div class="brand">${esc(SITE_NAME)}</div>
      <div class="biz">${esc(LEGAL_NAME)} · עוסק מורשה ${esc(BUSINESS_ID)}</div>
      <div class="biz"><span dir="ltr">${esc(PHONE_DISPLAY)}</span> · <span dir="ltr">${esc(EMAIL)}</span></div>
    </div>
    <div class="doc">
      <h1>הצעת מחיר</h1>
      <div class="meta">מס' <span dir="ltr">${esc(q.number)}</span></div>
      <div class="meta">תאריך: ${date(q.createdAt)}</div>
      <div class="meta">בתוקף עד: ${date(q.validUntil)}</div>
    </div>
  </header>

  <section class="to">
    <div class="lbl">לכבוד</div>
    ${customer}
  </section>

  <table>
    <thead><tr><th>פריט</th><th class="num">מחיר</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>סה"כ לפני מע"מ</td><td class="num">${ils(beforeVat)}</td></tr>
    <tr><td>מע"מ ${Math.round(VAT_RATE * 100)}%</td><td class="num">${ils(vat)}</td></tr>
    <tr class="grand"><td>סה"כ לתשלום</td><td class="num">${ils(q.totalIls)}</td></tr>
  </table>

  ${q.notes ? `<div class="notes">${esc(q.notes)}</div>` : ""}

  <section class="bank">
    <h2>פרטים להעברה בנקאית</h2>
    <table>
      <tr><td class="k">בנק</td><td>${esc(BANK_TRANSFER.bank)}</td></tr>
      <tr><td class="k">סניף</td><td>${esc(BANK_TRANSFER.branch)}</td></tr>
      <tr><td class="k">מספר חשבון</td><td>${esc(BANK_TRANSFER.account)}</td></tr>
      <tr><td class="k">שם המוטב</td><td>${esc(BANK_TRANSFER.holder)}</td></tr>
    </table>
  </section>

  <ul class="terms">
    <li>המחירים כוללים מע"מ.</li>
    <li>ההצעה בתוקף עד ${date(q.validUntil)}.</li>
    <li>זמן אספקה: עד 21 ימי עסקים ממועד אישור ההזמנה.</li>
  </ul>

  <footer>${esc(LEGAL_NAME)} · עוסק מורשה ${esc(BUSINESS_ID)} · <span dir="ltr">${esc(PHONE_DISPLAY)}</span></footer>
</body>
</html>`;
}

/**
 * Print the quote to PDF with headless Chrome — the same engine the lawSuits
 * exhibits use, because it is the one renderer here that gets Hebrew RTL right.
 *
 * `systemd-run --scope` moves Chrome out of the app service's cgroup (its
 * TasksMax would otherwise starve Chrome's process tree), and a throwaway
 * --user-data-dir keeps it from ever attaching to a Chrome someone is using.
 */
export async function quotePdf(q: Quote): Promise<Buffer> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "panelshed-quote-"));
  const htmlPath = path.join(dir, "quote.html");
  const pdfPath = path.join(dir, "quote.pdf");
  try {
    await writeFile(htmlPath, quoteHtml(q), "utf8");
    await execFileAsync(
      "systemd-run",
      [
        "--scope", "--quiet", "--",
        "google-chrome",
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        `--user-data-dir=${path.join(dir, "profile")}`,
        "--no-pdf-header-footer",
        `--print-to-pdf=${pdfPath}`,
        `file://${htmlPath}`,
      ],
      { timeout: 40_000 },
    );
    return await readFile(pdfPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
