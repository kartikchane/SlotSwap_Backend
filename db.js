import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'slotswapper.db'));
db.pragma('journal_mode = WAL');

// Initialize database schema
const initDB = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Events (slots) table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT CHECK(status IN ('BUSY', 'SWAPPABLE', 'SWAP_PENDING')) DEFAULT 'BUSY',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Swap requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS swap_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      requester_slot_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      owner_slot_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')) DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_slot_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_slot_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialized successfully');
};

initDB();

export default db;
