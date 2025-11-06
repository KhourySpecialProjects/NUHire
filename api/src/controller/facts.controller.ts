// src/controllers/group.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Connection } from 'mysql2';

export class FactsController {
  constructor(private db: Connection, private io: any) {}

  getFacts = async (req: AuthRequest, res: Response): Promise<void> => {
    const { class_id } = req.params;

    try {
      const promiseDb = this.db.promise();
      const [factsResult] = await promiseDb.query(
        'SELECT one, two, three FROM `WaitingFacts` WHERE  class_id = ?',
        [class_id]
      ) as any[];

      if (factsResult.length === 0) {
        res.json([]);
        return;
      }
        res.json(factsResult[0]);
    } catch (error) {
        console.error('Error fetching facts:', error);
        res.status(500).json({ error: 'Failed to fetch facts' });
    }
  };
    
  newFacts = async (req: AuthRequest, res: Response): Promise<void> => {
    const { class_id } = req.params;
    const { one, two, three } = req.body;
    try {
        const promiseDb = this.db.promise();
        await promiseDb.query(
          'INSERT INTO `WaitingFacts` (class_id, one, two, three) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE one = ?, two = ?, three = ?',
          [class_id, one, two, three, one, two, three]
        );
        this.io.to(`class_${class_id}`).emit('factsUpdated');
        res.status(200).json({ message: 'Facts saved successfully' });
    } catch (error) {
        console.error('Error saving facts:', error);
        res.status(500).json({ error: 'Failed to save facts' });
    }
  };
}