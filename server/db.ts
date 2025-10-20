// Reference: javascript_database blueprint
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// Raspberry Pi optimizations for SQLite
const dbPath = './data/kanbe.db';
const isRaspberryPi = process.env.PLATFORM === 'raspberry-pi';

// Database configuration optimized for Raspberry Pi
const dbConfig = {
  // Enable WAL mode for better performance on SD cards
  journal_mode: 'WAL',
  // Increase busy timeout for Raspberry Pi's slower I/O
  busy_timeout: isRaspberryPi ? 30000 : 5000,
  // Cache size: negative values mean KB, positive mean pages
  cache_size: isRaspberryPi ? -2000 : -64000, // 2MB for RPi, 64MB for others
  // Synchronous mode: NORMAL for better performance, FULL for safety
  synchronous: isRaspberryPi ? 'NORMAL' : 'FULL',
  // Temp store in memory for better performance
  temp_store: 'memory',
  // Mmap size for better memory usage
  mmap_size: isRaspberryPi ? 268435456 : 1073741824, // 256MB for RPi, 1GB for others
};

const sqlite = new Database(dbPath);

// Apply optimizations
for (const [pragma, value] of Object.entries(dbConfig)) {
  try {
    sqlite.pragma(`${pragma} = ${value}`);
  } catch (error) {
    console.warn(`Failed to set SQLite pragma ${pragma}=${value}:`, (error as Error).message);
  }
}

// Raspberry Pi specific optimizations
if (isRaspberryPi) {
  console.log('🔧 Applying Raspberry Pi database optimizations...');

  // Additional optimizations for slow storage
  sqlite.pragma('wal_autocheckpoint = 1000'); // Checkpoint WAL every 1000 pages
  sqlite.pragma('wal_checkpoint(TRUNCATE)'); // Force checkpoint on startup

  // Optimize for concurrent reads
  sqlite.pragma('read_uncommitted = true');

  console.log('✅ Raspberry Pi database optimizations applied');
}

export const db = drizzle({ client: sqlite, schema });
