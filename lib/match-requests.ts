import { query } from './db';

export type MatchRole = 'interpreter' | 'helper';
export type MatchRequestStatus = 'pending' | 'cancelled' | 'matched';

export interface MatchRequest {
  id: number;
  requesterAccountId: number | null;
  requesterName: string | null;
  requesterRole: 'tourist';
  targetRole: MatchRole;
  latitude: number;
  longitude: number;
  radiusKm: number | null;
  status: MatchRequestStatus;
  device: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewMatchRequest {
  requesterAccountId?: number | null;
  requesterName?: string | null;
  requesterRole: 'tourist';
  targetRole: MatchRole;
  latitude: number;
  longitude: number;
  radiusKm?: number | null;
  device?: string | null;
  note?: string | null;
}

export async function createMatchRequest(input: NewMatchRequest): Promise<MatchRequest> {
  const rows = await query<MatchRequest>(
    `INSERT INTO match_requests
      (requester_account_id, requester_name, requester_role, target_role, latitude, longitude, radius_km, status, device, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
     RETURNING
      id,
      requester_account_id AS "requesterAccountId",
      requester_name AS "requesterName",
      requester_role AS "requesterRole",
      target_role AS "targetRole",
      latitude,
      longitude,
      radius_km AS "radiusKm",
      status,
      device,
      note,
      created_at AS "createdAt",
      updated_at AS "updatedAt"`,
    [
      input.requesterAccountId ?? null,
      sanitize(input.requesterName),
      input.requesterRole,
      input.targetRole,
      input.latitude,
      input.longitude,
      input.radiusKm ?? null,
      sanitize(input.device),
      sanitize(input.note)
    ]
  );

  return coerceMatchRequest(rows[0]);
}

export async function cancelMatchRequestById(requestId: number, accountId?: number): Promise<number> {
  const rows = await query<{ id: number }>(
    `UPDATE match_requests
       SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1
       AND status = 'pending'
       AND ($2::int IS NULL OR requester_account_id = $2::int)
     RETURNING id`,
    [requestId, accountId ?? null]
  );
  return rows.length;
}

export async function cancelPendingRequestsByAccount(accountId: number): Promise<number> {
  const rows = await query<{ id: number }>(
    `UPDATE match_requests
       SET status = 'cancelled', updated_at = NOW()
     WHERE requester_account_id = $1 AND status = 'pending'
     RETURNING id`,
    [accountId]
  );
  return rows.length;
}

export async function getPendingMatchRequests(targetRole: MatchRole): Promise<MatchRequest[]> {
  const rows = await query<MatchRequest>(
    `SELECT
      id,
      requester_account_id AS "requesterAccountId",
      requester_name AS "requesterName",
      requester_role AS "requesterRole",
      target_role AS "targetRole",
      latitude,
      longitude,
      radius_km AS "radiusKm",
      status,
      device,
      note,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM match_requests
    WHERE target_role = $1
      AND status = 'pending'
    ORDER BY created_at ASC`,
    [targetRole]
  );

  return rows.map(coerceMatchRequest);
}

export async function findPendingRequestByAccount(accountId: number): Promise<MatchRequest | undefined> {
  const rows = await query<MatchRequest>(
    `SELECT
      id,
      requester_account_id AS "requesterAccountId",
      requester_name AS "requesterName",
      requester_role AS "requesterRole",
      target_role AS "targetRole",
      latitude,
      longitude,
      radius_km AS "radiusKm",
      status,
      device,
      note,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM match_requests
    WHERE requester_account_id = $1
      AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1`,
    [accountId]
  );

  if (!rows[0]) {
    return undefined;
  }

  return coerceMatchRequest(rows[0]);
}

export async function markMatchRequestMatched(args: {
  requestId: number;
  responderAccountId: number;
  responderRole: MatchRole;
}): Promise<{ assignmentId: number; request: MatchRequest }> {
  const [requestRaw] = await query<MatchRequest>(
    `UPDATE match_requests
       SET status = 'matched',
           updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING
       id,
       requester_account_id AS "requesterAccountId",
       requester_name AS "requesterName",
       requester_role AS "requesterRole",
       target_role AS "targetRole",
       latitude,
       longitude,
       radius_km AS "radiusKm",
       status,
       device,
       note,
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [args.requestId]
  );

  if (!requestRaw) {
    throw new Error('매칭 가능한 요청을 찾을 수 없습니다.');
  }

  const request = coerceMatchRequest(requestRaw);

  const [assignment] = await query<{ id: number }>(
    `INSERT INTO match_assignments
      (request_id, tourist_account_id, responder_account_id, responder_role, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      request.id,
      request.requesterAccountId ?? null,
      args.responderAccountId,
      args.responderRole,
      request.latitude,
      request.longitude
    ]
  );

  return { assignmentId: assignment.id, request };
}

function sanitize(value?: string | null): string | null {
  const trimmed = value?.toString().trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function coerceMatchRequest(request: MatchRequest): MatchRequest {
  return {
    ...request,
    latitude: typeof request.latitude === 'number' ? request.latitude : Number(request.latitude),
    longitude: typeof request.longitude === 'number' ? request.longitude : Number(request.longitude),
    radiusKm: request.radiusKm == null ? null : Number(request.radiusKm)
  };
}
