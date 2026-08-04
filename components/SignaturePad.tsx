"use client";

import { useEffect, useRef } from "react";

export default function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inkRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const old = inkRef.current ? canvas.toDataURL("image/png") : null;
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#111111";
      if (old) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = old;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    drawing.current = true;
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    inkRef.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && inkRef.current) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    inkRef.current = false;
    onChange("");
  }

  return (
    <div className="signature-pad">
      <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
      <div className="signature-toolbar">
        <span className="meta">Draw your signature above</span>
        <button className="btn btn-secondary" type="button" onClick={clear}>Clear</button>
      </div>
    </div>
  );
}
