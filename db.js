// In-memory database for Vercel deployment
// Note: Data will be lost on each cold start - use external DB for production

let users = [];
let events = [];
let swapRequests = [];
let userIdCounter = 1;
let eventIdCounter = 1;
let swapIdCounter = 1;

// Mock database object to match better-sqlite3 API
const db = {
  prepare: (sql) => {
    return {
      run: (...params) => {
        // Handle INSERT statements
        if (sql.includes('INSERT INTO users')) {
          const id = userIdCounter++;
          users.push({ id, name: params[0], email: params[1], password: params[2], created_at: new Date().toISOString() });
          return { lastInsertRowid: id };
        }
        if (sql.includes('INSERT INTO events')) {
          const id = eventIdCounter++;
          events.push({ 
            id, 
            user_id: params[0], 
            title: params[1], 
            start_time: params[2], 
            end_time: params[3], 
            status: params[4] || 'BUSY',
            created_at: new Date().toISOString() 
          });
          return { lastInsertRowid: id };
        }
        if (sql.includes('INSERT INTO swap_requests')) {
          const id = swapIdCounter++;
          swapRequests.push({
            id,
            requester_id: params[0],
            requester_slot_id: params[1],
            owner_id: params[2],
            owner_slot_id: params[3],
            status: params[4] || 'PENDING',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          return { lastInsertRowid: id };
        }
        // Handle UPDATE statements
        if (sql.includes('UPDATE events')) {
          if (sql.includes('SET status')) {
            const status = params[0];
            const id = params[1];
            const event = events.find(e => e.id === id);
            if (event) event.status = status;
          }
          if (sql.includes('SET user_id')) {
            const userId = params[0];
            const status = params[1];
            const id = params[2];
            const event = events.find(e => e.id === id);
            if (event) {
              event.user_id = userId;
              event.status = status;
            }
          }
          return { changes: 1 };
        }
        if (sql.includes('UPDATE swap_requests')) {
          const status = params[0];
          const id = params[1];
          const request = swapRequests.find(r => r.id === id);
          if (request) {
            request.status = status;
            request.updated_at = new Date().toISOString();
          }
          return { changes: 1 };
        }
        // Handle DELETE statements
        if (sql.includes('DELETE FROM events')) {
          const id = params[0];
          const index = events.findIndex(e => e.id === id);
          if (index !== -1) events.splice(index, 1);
          return { changes: 1 };
        }
        return { changes: 0 };
      },
      get: (...params) => {
        // Handle SELECT for users
        if (sql.includes('SELECT * FROM users WHERE email')) {
          return users.find(u => u.email === params[0]);
        }
        if (sql.includes('SELECT * FROM users WHERE id')) {
          return users.find(u => u.id === params[0]);
        }
        // Handle SELECT for events
        if (sql.includes('SELECT * FROM events WHERE id')) {
          if (sql.includes('AND user_id')) {
            return events.find(e => e.id === params[0] && e.user_id === params[1]);
          }
          return events.find(e => e.id === params[0]);
        }
        // Handle SELECT for swap_requests
        if (sql.includes('SELECT * FROM swap_requests WHERE id')) {
          return swapRequests.find(r => r.id === params[0]);
        }
        return null;
      },
      all: (...params) => {
        // Handle SELECT for events
        if (sql.includes('FROM events') && sql.includes('WHERE user_id')) {
          return events.filter(e => e.user_id === params[0]);
        }
        // Handle SELECT for swappable slots
        if (sql.includes('FROM events e') && sql.includes('JOIN users u')) {
          return events
            .filter(e => e.status === 'SWAPPABLE' && e.user_id !== params[0])
            .map(e => {
              const user = users.find(u => u.id === e.user_id);
              return { ...e, owner_name: user?.name, owner_email: user?.email };
            });
        }
        // Handle SELECT for swap requests
        if (sql.includes('FROM swap_requests sr') && sql.includes('JOIN users u')) {
          if (sql.includes('WHERE sr.owner_id')) {
            return swapRequests
              .filter(r => r.owner_id === params[0])
              .map(r => {
                const requester = users.find(u => u.id === r.requester_id);
                const requesterSlot = events.find(e => e.id === r.requester_slot_id);
                const ownerSlot = events.find(e => e.id === r.owner_slot_id);
                return {
                  ...r,
                  requester_name: requester?.name,
                  requester_email: requester?.email,
                  requester_slot_title: requesterSlot?.title,
                  requester_start: requesterSlot?.start_time,
                  requester_end: requesterSlot?.end_time,
                  owner_slot_title: ownerSlot?.title,
                  owner_start: ownerSlot?.start_time,
                  owner_end: ownerSlot?.end_time
                };
              });
          }
          if (sql.includes('WHERE sr.requester_id')) {
            return swapRequests
              .filter(r => r.requester_id === params[0])
              .map(r => {
                const owner = users.find(u => u.id === r.owner_id);
                const requesterSlot = events.find(e => e.id === r.requester_slot_id);
                const ownerSlot = events.find(e => e.id === r.owner_slot_id);
                return {
                  ...r,
                  owner_name: owner?.name,
                  owner_email: owner?.email,
                  requester_slot_title: requesterSlot?.title,
                  requester_start: requesterSlot?.start_time,
                  requester_end: requesterSlot?.end_time,
                  owner_slot_title: ownerSlot?.title,
                  owner_start: ownerSlot?.start_time,
                  owner_end: ownerSlot?.end_time
                };
              });
          }
        }
        return [];
      }
    };
  },
  transaction: (fn) => {
    return () => fn();
  }
};

console.log('In-memory database initialized successfully');
console.log('⚠️ WARNING: Using in-memory storage - data will be lost on restart');

export default db;
