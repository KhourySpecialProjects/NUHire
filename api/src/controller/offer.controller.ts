// ============================================
// src/controllers/offer.controller.ts
// ============================================

import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Connection } from 'mysql2';

export class OfferController {
  constructor(private db: Pool) {}

  createOffer = (req: AuthRequest, res: Response): void => {
    const { group_id, class_id, candidate_id, status } = req.body;

    console.log('Creating new offer:', { group_id, class_id, candidate_id, status });

    this.db.query(
      'INSERT INTO Offers (group_id, class_id, candidate_id, status) VALUES (?, ?, ?, ?)',
      [group_id, class_id, candidate_id, status],
      (err, result: any) => {
        if (err) {
          console.error('Error creating offer:', err);
          res.status(500).json({ error: err.message });
          return;
        }

        console.log('Offer created successfully:', result.insertId);
        res.json({
          id: result.insertId,
          message: 'Offer submitted successfully',
          offer_id: result.insertId
        });
      }
    );
  };

  getOffersByGroupAndClass = (req: AuthRequest, res: Response): void => {
    const { group_id, class_id } = req.params;

    console.log('Fetching pending offers for class:', class_id);

    const query = `SELECT * FROM Offers WHERE class_id = ? AND group_id = ?`;

    this.db.query(query, [class_id, group_id], (err, results) => {
      if (err) {
        console.error('Error fetching pending offers:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      res.json(results);
    });
  };

  getOffersByClass = (req: AuthRequest, res: Response): void => {
    const { class_id } = req.params;

    console.log('Fetching pending offers for class:', class_id);

    const query = `SELECT * FROM Offers WHERE class_id = ?`;

    this.db.query(query, [class_id], (err, results) => {
      if (err) {
        console.error('Error fetching pending offers:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      console.log(`Found ${(results as any[]).length} pending offers for class ${class_id}`);
      res.json(results);
    });
  };

  updateOffer = (req: AuthRequest, res: Response): void => {
    const { offer_id } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      res.status(400).json({ error: "Status must be 'accepted' or 'rejected'" });
      return;
    }

    this.db.query(
      `UPDATE Offers SET status = ? WHERE id = ?`,
      [status, offer_id],
      (err, result: any) => {
        if (err) {
          console.error('Error updating offer:', err);
          res.status(500).json({ error: err.message });
          return;
        }

        if (result.affectedRows === 0) {
          res.status(404).json({ error: 'Offer not found' });
          return;
        }

        console.log('Offer updated successfully');
        res.json({ message: 'Offer updated successfully' });
      }
    );
  };
}