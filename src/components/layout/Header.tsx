"use client";

import { APP_NAME, APP_TAGLINE, VERSION } from "@/lib/version";
import { useModel } from "@/context/ModelContext";
import { Cpu, Loader2 } from "lucide-react";
import AboutDialog from "./AboutDialog";
import HelpDialog from "./HelpDialog";
import SettingsDialog from "./SettingsDialog";

export default function Header() {
  const { backendStatus } = useModel();

  const statusColor =
    backendStatus.status === "connected"
      ? "bg-success-500"
      : backendStatus.status === "loading"
      ? "bg-warning-500 animate-pulse-subtle"
      : "bg-error-500";

  return (
    <header className="border-b border-parchment-dark bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display text-display-md text-ink tracking-tight">
              {APP_NAME}
            </h1>
            <p className="font-sans text-caption text-slate mt-0.5">
              {APP_TAGLINE}
            </p>
          </div>
          <span className="font-sans text-caption text-slate-light bg-cream px-2 py-0.5 rounded-sm">
            v{VERSION}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Model status */}
          <div className="flex items-center gap-2 font-sans text-body-sm">
            <Cpu className="w-4 h-4 text-slate" />
            {backendStatus.model ? (
              <span className="text-ink">{backendStatus.model.name}</span>
            ) : backendStatus.status === "loading" ? (
              <span className="text-slate flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </span>
            ) : (
              <span className="text-slate">No model loaded</span>
            )}
          </div>

          {/* Backend indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span className="font-sans text-caption text-slate">
              {backendStatus.status === "connected"
                ? backendStatus.device
                : "Disconnected"}
            </span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 ml-2 border-l border-parchment-dark pl-3">
            <AboutDialog />
            <HelpDialog />
            <SettingsDialog />
          </div>
        </div>
      </div>
    </header>
  );
}
