'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface UpiQrCodeProps {
  uri?: string | null;
  size?: number;
  caption?: string;
}

export default function UpiQrCode({
  uri,
  size = 200,
  caption = 'Scan with any UPI app to pay',
}: UpiQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!uri) {
      setDataUrl(null);
      setFailed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFailed(false);

    QRCode.toDataURL(uri, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#101412', light: '#FFFFFF' },
    })
      .then((url: string) => {
        if (cancelled) return;
        setDataUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDataUrl(null);
        setFailed(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uri, size]);

  if (!uri) {
    return (
      <div
        className="flex w-full max-w-full flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-border bg-background p-4 text-center"
        style={{ width: size, minHeight: size }}
      >
        <p className="text-sm text-muted-foreground">
          Add your UPI ID in Settings to show a payment QR code.
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div
        className="flex w-full max-w-full flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-border bg-card p-4 text-center"
        style={{ width: size, minHeight: size }}
      >
        <p className="text-sm text-destructive">
          Could not draw the QR code. Use the UPI ID instead.
        </p>
      </div>
    );
  }

  if (loading || !dataUrl) {
    return (
      <div
        className="w-full max-w-full animate-pulse rounded-[var(--radius)] bg-muted"
        style={{ width: size, height: size }}
        aria-busy="true"
        aria-label="Generating UPI QR code"
      />
    );
  }

  return (
    <figure data-nexen-component="nx_components_UpiQrCode"
      className="flex w-full max-w-full flex-col items-center gap-2 rounded-[var(--radius)] border border-border bg-card p-4 shadow-sm"
      style={{ width: size + 32, maxWidth: '100%' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="UPI payment QR code"
        width={size}
        height={size}
        className="h-auto max-w-full rounded-[var(--radius)] bg-white"
      />
      <figcaption className="text-center text-xs text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}