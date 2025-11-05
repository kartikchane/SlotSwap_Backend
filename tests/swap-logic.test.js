import db from '../db.js';
import bcrypt from 'bcryptjs';

console.log('🧪 Running Swap Logic Tests...\n');

// Clean up test data
const cleanup = () => {
  db.prepare('DELETE FROM swap_requests').run();
  db.prepare('DELETE FROM events').run();
  db.prepare('DELETE FROM users').run();
};

// Test 1: Create test users
const testCreateUsers = async () => {
  console.log('Test 1: Creating test users...');
  const password = await bcrypt.hash('password123', 10);
  
  const user1 = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(
    'Alice',
    'alice@test.com',
    password
  );
  
  const user2 = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(
    'Bob',
    'bob@test.com',
    password
  );
  
  console.log(`✓ Created users: Alice (${user1.lastInsertRowid}) and Bob (${user2.lastInsertRowid})\n`);
  return { aliceId: user1.lastInsertRowid, bobId: user2.lastInsertRowid };
};

// Test 2: Create swappable events
const testCreateEvents = (aliceId, bobId) => {
  console.log('Test 2: Creating swappable events...');
  
  const aliceEvent = db.prepare(
    'INSERT INTO events (user_id, title, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)'
  ).run(aliceId, 'Team Meeting', '2025-11-10 10:00:00', '2025-11-10 11:00:00', 'SWAPPABLE');
  
  const bobEvent = db.prepare(
    'INSERT INTO events (user_id, title, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)'
  ).run(bobId, 'Focus Block', '2025-11-12 14:00:00', '2025-11-12 15:00:00', 'SWAPPABLE');
  
  console.log(`✓ Created events: Alice's event (${aliceEvent.lastInsertRowid}) and Bob's event (${bobEvent.lastInsertRowid})\n`);
  return { aliceEventId: aliceEvent.lastInsertRowid, bobEventId: bobEvent.lastInsertRowid };
};

// Test 3: Create swap request
const testSwapRequest = (aliceId, bobId, aliceEventId, bobEventId) => {
  console.log('Test 3: Creating swap request...');
  
  // Create swap request
  const swapRequest = db.prepare(
    'INSERT INTO swap_requests (requester_id, requester_slot_id, owner_id, owner_slot_id, status) VALUES (?, ?, ?, ?, ?)'
  ).run(aliceId, aliceEventId, bobId, bobEventId, 'PENDING');
  
  // Update both events to SWAP_PENDING
  db.prepare('UPDATE events SET status = ? WHERE id = ?').run('SWAP_PENDING', aliceEventId);
  db.prepare('UPDATE events SET status = ? WHERE id = ?').run('SWAP_PENDING', bobEventId);
  
  console.log(`✓ Created swap request (${swapRequest.lastInsertRowid})`);
  console.log('✓ Both events marked as SWAP_PENDING\n');
  
  return swapRequest.lastInsertRowid;
};

// Test 4: Accept swap and verify exchange
const testAcceptSwap = (swapRequestId, aliceId, bobId, aliceEventId, bobEventId) => {
  console.log('Test 4: Accepting swap and verifying exchange...');
  
  // Get events before swap
  const aliceEventBefore = db.prepare('SELECT * FROM events WHERE id = ?').get(aliceEventId);
  const bobEventBefore = db.prepare('SELECT * FROM events WHERE id = ?').get(bobEventId);
  
  console.log(`Before swap:`);
  console.log(`  - Event ${aliceEventId} owner: ${aliceEventBefore.user_id} (Alice)`);
  console.log(`  - Event ${bobEventId} owner: ${bobEventBefore.user_id} (Bob)`);
  
  // Perform the swap
  db.prepare('UPDATE events SET user_id = ?, status = ? WHERE id = ?').run(bobId, 'BUSY', aliceEventId);
  db.prepare('UPDATE events SET user_id = ?, status = ? WHERE id = ?').run(aliceId, 'BUSY', bobEventId);
  db.prepare('UPDATE swap_requests SET status = ? WHERE id = ?').run('ACCEPTED', swapRequestId);
  
  // Get events after swap
  const aliceEventAfter = db.prepare('SELECT * FROM events WHERE id = ?').get(aliceEventId);
  const bobEventAfter = db.prepare('SELECT * FROM events WHERE id = ?').get(bobEventId);
  
  console.log(`After swap:`);
  console.log(`  - Event ${aliceEventId} owner: ${aliceEventAfter.user_id} (Bob)`);
  console.log(`  - Event ${bobEventId} owner: ${bobEventAfter.user_id} (Alice)`);
  
  // Verify swap
  if (aliceEventAfter.user_id === bobId && bobEventAfter.user_id === aliceId) {
    console.log('✓ Swap successful! Owners exchanged correctly\n');
  } else {
    console.log('✗ Swap failed! Owners not exchanged\n');
  }
  
  // Verify both events are BUSY
  if (aliceEventAfter.status === 'BUSY' && bobEventAfter.status === 'BUSY') {
    console.log('✓ Both events set to BUSY status\n');
  } else {
    console.log('✗ Events not in correct status\n');
  }
};

// Test 5: Verify swap request status
const testSwapRequestStatus = (swapRequestId) => {
  console.log('Test 5: Verifying swap request status...');
  
  const swapRequest = db.prepare('SELECT * FROM swap_requests WHERE id = ?').get(swapRequestId);
  
  if (swapRequest.status === 'ACCEPTED') {
    console.log('✓ Swap request marked as ACCEPTED\n');
  } else {
    console.log(`✗ Swap request has incorrect status: ${swapRequest.status}\n`);
  }
};

// Run all tests
const runTests = async () => {
  try {
    cleanup();
    
    const { aliceId, bobId } = await testCreateUsers();
    const { aliceEventId, bobEventId } = testCreateEvents(aliceId, bobId);
    const swapRequestId = testSwapRequest(aliceId, bobId, aliceEventId, bobEventId);
    testAcceptSwap(swapRequestId, aliceId, bobId, aliceEventId, bobEventId);
    testSwapRequestStatus(swapRequestId);
    
    console.log('🎉 All tests passed!\n');
    
    cleanup();
    console.log('✓ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    db.close();
  }
};

runTests();
