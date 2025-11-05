import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all events for the logged-in user
router.get('/events', authMiddleware, (req, res) => {
  try {
    const events = db.prepare(
      'SELECT * FROM events WHERE user_id = ? ORDER BY start_time ASC'
    ).all(req.userId);

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new event
router.post('/events', authMiddleware, (req, res) => {
  try {
    const { title, startTime, endTime, status } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, startTime, and endTime are required' });
    }

    const eventStatus = status || 'BUSY';
    if (!['BUSY', 'SWAPPABLE', 'SWAP_PENDING'].includes(eventStatus)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = db.prepare(
      'INSERT INTO events (user_id, title, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)'
    ).run(req.userId, title, startTime, endTime, eventStatus);

    const newEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an event
router.put('/events/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { title, startTime, endTime, status } = req.body;

    // Check if event exists and belongs to user
    const event = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?').get(id, req.userId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event is in SWAP_PENDING status
    if (event.status === 'SWAP_PENDING') {
      return res.status(400).json({ error: 'Cannot modify event with pending swap' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (startTime !== undefined) updates.start_time = startTime;
    if (endTime !== undefined) updates.end_time = endTime;
    if (status !== undefined) {
      if (!['BUSY', 'SWAPPABLE'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    db.prepare(`UPDATE events SET ${setClauses} WHERE id = ? AND user_id = ?`).run(
      ...values,
      id,
      req.userId
    );

    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(id);

    res.json({ message: 'Event updated successfully', event: updatedEvent });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an event
router.delete('/events/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    const event = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?').get(id, req.userId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status === 'SWAP_PENDING') {
      return res.status(400).json({ error: 'Cannot delete event with pending swap' });
    }

    db.prepare('DELETE FROM events WHERE id = ? AND user_id = ?').run(id, req.userId);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
