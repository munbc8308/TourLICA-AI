import 'server-only';
import { query } from './db';

export interface MatchMovement {
  id: number;
  assignmentId: number;
  latitude: number;
  longitude: number;
  recordedAt: string;
}

export async function recordMovement(args: {
  assignmentId: number;
  latitude: number;
  longitude: number;
}): Promise<MatchMovement> {
  const rows = await query<MatchMovement>(
    `INSERT INTO match_movements (assignment_id, role, latitude, longitude)
     VALUES ($1, 'responder', $2, $3)
     RETURNING id, assignment_id AS "assignmentId", latitude, longitude, recorded_at AS "recordedAt"`,
    [args.assignmentId, args.latitude, args.longitude]
  );

  return rows[0];
}

export async function listMovements(assignmentId: number, limit = 200): Promise<MatchMovement[]> {
  const rows = await query<MatchMovement>(
    `SELECT id, assignment_id AS "assignmentId", latitude, longitude, recorded_at AS "recordedAt"
     FROM match_movements
     WHERE assignment_id = $1
     ORDER BY recorded_at ASC
     LIMIT $2`,
    [assignmentId, limit]
  );

  return rows;
}
