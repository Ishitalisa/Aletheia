/**
 * Render a synthetic passport data page to a PNG, in the browser, from a demo sample.
 *
 * Everything drawn here is fabricated — invented people, invented numbers — and the page is
 * stamped SYNTHETIC. It exists so a demo user can download a passport-looking image and feed
 * it to the image / OCR path for a realistic run, without any real document. The MRZ is drawn
 * large and high-contrast to give the on-device OCR the best chance; the reliable paths remain
 * pasting the MRZ or the one-click load.
 */

export interface PassportDoc {
  countryName: string;
  countryCode: string;
  docNumber: string;
  surname: string;
  given: string;
  nationalityAlpha3: string;
  nationalityNumeric: string;
  dobDisplay: string;
  sex: string;
  expiryDisplay: string;
  /** The two MRZ lines, newline-separated. */
  mrz: string;
}

/** Country name for the passport header, from the alpha-3 code. Falls back to the code. */
export function countryName(alpha3: string): string {
  const names: Record<string, string> = {
    IND: "REPUBLIC OF INDIA",
    USA: "UNITED STATES OF AMERICA",
    GBR: "UNITED KINGDOM",
    JPN: "JAPAN",
  };
  return names[alpha3] ?? alpha3;
}

/** "1996-04-12" -> "12 APR 1996", the visual-zone date style. */
export function toVizDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${m[3]} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

/** Draw the passport and return a PNG data URL. */
export function passportDataUrl(doc: PassportDoc): string {
  const W = 1000;
  const H = 680;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("canvas 2d context unavailable");

  // Page background.
  g.fillStyle = "#f2efe6";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "#c9c2ad";
  g.lineWidth = 2;
  g.strokeRect(6, 6, W - 12, H - 12);

  // Header band.
  g.fillStyle = "#243b6b";
  g.fillRect(6, 6, W - 12, 74);
  g.fillStyle = "#f7f4ea";
  g.font = "700 30px Georgia, 'Times New Roman', serif";
  g.textBaseline = "middle";
  g.fillText(doc.countryName, 28, 44);
  g.font = "600 20px Georgia, serif";
  g.textAlign = "right";
  g.fillText("PASSPORT", W - 28, 44);
  g.textAlign = "left";

  // Synthetic stamp — unmissable, so the page can never be mistaken for real.
  g.save();
  g.translate(W - 250, 250);
  g.rotate(-Math.PI / 10);
  g.fillStyle = "rgba(200,40,40,0.16)";
  g.strokeStyle = "rgba(200,40,40,0.35)";
  g.lineWidth = 3;
  g.font = "800 40px Arial, sans-serif";
  g.textAlign = "center";
  g.fillText("SPECIMEN", 0, 0);
  g.font = "700 15px Arial, sans-serif";
  g.fillText("SYNTHETIC — NOT REAL", 0, 30);
  g.strokeRect(-150, -32, 300, 78);
  g.restore();
  g.textAlign = "left";

  // Photo placeholder.
  const px = 40;
  const py = 108;
  const pw = 210;
  const ph = 270;
  g.fillStyle = "#d9d4c6";
  g.fillRect(px, py, pw, ph);
  g.strokeStyle = "#b3ac97";
  g.strokeRect(px, py, pw, ph);
  // simple head-and-shoulders silhouette
  g.fillStyle = "#b3ac97";
  g.beginPath();
  g.arc(px + pw / 2, py + 110, 52, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(px + pw / 2, py + 300, 120, Math.PI, 0);
  g.fill();
  g.fillStyle = "#8b846f";
  g.font = "600 13px Arial, sans-serif";
  g.textAlign = "center";
  g.fillText("PHOTO", px + pw / 2, py + ph - 14);
  g.textAlign = "left";

  // Field column.
  const fx = 290;
  let fy = 120;
  const field = (label: string, value: string) => {
    g.fillStyle = "#7a745f";
    g.font = "600 12px Arial, sans-serif";
    g.fillText(label.toUpperCase(), fx, fy);
    g.fillStyle = "#1c1c1c";
    g.font = "600 22px 'Courier New', monospace";
    g.fillText(value, fx, fy + 24);
    fy += 54;
  };
  field("Type / Code", `P   ${doc.countryCode}`);
  field("Passport No.", doc.docNumber);
  field("Surname", doc.surname);
  field("Given names", doc.given);
  // two-up row for nationality + sex
  g.fillStyle = "#7a745f";
  g.font = "600 12px Arial, sans-serif";
  g.fillText("NATIONALITY", fx, fy);
  g.fillText("SEX", fx + 380, fy);
  g.fillStyle = "#1c1c1c";
  g.font = "600 22px 'Courier New', monospace";
  g.fillText(`${doc.nationalityNumeric} (${doc.nationalityAlpha3})`, fx, fy + 24);
  g.fillText(doc.sex, fx + 380, fy + 24);
  fy += 54;
  g.fillStyle = "#7a745f";
  g.font = "600 12px Arial, sans-serif";
  g.fillText("DATE OF BIRTH", fx, fy);
  g.fillText("DATE OF EXPIRY", fx + 380, fy);
  g.fillStyle = "#1c1c1c";
  g.font = "600 22px 'Courier New', monospace";
  g.fillText(doc.dobDisplay, fx, fy + 24);
  g.fillText(doc.expiryDisplay, fx + 380, fy + 24);

  // MRZ zone — white strip, big monospace, high contrast for OCR.
  const [line1 = "", line2 = ""] = doc.mrz.split(/\r?\n/);
  const mzY = H - 132;
  g.fillStyle = "#ffffff";
  g.fillRect(6, mzY, W - 12, 126);
  g.strokeStyle = "#c9c2ad";
  g.strokeRect(6, mzY, W - 12, 126);
  g.fillStyle = "#0a0a0a";
  g.font = "700 30px 'Courier New', 'Consolas', monospace";
  g.textAlign = "left";
  // let-spacing via manual glyph placement keeps columns even for the OCR pass.
  const drawSpaced = (text: string, x: number, y: number, step: number) => {
    for (let i = 0; i < text.length; i++) g.fillText(text[i] as string, x + i * step, y);
  };
  drawSpaced(line1, 26, mzY + 48, 21.4);
  drawSpaced(line2, 26, mzY + 96, 21.4);

  return canvas.toDataURL("image/png");
}

/** Trigger a browser download of the passport PNG. */
export function downloadPassport(doc: PassportDoc, filename: string): void {
  const url = passportDataUrl(doc);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
