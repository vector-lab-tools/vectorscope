"use client";

import { useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

/**
 * Wrapper around react-plotly.js that adds Shift+scroll fast zoom for 3D scenes.
 * Hold Shift while scrolling to zoom 5x faster.
 */
export default function Plot3DWrapper(props: React.ComponentProps<typeof Plot>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gdRef = useRef<any>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.shiftKey || !gdRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const gd = gdRef.current;
    const scene = gd._fullLayout?.scene?._scene;
    if (!scene?.getCamera) return;

    const camera = scene.getCamera();
    const zoomFactor = e.deltaY > 0 ? 1.2 : 0.83;

    const newCamera = {
      eye: {
        x: camera.eye.x * zoomFactor,
        y: camera.eye.y * zoomFactor,
        z: camera.eye.z * zoomFactor,
      },
      center: camera.center,
      up: camera.up,
    };

    // Use the graphDiv's emit/relayout path
    if (gd._fullLayout?.scene?.camera) {
      gd._fullLayout.scene.camera.eye = newCamera.eye;
      gd._fullLayout.scene.camera.center = newCamera.center;
      gd._fullLayout.scene.camera.up = newCamera.up;
    }

    // Update via the GL scene's internal camera
    const glplot = scene.glplot;
    if (glplot) {
      glplot.camera.lookAt(
        [newCamera.eye.x, newCamera.eye.y, newCamera.eye.z],
        [newCamera.center.x, newCamera.center.y, newCamera.center.z],
        [newCamera.up.x, newCamera.up.y, newCamera.up.z]
      );
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div ref={containerRef} className="relative">
      <Plot
        {...props}
        onInitialized={(_figure: any, graphDiv: any) => {
          gdRef.current = graphDiv;
          props.onInitialized?.(_figure, graphDiv);
        }}
        onUpdate={(_figure: any, graphDiv: any) => {
          gdRef.current = graphDiv;
          props.onUpdate?.(_figure, graphDiv);
        }}
      />
      <div className="absolute top-1 right-1 font-sans text-[9px] text-slate/50 pointer-events-none select-none">
        Shift+scroll = fast zoom
      </div>
    </div>
  );
}
