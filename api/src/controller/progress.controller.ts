// ============================================
// src/controllers/progress.controller.ts
// ============================================

import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Connection } from 'mysql2';

export class ProgressController {
  constructor(private db: Connection, private io: any) {}

  getProgressByGroup = (req: AuthRequest, res: Response): void => {
    const { crn, group_id } = req.params;

    this.db.query(
      'SELECT * FROM Progress WHERE crn = ? AND group_id = ?',
      [crn, group_id],
      (err, results) => {
        if (err) {
          console.error('Error fetching group progress:', err);
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results);
      }
    );
  };

  getProgressByUser = (req: AuthRequest, res: Response): void => {
    const { email } = req.params;

    this.db.query(
      'SELECT * FROM Progress WHERE email = ?',
      [email],
      (err, results: any[]) => {
        if (err) {
          console.error('Error fetching user progress:', err);
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results[0] || null);
      }
    );
  };

  updateProgress = (req: AuthRequest, res: Response): void => {
    const { crn, group_id, step, email } = req.body;

    if (!crn || !group_id || !step || !email) {
      res.status(400).json({
        error: 'crn, group_id, step, and email are required'
      });
      return;
    }

    this.db.query(
      `INSERT INTO Progress (crn, group_id, step, email) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE step = VALUES(step)`,
      [crn, group_id, step, email],
      (err) => {
        if (err) {
          console.error('Error updating progress:', err);
          res.status(500).json({ error: err.message });
          return;
        }

        this.io.to(`group_${group_id}_class_${crn}`).emit('progressUpdated', {
          crn,
          group_id,
          step,
          email
        });
        this.io.emit('progressUpdated', {
          crn,
          group_id,
          step,
          email
        });
        console.log('Progress updated and event emitted', { crn, group_id, step, email });

        res.json({
          success: true,
          message: 'Progress updated successfully'
        });
      }
    );
  };
}
