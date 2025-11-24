
// ============================================
// src/controllers/csv.controller.ts
// ============================================

import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Pool } from 'mysql2';

export class CSVController {
  constructor(private db: Pool, private io: any) {}

  importCSV = (req: AuthRequest, res: Response): void => {
    console.log('=== POST /importCSV endpoint hit ===');
    console.log('Request body:', req.body);

    const { class_id, assignments } = req.body;

    if (!class_id || !assignments || !Array.isArray(assignments)) {
      console.log('❌ Validation failed: Missing class_id or assignments array');
      res.status(400).json({
        error: 'class_id and assignments array are required'
      });
      return;
    }

    if (assignments.length === 0) {
      console.log('❌ Validation failed: Empty assignments array');
      res.status(400).json({
        error: 'assignments array cannot be empty'
      });
      return;
    }

    console.log(`✅ Validation passed. Processing ${assignments.length} assignments for class ${class_id}`);

    const updatePromises = assignments.map((assignment: any) => {
      const { email, group_id } = assignment;

      if (!email || !group_id) {
        console.log(`⚠️ Skipping invalid assignment: email=${email}, group_id=${group_id}`);
        return Promise.resolve({ skipped: true, email, reason: 'Missing email or group_id' });
      }

      return new Promise((resolve, reject) => {
        const query = `
          INSERT INTO Users (email, class, group_id, affiliation) 
          VALUES (?, ?, ?, 'student')
          ON DUPLICATE KEY UPDATE 
            class = VALUES(class),
            group_id = VALUES(group_id)
        `;

        this.db.query(query, [email, class_id, group_id], (err, result: any) => {
          if (err) {
            console.error(`❌ Database error for ${email}:`, err);
            reject({ email, error: err.message });
          } else {
            console.log(`✅ Successfully processed ${email} -> Group ${group_id}`);
            resolve({
              email,
              group_id,
              action: result.insertId ? 'inserted' : 'updated',
              affectedRows: result.affectedRows
            });
          }
        });
      });
    });

    Promise.allSettled(updatePromises).then(results => {
      const successful: any[] = [];
      const failed: any[] = [];
      const skipped: any[] = [];

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          if ((result.value as any).skipped) {
            skipped.push(result.value);
          } else {
            successful.push(result.value);
          }
        } else {
          failed.push(result.reason);
        }
      });

      console.log(`📊 Import Results: ${successful.length} successful, ${failed.length} failed, ${skipped.length} skipped`);

      if (successful.length > 0) {
        this.io.to(`class_${class_id}`).emit('csvGroupsImported', {
          class_id,
          successful_count: successful.length,
          total_processed: assignments.length,
          message: `${successful.length} group assignments imported successfully`
        });
      }

      res.json({
        message: 'CSV import completed',
        class_id,
        total_assignments: assignments.length,
        successful: successful.length,
        failed: failed.length,
        skipped: skipped.length,
        results: {
          successful,
          failed,
          skipped
        }
      });
    });
  };
}