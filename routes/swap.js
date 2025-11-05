import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all swappable slots from other users
router.get('/swappable-slots', authMiddleware, (req, res) => {
  try {
    const slots = db.prepare(`
      SELECT e.*, u.name as owner_name, u.email as owner_email
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.status = 'SWAPPABLE' AND e.user_id != ?
      ORDER BY e.start_time ASC
    `).all(req.userId);

    res.json({ slots });
  } catch (error) {
    console.error('Get swappable slots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request a swap
router.post('/swap-request', authMiddleware, (req, res) => {
  try {
    const { mySlotId, theirSlotId } = req.body;

    if (!mySlotId || !theirSlotId) {
      return res.status(400).json({ error: 'Both mySlotId and theirSlotId are required' });
    }

    // Verify my slot exists and belongs to me and is SWAPPABLE
    const mySlot = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?').get(mySlotId, req.userId);
    if (!mySlot) {
      return res.status(404).json({ error: 'Your slot not found' });
    }
    if (mySlot.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: 'Your slot must be SWAPPABLE' });
    }

    // Verify their slot exists and is SWAPPABLE
    const theirSlot = db.prepare('SELECT * FROM events WHERE id = ?').get(theirSlotId);
    if (!theirSlot) {
      return res.status(404).json({ error: 'Requested slot not found' });
    }
    if (theirSlot.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: 'Requested slot must be SWAPPABLE' });
    }
    if (theirSlot.user_id === req.userId) {
      return res.status(400).json({ error: 'Cannot swap with your own slot' });
    }

    // Create swap request in a transaction
    const transaction = db.transaction(() => {
      // Create the swap request
      const result = db.prepare(`
        INSERT INTO swap_requests (requester_id, requester_slot_id, owner_id, owner_slot_id, status)
        VALUES (?, ?, ?, ?, 'PENDING')
      `).run(req.userId, mySlotId, theirSlot.user_id, theirSlotId);

      // Update both slots to SWAP_PENDING
      db.prepare('UPDATE events SET status = ? WHERE id = ?').run('SWAP_PENDING', mySlotId);
      db.prepare('UPDATE events SET status = ? WHERE id = ?').run('SWAP_PENDING', theirSlotId);

      return result.lastInsertRowid;
    });

    const swapRequestId = transaction();

    const swapRequest = db.prepare(`
      SELECT sr.*, 
             rs.title as requester_slot_title, rs.start_time as requester_start, rs.end_time as requester_end,
             os.title as owner_slot_title, os.start_time as owner_start, os.end_time as owner_end
      FROM swap_requests sr
      JOIN events rs ON sr.requester_slot_id = rs.id
      JOIN events os ON sr.owner_slot_id = os.id
      WHERE sr.id = ?
    `).get(swapRequestId);

    res.status(201).json({
      message: 'Swap request created successfully',
      swapRequest
    });
  } catch (error) {
    console.error('Swap request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to a swap request (accept or reject)
router.post('/swap-response/:requestId', authMiddleware, (req, res) => {
  try {
    const { requestId } = req.params;
    const { accept } = req.body;

    if (accept === undefined) {
      return res.status(400).json({ error: 'accept field is required (true/false)' });
    }

    // Get the swap request
    const swapRequest = db.prepare('SELECT * FROM swap_requests WHERE id = ?').get(requestId);
    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    // Verify the current user is the owner (recipient of the request)
    if (swapRequest.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to respond to this request' });
    }

    // Check if already responded
    if (swapRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Swap request already processed' });
    }

    if (accept) {
      // ACCEPT: Swap the owners and set status to BUSY
      const transaction = db.transaction(() => {
        // Get both slots
        const requesterSlot = db.prepare('SELECT * FROM events WHERE id = ?').get(swapRequest.requester_slot_id);
        const ownerSlot = db.prepare('SELECT * FROM events WHERE id = ?').get(swapRequest.owner_slot_id);

        // Swap the user_id (owners) of the two slots
        db.prepare('UPDATE events SET user_id = ?, status = ? WHERE id = ?').run(
          swapRequest.owner_id,
          'BUSY',
          swapRequest.requester_slot_id
        );
        db.prepare('UPDATE events SET user_id = ?, status = ? WHERE id = ?').run(
          swapRequest.requester_id,
          'BUSY',
          swapRequest.owner_slot_id
        );

        // Update swap request status
        db.prepare('UPDATE swap_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
          'ACCEPTED',
          requestId
        );
      });

      transaction();

      res.json({ message: 'Swap accepted successfully' });
    } else {
      // REJECT: Set both slots back to SWAPPABLE
      const transaction = db.transaction(() => {
        db.prepare('UPDATE events SET status = ? WHERE id = ?').run(
          'SWAPPABLE',
          swapRequest.requester_slot_id
        );
        db.prepare('UPDATE events SET status = ? WHERE id = ?').run(
          'SWAPPABLE',
          swapRequest.owner_slot_id
        );

        db.prepare('UPDATE swap_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
          'REJECTED',
          requestId
        );
      });

      transaction();

      res.json({ message: 'Swap rejected successfully' });
    }
  } catch (error) {
    console.error('Swap response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get incoming swap requests (requests where I'm the owner)
router.get('/swap-requests/incoming', authMiddleware, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT sr.*,
             u.name as requester_name, u.email as requester_email,
             rs.title as requester_slot_title, rs.start_time as requester_start, rs.end_time as requester_end,
             os.title as owner_slot_title, os.start_time as owner_start, os.end_time as owner_end
      FROM swap_requests sr
      JOIN users u ON sr.requester_id = u.id
      JOIN events rs ON sr.requester_slot_id = rs.id
      JOIN events os ON sr.owner_slot_id = os.id
      WHERE sr.owner_id = ?
      ORDER BY sr.created_at DESC
    `).all(req.userId);

    res.json({ requests });
  } catch (error) {
    console.error('Get incoming requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get outgoing swap requests (requests I initiated)
router.get('/swap-requests/outgoing', authMiddleware, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT sr.*,
             u.name as owner_name, u.email as owner_email,
             rs.title as requester_slot_title, rs.start_time as requester_start, rs.end_time as requester_end,
             os.title as owner_slot_title, os.start_time as owner_start, os.end_time as owner_end
      FROM swap_requests sr
      JOIN users u ON sr.owner_id = u.id
      JOIN events rs ON sr.requester_slot_id = rs.id
      JOIN events os ON sr.owner_slot_id = os.id
      WHERE sr.requester_id = ?
      ORDER BY sr.created_at DESC
    `).all(req.userId);

    res.json({ requests });
  } catch (error) {
    console.error('Get outgoing requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
