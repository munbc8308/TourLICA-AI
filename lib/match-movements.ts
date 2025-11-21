import 'server-only';
import { query } from './db';

export interface MatchMovement {
  id: number;
  assignmentId: number;
  role: 'tourist' | 'interpreter' | 'helper';
  latitude: number;
  longitude: number;
  recordedAt: string;
}

export async function recordMovement(args: {
  assignmentId: number;
  role: 'tourist' | 'interpreter' | 'helper';
  latitude: number;
  longitude: number;
}): Promise<MatchMovement> {
  const rows = await query<MatchMovement>(
    `INSERT INTO match_movements (assignment_id, role, latitude, longitude)
     VALUES ($1, $2, $3, $4)
     RETURNING id, assignment_id AS "assignmentId", role, latitude, longitude, recorded_at AS "recordedAt"`,
    [args.assignmentId, args.role, args.latitude, args.longitude]
  );

  return rows[0];
}

export async function listMovements(assignmentId: number, limit = 200): Promise<MatchMovement[]> {
  const rows = await query<MatchMovement>(
    `SELECT id, assignment_id AS "assignmentId", role, latitude, longitude, recorded_at AS "recordedAt"
     FROM match_movements
     WHERE assignment_id = $1
     ORDER BY recorded_at ASC
     LIMIT $2`,
    [assignmentId, limit]
  );

  return rows;
}
