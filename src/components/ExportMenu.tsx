"use client";

/**
 * ExportMenu — the uniform export dropdown shown on every operation.
 *
 * Four formats:
 *   JSON — raw result payload, always available.
 *   CSV  — tabular extract, if the operation provides `csvTables`.
 *   PNG  — first Plotly plot in `plotContainerRef`, if there's a plot at all.
 *   PDF  — composed document: title, metadata, all captured plots, summary tables.
 *
 * Operations pass a `getBundle` callback rather than the bundle directly so
 * the payload is assembled only when the user clicks — we don't want to
 * rebuild a CSV every render.
 *
 * The menu is a native <details> / <summary> so keyboard users and screen
 * readers get sensible behaviour without a full popover dance.
 */

import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  buildCsvBlob,
  buildJsonBlob,
  buildPdfBlob,
  buildPngBlob,
  capturePlotlyPlots,
  downloadBlob,
  safeFilename,
  timestampSuffix,
  type CsvTable,
  type PdfBundle,
} from "@/lib/export";

export interface ExportBundle {
  /** JSON payload, e.g. the raw operation result. Required. */
  json: unknown;
  /** CSV section(s). Omit if the operation has no useful tabular view. */
  csvTables?: CsvTable[];
  /** Container whose Plotly plots should be captured for PNG / PDF. */
  plotContainer?: HTMLElement | null;
  /** PDF-only: title line (defaults to operation name). */
  pdfTitle?: string;
  /** PDF-only: subtitle / prompt / longer description. */
  pdfSubtitle?: string;
  /** PDF-only: labelled key/value pairs shown under the title. */
  pdfMetadata?: { label: string; value: string }[];
  /** PDF-only: summary tables after the plots. */
  pdfSummaryTables?: CsvTable[];
  /** PDF-only: trailing prose. */
  pdfNotes?: string;
}

interface ExportMenuProps {
  /** Human operation name, e.g. "Isotropy Analysis". Used in filenames. */
  operationName: string;
  /** Build the payload lazily on click so we don't serialise every render. */
  getBundle: () => ExportBundle | null;
  /** Disable when there's no result yet. */
  disabled?: boolean;
  /** Optional extra filename hint, typically the loaded model name. */
  modelName?: string;
}

type Format = "json" | "csv" | "png" | "pdf";

export default function ExportMenu({
  operationName,
  getBundle,
  disabled,
  modelName,
}: ExportMenuProps) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Close the menu on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const d = detailsRef.current;
      if (!d || !d.open) return;
      if (d.contains(e.target as Node)) return;
      d.open = false;
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function run(format: Format) {
    setErr(null);
    setBusy(format);
    try {
      const bundle = getBundle();
      if (!bundle) {
        setErr("No result to export yet");
        return;
      }

      const slug = safeFilename(
        `${operationName}${modelName ? "-" + modelName : ""}-${timestampSuffix()}`
      );

      if (format === "json") {
        downloadBlob(buildJsonBlob(bundle.json), `${slug}.json`);
      } else if (format === "csv") {
        if (!bundle.csvTables || bundle.csvTables.length === 0) {
          setErr("This operation has no CSV tables to export");
          return;
        }
        downloadBlob(buildCsvBlob(bundle.csvTables), `${slug}.csv`);
      } else if (format === "png") {
        const blob = await buildPngBlob(bundle.plotContainer ?? null);
        if (!blob) {
          setErr("No plots available yet to capture");
          return;
        }
        downloadBlob(blob, `${slug}.png`);
      } else if (format === "pdf") {
        const plots = await capturePlotlyPlots(bundle.plotContainer ?? null, {
          scale: 2,
        });
        const pdfBundle: PdfBundle = {
          title: bundle.pdfTitle ?? operationName,
          subtitle: bundle.pdfSubtitle,
          metadata: [
            ...(modelName ? [{ label: "Model", value: modelName }] : []),
            { label: "Exported", value: new Date().toISOString() },
            ...(bundle.pdfMetadata ?? []),
          ],
          plots,
          summaryTables: bundle.pdfSummaryTables,
          notes: bundle.pdfNotes,
        };
        const blob = await buildPdfBlob(pdfBundle);
        downloadBlob(blob, `${slug}.pdf`);
      }

      // Close menu on success
      if (detailsRef.current) detailsRef.current.open = false;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  const hasCsv = (() => {
    try {
      const b = getBundle();
      return !!(b && b.csvTables && b.csvTables.length > 0);
    } catch {
      return false;
    }
  })();

  return (
    <details ref={detailsRef} className="relative inline-block">
      <summary
        className={
          "list-none cursor-pointer select-none flex items-center gap-1.5 " +
          "px-2 py-1 text-caption rounded-sm border border-parchment-dark " +
          "bg-cream/50 hover:bg-cream text-slate hover:text-ink " +
          "transition-colors " +
          (disabled ? "opacity-40 pointer-events-none" : "")
        }
        aria-label={`Export ${operationName}`}
        title={`Export ${operationName} results`}
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span>Export</span>
      </summary>
      <div
        className="absolute right-0 top-[calc(100%+4px)] z-20 w-44 rounded-sm border border-parchment-dark bg-ivory shadow-editorial-lg text-caption"
        role="menu"
      >
        <MenuItem
          label="JSON"
          hint="Raw result data"
          onClick={() => run("json")}
          busy={busy === "json"}
        />
        <MenuItem
          label="CSV"
          hint={hasCsv ? "Tabular extract" : "Not available for this operation"}
          onClick={() => run("csv")}
          busy={busy === "csv"}
          disabled={!hasCsv}
        />
        <MenuItem
          label="PNG"
          hint="First plot, high-res"
          onClick={() => run("png")}
          busy={busy === "png"}
        />
        <MenuItem
          label="PDF"
          hint="Composed document"
          onClick={() => run("pdf")}
          busy={busy === "pdf"}
        />
        {err && (
          <div className="px-3 py-2 text-[10px] text-red-700 border-t border-parchment">
            {err}
          </div>
        )}
      </div>
    </details>
  );
}

function MenuItem({
  label,
  hint,
  onClick,
  busy,
  disabled,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={
        "w-full text-left px-3 py-2 flex items-center justify-between " +
        "hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed " +
        "disabled:hover:bg-transparent transition-colors"
      }
      role="menuitem"
    >
      <span className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-ink w-10">{label}</span>
        <span className="text-[10px] text-slate/70">{hint}</span>
      </span>
      {busy && <Loader2 className="w-3 h-3 animate-spin text-burgundy" />}
    </button>
  );
}
