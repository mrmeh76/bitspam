"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button
      aria-label="Copy suggested contributor comment"
      size="icon-sm"
      type="button"
      variant="ghost"
      onClick={() => void onCopy()}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
