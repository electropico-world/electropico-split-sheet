"use client";

import { useState } from "react";

export default function CopySigningLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/sign/${token}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return <button className="btn btn-secondary" type="button" onClick={copy}>{copied ? "Copied" : "Copy private link"}</button>;
}
