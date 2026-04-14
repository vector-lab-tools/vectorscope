"use client";

import { useState, useEffect } from "react";
import Providers from "./providers";
import Header from "@/components/layout/Header";
import TabNav from "@/components/layout/TabNav";
import StatusBar from "@/components/layout/StatusBar";
import ModelLoader from "@/components/layout/ModelLoader";
import { useModel } from "@/context/ModelContext";
import type { TabGroup } from "@/types/model";

function VectorscopeApp() {
  const { backendStatus, checkBackend } = useModel();
  const [activeGroup, setActiveGroup] = useState<TabGroup>("inspect");
  const [activeTab, setActiveTab] = useState("embedding-table");

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, [checkBackend]);

  const modelLoaded = !!backendStatus.model;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <TabNav
        activeGroup={activeGroup}
        activeTab={activeTab}
        onGroupChange={setActiveGroup}
        onTabChange={setActiveTab}
        modelLoaded={modelLoaded}
      />

      <main className="flex-1 px-6 py-4">
        {!modelLoaded ? (
          <ModelLoader />
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="card-editorial p-8 text-center">
              <p className="font-body text-body-lg text-slate">
                {activeTab} operation — coming in Phase 1
              </p>
            </div>
          </div>
        )}
      </main>

      <StatusBar />
    </div>
  );
}

export default function Home() {
  return (
    <Providers>
      <VectorscopeApp />
    </Providers>
  );
}
