import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { PdfReport } from '@/app/lib/pdf-report';
import React, { type ReactElement } from 'react';
import type { CheckResult } from '@/app/lib/types';

export async function POST(req: NextRequest) {
  const result = (await req.json()) as CheckResult;

  if (!result.url || !result.violations) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(PdfReport, { result }) as unknown as ReactElement<DocumentProps>;
  const pdfBuffer = await renderToBuffer(element);

  let hostname = result.url;
  try { hostname = new URL(result.url).hostname; } catch { /* keep original */ }
  const filename = `audit-${hostname.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.pdf`;

  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
