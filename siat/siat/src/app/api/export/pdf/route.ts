import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth/nextauth.config';
import { generatePdf } from '../../../../lib/export/exportToPdf';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const year = url.searchParams.get('year') || '';
  const assetId = url.searchParams.get('assetId') || '';

  // Return a web stream containing the PDF
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Custom mock response for pdfkit piping
  const mockRes = {
    write: (chunk: any) => { writer.write(chunk); return true; },
    end: () => { writer.close(); },
    on: () => {},
    once: () => {},
    emit: () => {}
  };

  generatePdf(mockRes, year, assetId);

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"'
    }
  });
}