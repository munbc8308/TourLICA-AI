import { query } from './db';

export type MatchRole = 'interpreter' | 'helper';
export type MatchRequestStatus = 'pending' | 'cancelled' | 'matched';

export type MeetingStatus = 'enroute' | 'awaiting_confirmation' | 'completed';

export interface MatchAssignment {
  id: number;
  requestId: number | null;
  touristAccountId: number | null;
  touristName: string | null;
  responderAccountId: number | null;
  responderName: string | null;
  responderRole: MatchRole;
  latitude: number | null;
  longitude: number | null;
  matchedAt: string;
  meetingStatus: MeetingStatus;
  meetingStatusUpdatedAt: string;
}

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

export async function getAssignmentForAccount(args: {
  accountId: number;
  perspective: 'tourist' | 'responder';
}): Promise<MatchAssignment | undefined> {
  const field = args.perspective === 'tourist' ? 'tourist_account_id' : 'responder_account_id';
  const rows = await query<MatchAssignment>(
    `SELECT
      ma.id,
      ma.request_id AS "requestId",
      ma.tourist_account_id AS "touristAccountId",
      tourist.name AS "touristName",
      ma.responder_account_id AS "responderAccountId",
      responder.name AS "responderName",
      ma.responder_role AS "responderRole",
      ma.latitude,
      ma.longitude,
      ma.matched_at AS "matchedAt",
      ma.meeting_status AS "meetingStatus",
      ma.meeting_status_updated_at AS "meetingStatusUpdatedAt"
    FROM match_assignments ma
    LEFT JOIN accounts tourist ON tourist.id = ma.tourist_account_id
    LEFT JOIN accounts responder ON responder.id = ma.responder_account_id
    WHERE ma.${field} = $1
    ORDER BY ma.matched_at DESC
    LIMIT 1`,
    [args.accountId]
  );

  return rows[0];
}

export async function requestMeetingConfirmation(args: {
  assignmentId: number;
  responderAccountId: number;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<MatchAssignment | undefined> {
  return updateMeetingStatus(args.assignmentId, args.responderAccountId, 'responder_account_id', 'awaiting_confirmation', args.latitude, args.longitude);
}

export async function confirmMeeting(args: {
  assignmentId: number;
  touristAccountId: number;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<MatchAssignment | undefined> {
  return updateMeetingStatus(args.assignmentId, args.touristAccountId, 'tourist_account_id', 'completed', args.latitude, args.longitude);
}

async function updateMeetingStatus(
  assignmentId: number,
  accountId: number,
  ownershipColumn: 'responder_account_id' | 'tourist_account_id',
  status: MeetingStatus,
  latitude?: number | null,
  longitude?: number | null
): Promise<MatchAssignment | undefined> {
  const rows = await query<MatchAssignment>(
    `UPDATE match_assignments ma
       SET meeting_status = $1,
           meeting_status_updated_at = NOW(),
           latitude = COALESCE($4, latitude),
           longitude = COALESCE($5, longitude)
     WHERE ma.id = $2
       AND ma.${ownershipColumn} = $3
     RETURNING
       ma.id,
      ma.request_id AS "requestId",
      ma.tourist_account_id AS "touristAccountId",
      (SELECT name FROM accounts WHERE id = ma.tourist_account_id) AS "touristName",
      ma.responder_account_id AS "responderAccountId",
      (SELECT name FROM accounts WHERE id = ma.responder_account_id) AS "responderName",
      ma.responder_role AS "responderRole",
      ma.latitude,
      ma.longitude,
      ma.matched_at AS "matchedAt",
      ma.meeting_status AS "meetingStatus",
      ma.meeting_status_updated_at AS "meetingStatusUpdatedAt"`,
    [status, assignmentId, accountId, latitude ?? null, longitude ?? null]
  );

  return rows[0];
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
