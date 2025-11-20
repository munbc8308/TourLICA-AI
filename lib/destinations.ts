import { getDb } from './firebaseAdmin';

export interface Destination {
  id: string;
  city: string;
  country: string;
  summary: string;
  best_season: string;
  highlights: string;
}

export async function getDestinations(): Promise<Destination[]> {
  const firestore = getDb();
  const snapshot = await firestore.collection('destinations').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Destination, 'id'>) }));
}
