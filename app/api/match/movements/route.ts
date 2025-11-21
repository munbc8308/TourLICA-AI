import { NextResponse } from 'next/server';
import { listMovements, recordMovement } from '@/lib/match-movements';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assignmentId = Number(searchParams.get('assignmentId'));
  if (!Number.isFinite(assignmentId)) {
    return NextResponse.json({ movements: [] });
  }

  const limit = Number(searchParams.get('limit'));
  const movementLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 200;
  const movements = await listMovements(assignmentId, movementLimit);
  return NextResponse.json({ movements });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const assignmentId = Number(body.assignmentId);
  const role = body.role;
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (!Number.isFinite(assignmentId) || !isFinite(latitude) || !isFinite(longitude)) {
    return NextResponse.json({ error: 'assignmentId/latitude/longitude 값이 필요합니다.' }, { status: 400 });
  }

  if (!isMovementRole(role)) {
    return NextResponse.json({ error: '지원되지 않는 역할입니다.' }, { status: 400 });
  }

  const movement = await recordMovement({ assignmentId, role, latitude, longitude });
  return NextResponse.json({ movement });
}

function isMovementRole(role: any): role is 'tourist' | 'interpreter' | 'helper' {
  return role === 'tourist' || role === 'interpreter' || role === 'helper';
}
