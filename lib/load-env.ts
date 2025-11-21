import path from 'node:path';
import { config } from 'dotenv';

let envLoaded = false;

export function ensureEnvLoaded() {
  if (envLoaded) return;

  config({ path: path.resolve(process.cwd(), '.env') });
  config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
  config({ path: path.resolve(process.cwd(), '.env.production'), override: true });
  envLoaded = true;
}
