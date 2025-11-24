// ============================================
// src/controllers/candidate.controller.ts
// ============================================

import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Pool } from 'mysql2';

export class CandidateController {
  constructor(private db: Pool) {}

  getCandidatesByGroups = (req: AuthRequest, res: Response): void => {
    const { classId, groupIds } = req.params;
    const groupIdArray = groupIds.split(',');

    console.log(`Fetching candidates being interviewed by groups ${groupIds} in class ${classId}`);

    const placeholders = groupIdArray.map(() => '?').join(',');

    const query = `
      SELECT DISTINCT 
        c.resume_id as id, 
        c.f_name, 
        c.l_name, 
        c.resume_id,
        r.title
      FROM Candidates c
      INNER JOIN Resume_pdfs r ON c.resume_id = r.id
      INNER JOIN Resume res ON res.resume_number = c.resume_id
      INNER JOIN Users u ON res.student_id = u.id
      WHERE u.class = ? 
        AND u.group_id IN (${placeholders})
        AND res.checked = 1
      ORDER BY c.f_name, c.l_name
    `;

    const params = [classId, ...groupIdArray];

    this.db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error fetching candidates by groups:', err);
        res.status(500).json({ error: 'Failed to fetch candidates' });
        return;
      }

      console.log(`Found ${(results as any[]).length} candidates being interviewed by groups ${groupIds} in class ${classId}`);
      res.json(results);
    });
  };

  getCandidatesByClass = (req: AuthRequest, res: Response): void => {
    const { classId } = req.params;

    console.log(`Fetching candidates for class ${classId}`);

    const query = `
      SELECT DISTINCT 
        c.resume_id as id, 
        c.f_name, 
        c.l_name, 
        c.resume_id,
        r.title
      FROM Candidates c
      INNER JOIN Resume_pdfs r ON c.resume_id = r.id
      INNER JOIN Resume res ON res.resume_number = c.resume_id
      INNER JOIN Users u ON res.student_id = u.id
      WHERE u.class = ?
      ORDER BY c.f_name, c.l_name
    `;

    this.db.query(query, [classId], (err, results) => {
      if (err) {
        console.error('Error fetching candidates by class:', err);
        res.status(500).json({ error: 'Failed to fetch candidates' });
        return;
      }

      console.log(`Found ${(results as any[]).length} candidates for class ${classId}`);
      res.json(results);
    });
  };

  getAllCandidates = (req: AuthRequest, res: Response): void => {
    this.db.query('SELECT * FROM Candidates', (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  };

  getCandidateById = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;
    this.db.query('SELECT * FROM Candidates WHERE id = ?', [id], (err, results: any[]) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results[0]);
    });
  };

  getCandidateByResumeNumber = (req: AuthRequest, res: Response): void => {
    const { resume_number } = req.params;
    this.db.query('SELECT * FROM Candidates WHERE resume_id = ?', [resume_number], (err, results: any[]) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results[0]);
    });
  };
}