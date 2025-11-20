import { NextResponse } from 'next/server';
import { getDestinations } from '@/lib/destinations';

export async function GET() {
  const destinations = await getDestinations();
  return NextResponse.json({ data: destinations });
}
