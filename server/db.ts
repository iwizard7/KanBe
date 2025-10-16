// Reference: javascript_database blueprint
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

const sqlite = new Database('./data/kanbe.db');
export const db = drizzle({ client: sqlite, schema });
