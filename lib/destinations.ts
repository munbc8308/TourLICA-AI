import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebaseClient';

export interface Destination {
  id: string;
  city: string;
  country: string;
  summary: string;
  best_season: string;
  highlights: string;
}

export async function getDestinations(): Promise<Destination[]> {
  const snapshot = await getDocs(collection(db, 'destinations'));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Destination, 'id'>) }));
}
