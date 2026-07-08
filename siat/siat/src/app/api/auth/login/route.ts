import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Logic for POST
  return NextResponse.json({ message: 'Success' });
}