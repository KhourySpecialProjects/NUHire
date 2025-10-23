
// ============================================
// src/controllers/moderator.controller.ts
// ============================================

import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Connection } from 'mysql2';

export class ModeratorController {
  constructor(private db: Connection) {}

  addModeratorCRN = (req: AuthRequest, res: Response): void => {
    const { admin_email, crn } = req.body;
    if (!admin_email || !crn) {
      res.status(400).json({ error: 'admin_email and crn are required' });
      return;
    }
    this.db.query(
      'INSERT INTO Moderator (admin_email, crn) VALUES (?, ?)',
      [admin_email, crn],
      (err, result: any) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'CRN already exists' });
            return;
          }
          res.status(500).json({ error: err.message });
          return;
        }
        res.status(201).json({ admin_email, crn });
      }
    );
  };

  getAllModeratorCRNs = (req: AuthRequest, res: Response): void => {
    this.db.query('SELECT * FROM Moderator', (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  };

  deleteModeratorCRN = (req: AuthRequest, res: Response): void => {
    const { crn } = req.params;
    this.db.query('DELETE FROM Moderator WHERE crn = ?', [crn], (err, result: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'CRN not found' });
        return;
      }
      res.json({ success: true });
    });
  };

  getModeratorCRN = (req: AuthRequest, res: Response): void => {
    const { crn } = req.params;
    this.db.query('SELECT * FROM Moderator WHERE crn = ?', [crn], (err, results: any[]) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results[0]);
    });
  };

  getModeratorClasses = (req: AuthRequest, res: Response): void => {
    const { email } = req.params;
    this.db.query(
      'SELECT crn FROM Moderator WHERE admin_email = ?',
      [email],
      (err, results: any[]) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results.map(row => row.crn));
      }
    );
  };

  getModeratorClassesFull = (req: AuthRequest, res: Response): void => {
    const { email } = req.params;
    this.db.query(
      'SELECT * FROM Moderator WHERE admin_email = ?',
      [email],
      (err, results) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results);
      }
    );
  };

  updateGroups = (req: AuthRequest, res: Response): void => {
    const { crn, nom_groups } = req.body;

    if (!crn || !nom_groups) {
      res.status(400).json({ error: 'crn and nom_groups are required' });
      return;
    }

    this.db.query('SELECT COUNT(*) as group_count FROM `GroupsInfo` WHERE class_id = ?', [crn], (err, result: any[]) => {
      if (err) {
        res.status(500).json({ error: 'Failed to check existing groups' });
        return;
      }

      const existingGroupCount = result[0].group_count;

      if (existingGroupCount > 0) {
        res.status(400).json({
          error: 'Groups already exist for this class. Cannot update group count after groups have been created.',
          existing_groups: existingGroupCount,
          crn: crn
        });
        return;
      }

      this.db.query(
        'UPDATE Moderator SET nom_groups = ? WHERE crn = ?',
        [nom_groups, crn],
        (err, result: any) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          if (result.affectedRows === 0) {
            res.status(404).json({ error: 'CRN not found' });
            return;
          }

          res.json({
            success: true,
            crn,
            nom_groups,
            message: `Group count updated to ${nom_groups} for CRN ${crn}`
          });
        }
      );
    });
  };

  addStudent = (req: AuthRequest, res: Response): void => {
    const { class_id, group_id, email, f_name, l_name } = req.body;
    this.db.query(
      "INSERT INTO Users (email, f_name, l_name, class, group_id, affiliation) VALUES (?, ?, ?, ?, ?, 'student') ON DUPLICATE KEY UPDATE group_id = ?, class = ?, f_name = ?, l_name = ?",
      [email, f_name, l_name, class_id, group_id, group_id, class_id, f_name, l_name],
      (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ success: true });
      }
    );
  };

  deleteStudent = (req: AuthRequest, res: Response): void => {
    const { email } = req.body;
    this.db.query('DELETE FROM Users WHERE email = ?', [email], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    });
  };
}
