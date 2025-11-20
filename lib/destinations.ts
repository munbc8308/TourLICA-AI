import { query } from './db';

export interface Destination {
  id: number;
  city: string;
  country: string;
  summary: string;
  best_season: string;
  highlights: string;
}

export async function getDestinations(): Promise<Destination[]> {
  return query<Destination>(
    'SELECT id, city, country, summary, best_season, highlights FROM destinations ORDER BY id LIMIT 3'
  );
}
