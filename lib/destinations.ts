import { queryAll } from './db';

export interface Destination {
  id: number;
  city: string;
  country: string;
  summary: string;
  best_season: string;
  highlights: string;
}

export async function getDestinations(limit?: number): Promise<Destination[]> {
  const sql = `SELECT id, city, country, summary, best_season, highlights FROM destinations ORDER BY id ASC${
    limit ? ' LIMIT ?' : ''
  }`;
  const params = limit ? [limit] : [];
  return queryAll<Destination>(sql, params);
}

export async function getDestinationById(id: number): Promise<Destination | undefined> {
  const rows = await queryAll<Destination>('SELECT * FROM destinations WHERE id = ?', [id]);
  return rows[0];
}
