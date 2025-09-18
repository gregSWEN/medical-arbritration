import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Submission } from "@/types";
import { CPT_PRICE } from "@/lib/cpt";

const fmtUSD = (n: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const offerForCpt = (code: string, count: number) =>
  Math.round((CPT_PRICE[code] ?? 0) * 0.85 * (count || 1));

/** crude word-wrap using font metrics */
function wrapText(text: string, font: any, size: number, maxWidth: number) {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateNegotiationPdf_clean(
  sub: Submission
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // US Letter
  const width = page.getWidth();
  const height = page.getHeight();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.45, 0.45, 0.45);

  const margin = 36; // 0.5"
  let y = height - margin;

  // ---------- HEADER ----------
  page.drawText("Information on the Parties and Item(s) and/or Service(s)", {
    x: margin,
    y,
    size: 14,
    font: bold,
    color: black,
  });
  y -= 24;

  const headerBody = `${
    "Spine Medical Services, PLLC/ " + (sub.doctor || "")
  } is initiating an open negotiation period with ${
    sub.insurance || ""
  } for the out-of-network rate of the following item(s) and/or service(s). To negotiate, please contact me (Kerry Pagnotta) at the e-mail address or telephone number below:`;
  wrapText(headerBody, font, 11, width - margin * 2).forEach((line) => {
    page.drawText(line, { x: margin, y, size: 11, font, color: black });
    y -= 14;
  });
  y -= 8;

  // ---------- TABLE ----------
  // columns modeled on your example
  const columns = [
    { key: "desc", title: "Description of item(s) and/or service(s)", w: 120 },
    { key: "claim", title: "Claim Number", w: 70 },
    { key: "prov", title: "Name of provider / facility (and NPI)", w: 170 },
    { key: "dos", title: "Date provided", w: 80 },
    { key: "code", title: "Service code", w: 70 },
    { key: "ip", title: "Initial payment (N/A if none)", w: 90 },
    { key: "offer", title: "Offer for total out-of-network rate", w: 110 },
  ];
  const tableX = margin;
  const tableW = columns.reduce((s, c) => s + c.w, 0);
  const rowH = 24;

  // header row background line
  page.drawRectangle({
    x: tableX,
    y: y - rowH + 6,
    width: tableW,
    height: rowH,
    color: undefined,
    borderColor: black,
    borderWidth: 1,
  });

  // header titles
  let cx = tableX + 6;
  for (const col of columns) {
    const lines = wrapText(col.title, bold, 9, col.w - 12);
    let hy = y - 10;
    for (const l of lines) {
      page.drawText(l, { x: cx, y: hy, size: 9, font: bold, color: black });
      hy -= 10;
    }
    cx += col.w;
  }
  y -= rowH + 2;

  // grid helper
  function drawRowBorder(yy: number) {
    page.drawRectangle({
      x: tableX,
      y: yy - rowH + 6,
      width: tableW,
      height: rowH,
      color: undefined,
      borderColor: gray,
      borderWidth: 0.8,
    });
  }

  function drawCell(text: string, x: number, w: number) {
    const pad = 6;
    const lines = wrapText(text || "", font, 10, w - pad * 2);
    let ty = y - 12;
    for (const l of lines.slice(0, 2)) {
      // clamp per row
      page.drawText(l, { x: x + pad, y: ty, size: 10, font, color: black });
      ty -= 12;
    }
  }

  // Render up to 7 CPT rows
  const providerName = `SPINE MEDICAL SERVICES, ${sub.doctor || ""}`;
  const descDefault = "IONM";
  const lines = sub.cpts.slice(0, 7);

  for (let i = 0; i < 7; i++) {
    drawRowBorder(y);
    let x = tableX;

    const cpt = lines[i];
    const desc = cpt ? descDefault : "";
    const claimNo = sub.claimNo || "";
    const prov = providerName;
    const dos = sub.dateOfService || "";
    const code = cpt?.code || "";
    const ip = cpt ? fmtUSD(cpt.initialPayment || 0) : "";
    const offer = cpt?.code
      ? fmtUSD(offerForCpt(cpt.code, cpt.count || 1))
      : "";

    // desc
    drawCell(desc, x, columns[0].w);
    x += columns[0].w;
    // claim
    drawCell(claimNo, x, columns[1].w);
    x += columns[1].w;
    // provider
    drawCell(prov, x, columns[2].w);
    x += columns[2].w;
    // dos
    drawCell(dos, x, columns[3].w);
    x += columns[3].w;
    // code
    drawCell(code, x, columns[4].w);
    x += columns[4].w;
    // ip
    drawCell(ip, x, columns[5].w);
    x += columns[5].w;
    // offer
    drawCell(offer, x, columns[6].w);

    y -= rowH;
  }

  y -= 18;

  // ---------- DATE + SIGNATURE / CONTACT ----------
  const submittedDate = new Date(
    sub.dateSubmittedIso || Date.now()
  ).toLocaleDateString();
  page.drawText(`Date: ${submittedDate}`, {
    x: margin,
    y,
    size: 11,
    font: bold,
    color: black,
  });
  y -= 28;

  // Signature block
  page.drawText("Kerry Pagnotta", {
    x: margin,
    y,
    size: 11,
    font: bold,
    color: black,
  });
  page.drawText("Provider/Practice Manager", {
    x: margin + 150,
    y,
    size: 11,
    font,
    color: black,
  });
  y -= 20;

  page.drawText("140 ADAMS AVE. SUITE B-13", {
    x: margin,
    y,
    size: 10,
    font,
    color: black,
  });
  page.drawText("HAUPPAUGE, NY 11788    631-617-6011 EXT 502", {
    x: margin,
    y: y - 14,
    size: 10,
    font,
    color: black,
  });
  y -= 30;

  page.drawText("QAALERTS@SMSNEURO.COM", {
    x: margin,
    y,
    size: 10,
    font: bold,
    color: black,
  });
  y -= 20;

  page.drawText("Please keep a copy of this notice for your records.", {
    x: margin,
    y,
    size: 10,
    font,
    color: black,
  });

  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
