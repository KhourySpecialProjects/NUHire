
import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Connection } from 'mysql2';

export class NoteController {
  constructor(private db: Pool) {}

  getNotes = (req: AuthRequest, res: Response): void => {
    const userEmail = req.query.user_email;
    if (!userEmail) {
      res.status(400).json({ error: 'user_email query parameter is required' });
      return;
    }
    this.db.query('SELECT * FROM Notes WHERE user_email = ? ORDER BY created_at DESC', [userEmail], (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  };

  createNote = (req: AuthRequest, res: Response): void => {
    const { user_email, content } = req.body;

    if (!user_email || !content) {
      res.status(400).json({ error: 'Email and note content are required' });
      return;
    }

    this.db.query(
      'INSERT INTO Notes (user_email, content, created_at) VALUES (?, ?, NOW())',
      [user_email, content],
      (err, result: any) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.status(200).json({ content, id: result.insertId });
      }
    );
  };
}