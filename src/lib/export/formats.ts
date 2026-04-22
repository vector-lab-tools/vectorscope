/**
 * Low-level export helpers shared across all operations.
 *
 * Four formats:
 *   JSON — raw result payload, pretty-printed.
 *   CSV  — tabular extract, operation-provided.
 *   PNG  — capture of one or more Plotly plots inside a container element.
 *   PDF  — composed document with header, metadata, captured plots, and an
 *          optional summary table.
 *
 * All helpers produce a Blob and a suggested filename; `downloadBlob` wires
 * the file to the browser's download machinery via an ephemeral anchor.
 */
import jsPDF from "jspdf";

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

/**
 * Make a filesystem-safe filename. Lowercases, strips characters we'd rather
 * not see in a Downloads folder, collapses whitespace / hyphens.
 */
export function safeFilename(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** YYYY-MM-DD-HHMMSS. Useful suffix so repeated exports don't overwrite. */
export function timestampSuffix(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 0);
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

export function buildJsonBlob(data: unknown): Blob {
  const text = JSON.stringify(data, null, 2);
  return new Blob([text], { type: "application/json" });
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** A single CSV section: a named table with header row. */
export interface CsvTable {
  title?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Build a CSV string from one or more named tables. Between tables we insert
 * a blank line and (if given) a `# title` comment so spreadsheet import
 * tools that concatenate happily can split them back apart.
 */
export function buildCsv(tables: CsvTable[]): string {
  const parts: string[] = [];
  tables.forEach((t, idx) => {
    if (idx > 0) parts.push("", "");
    if (t.title) parts.push(`# ${t.title}`);
    parts.push(t.headers.map(escapeCell).join(","));
    for (const row of t.rows) {
      parts.push(row.map(escapeCell).join(","));
    }
  });
  return parts.join("\n");
}

export function buildCsvBlob(tables: CsvTable[]): Blob {
  return new Blob([buildCsv(tables)], { type: "text/csv" });
}

// ---------------------------------------------------------------------------
// PNG capture
// ---------------------------------------------------------------------------

/**
 * Find every Plotly plot inside `container` and capture it as a PNG data URL.
 *
 * We use Plotly's own `toImage` because it renders the current camera state
 * correctly, unlike html2canvas on WebGL surfaces. Plotly is pulled in
 * dynamically so the export path doesn't inflate the initial bundle.
 *
 * Returns an array of `{ dataUrl, width, height }`. Skips plots that Plotly
 * cannot serialise (e.g. partly-initialised ones).
 */
export interface CapturedImage {
  dataUrl: string;
  width: number;
  height: number;
}

export async function capturePlotlyPlots(
  container: HTMLElement | null,
  opts?: { scale?: number; format?: "png" | "jpeg" | "svg" }
): Promise<CapturedImage[]> {
  if (!container) return [];

  // Plotly decorates rendered plots with this class.
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(".js-plotly-plot"));
  if (nodes.length === 0) return [];

  // Dynamic import so jspdf isn't pulled into every operation bundle;
  // Plotly is already pulled in wherever Plot is rendered, but being
  // explicit about the global helps tree-shakers.
  // The plotly.js dist packages don't ship .d.ts, hence the suppression.
  // @ts-expect-error no types for plotly.js-basic-dist-min
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Plotly: any = (await import("plotly.js-basic-dist-min")).default;

  const scale = opts?.scale ?? 2;
  const format = opts?.format ?? "png";

  const out: CapturedImage[] = [];
  for (const node of nodes) {
    try {
      const rect = node.getBoundingClientRect();
      const dataUrl: string = await Plotly.toImage(node, {
        format,
        width: Math.max(400, rect.width),
        height: Math.max(240, rect.height),
        scale,
      });
      out.push({
        dataUrl,
        width: rect.width || 800,
        height: rect.height || 480,
      });
    } catch {
      // Skip any plot that isn't fully mounted. The others still export.
    }
  }
  return out;
}

export async function buildPngBlob(
  container: HTMLElement | null
): Promise<Blob | null> {
  const images = await capturePlotlyPlots(container, { scale: 2 });
  if (images.length === 0) return null;
  // Use the first plot as the single PNG. Multi-plot operations can fall
  // back to PDF which composes them.
  const dataUrl = images[0].dataUrl;
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

// ---------------------------------------------------------------------------
// PDF composition
// ---------------------------------------------------------------------------

export interface PdfBundle {
  title: string;
  subtitle?: string;
  metadata?: { label: string; value: string }[];
  summaryTables?: CsvTable[];
  plots?: CapturedImage[];
  /** Appended verbatim to the PDF; use for longer prose notes. */
  notes?: string;
  /** Footer label; defaults to "Vectorscope — Vector Lab". */
  footer?: string;
}

export async function buildPdfBlob(bundle: PdfBundle): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const MARGIN = 36;
  let y = MARGIN;

  const ensureSpace = (needed: number): void => {
    if (y + needed > PAGE_H - MARGIN - 16) {
      drawFooter();
      doc.addPage();
      y = MARGIN;
    }
  };

  const drawFooter = (): void => {
    const prevSize = doc.getFontSize();
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const label = bundle.footer ?? "Vectorscope — Vector Lab";
    const page = `${doc.getCurrentPageInfo().pageNumber}`;
    doc.text(label, MARGIN, PAGE_H - MARGIN / 2);
    doc.text(page, PAGE_W - MARGIN, PAGE_H - MARGIN / 2, { align: "right" });
    doc.setFontSize(prevSize);
    doc.setTextColor(0, 0, 0);
  };

  // Title
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(bundle.title, MARGIN, y);
  y += 24;

  if (bundle.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    const sub = doc.splitTextToSize(bundle.subtitle, PAGE_W - 2 * MARGIN);
    doc.text(sub, MARGIN, y);
    y += sub.length * 14 + 6;
    doc.setTextColor(0, 0, 0);
  }

  // Metadata table (label / value)
  if (bundle.metadata && bundle.metadata.length > 0) {
    doc.setFontSize(10);
    for (const { label, value } of bundle.metadata) {
      ensureSpace(16);
      doc.setTextColor(110, 110, 110);
      doc.text(label, MARGIN, y);
      doc.setTextColor(30, 30, 30);
      const wrapped = doc.splitTextToSize(value, PAGE_W - 2 * MARGIN - 120);
      doc.text(wrapped, MARGIN + 120, y);
      y += Math.max(14, wrapped.length * 12) + 2;
    }
    y += 6;
    doc.setTextColor(0, 0, 0);
  }

  // Plots
  if (bundle.plots && bundle.plots.length > 0) {
    for (const img of bundle.plots) {
      const maxW = PAGE_W - 2 * MARGIN;
      const ratio = img.height && img.width ? img.height / img.width : 0.6;
      const drawW = Math.min(maxW, img.width || maxW);
      const drawH = drawW * ratio;
      ensureSpace(drawH + 12);
      try {
        doc.addImage(img.dataUrl, "PNG", MARGIN, y, drawW, drawH);
      } catch {
        // Skip a plot that jsPDF rejects (rare)
      }
      y += drawH + 12;
    }
  }

  // Summary tables
  if (bundle.summaryTables && bundle.summaryTables.length > 0) {
    for (const t of bundle.summaryTables) {
      if (t.title) {
        ensureSpace(22);
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30);
        doc.text(t.title, MARGIN, y);
        y += 14;
      }
      doc.setFontSize(9);
      // Simple monospace-ish layout — even column widths, truncate long cells
      const cols = t.headers.length;
      const colW = (PAGE_W - 2 * MARGIN) / cols;
      ensureSpace(14);
      doc.setTextColor(110, 110, 110);
      t.headers.forEach((h, i) => {
        doc.text(String(h), MARGIN + i * colW, y);
      });
      y += 12;
      doc.setTextColor(30, 30, 30);
      for (const row of t.rows) {
        ensureSpace(12);
        row.forEach((cell, i) => {
          const s = cell === null || cell === undefined ? "" : String(cell);
          const truncated = s.length > 22 ? s.slice(0, 21) + "…" : s;
          doc.text(truncated, MARGIN + i * colW, y);
        });
        y += 11;
      }
      y += 8;
    }
  }

  // Notes
  if (bundle.notes) {
    ensureSpace(16);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(bundle.notes, PAGE_W - 2 * MARGIN);
    for (const line of lines) {
      ensureSpace(12);
      doc.text(line, MARGIN, y);
      y += 12;
    }
    doc.setTextColor(0, 0, 0);
  }

  drawFooter();

  return doc.output("blob");
}
