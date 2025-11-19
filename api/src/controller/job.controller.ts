// ============================================
// src/controllers/job.controller.ts
// ============================================

import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Connection } from 'mysql2';
import fs from 'fs';
import path from 'path';

export class JobController {
  constructor(private db: Connection, private io: any, private onlineStudents: Record<string, string>) {}

  getAllJobs = (req: AuthRequest, res: Response): void => {
    const { class_id } = req.query; // Get class_id from query params
    
    if (!class_id) {
      res.status(400).json({ error: 'class_id is required' });
      return;
    }
    
    this.db.query(
      'SELECT * FROM job_descriptions WHERE class_id = ?', 
      [class_id], 
      (err, results) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results);
      }
    );
  };

  createJob = async (req: AuthRequest, res: Response): Promise<void> => {
    const { title, filePath, class_id } = req.body; // Add class_id

    if (!title || !filePath || !class_id) {
      res.status(400).json({ error: 'Missing title, filePath, or class_id' });
      return;
    }

    try {
      const sql = 'INSERT INTO job_descriptions (title, file_path, class_id) VALUES (?, ?, ?)';
      this.db.query(sql, [title, filePath, class_id], (err) => {
        if (err) {
          console.error('Error inserting into DB:', err);
          res.status(500).json({ error: 'Database error' });
          return;
        }
        res.json({ message: 'Job description added successfully!' });
      });
    } catch (error) {
      console.error('Error inserting into DB:', error);
      res.status(500).json({ error: 'Database error' });
    }
  };

  getJobByTitle = (req: AuthRequest, res: Response): void => {
    const { title, class_id } = req.query; // Add class_id

    if (!title || !class_id) {
      res.status(400).json({ error: 'Title and class_id are required' });
      return;
    }

    this.db.query(
      'SELECT * FROM job_descriptions WHERE title = ? AND class_id = ?', 
      [title, class_id], 
      (err, results: any[]) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        if (results.length === 0) {
          res.status(404).json({ error: 'Job description not found' });
          return;
        }

        res.json(results[0]);
      }
    );
  };

  deleteJobFile = (req: AuthRequest, res: Response): void => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, '../../uploads/jobdescription', fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      this.db.query('DELETE FROM job_descriptions WHERE file_path = ?', [`uploads/jobdescription/${fileName}`], (err) => {
        if (err) {
          console.error('Database deletion error:', err);
          res.status(500).json({ error: 'Database deletion failed' });
          return;
        }
        res.json({ message: `File "${fileName}" deleted successfully.` });
      });
    } else {
      res.status(404).send(`File "${fileName}" not found.`);
    }
  };

  updateJob = async (req: AuthRequest, res: Response): Promise<void> => {
    const { job_group_id, class_id, job } = req.body;

    if (!job_group_id || !class_id || !job || job.length === 0) {
      res.status(400).json({ error: 'Group ID, class ID, and job are required.' });
      return;
    }

    const groupIdInt = parseInt(job_group_id);
    if (isNaN(groupIdInt) || groupIdInt <= 0) {
      console.log('❌ Invalid job_group_id:', job_group_id);
      res.status(400).json({ error: 'job_group_id must be a valid positive integer.' });
      return;
    }

    const classIdInt = parseInt(class_id);
    if (isNaN(classIdInt) || classIdInt <= 0) {
      console.log('❌ Invalid class_id:', class_id);
      res.status(400).json({ error: 'class_id must be a valid positive integer.' });
      return;
    }

    console.log('Updating job for group:', { job_group_id: groupIdInt, class_id: classIdInt, job });

    try {
      const promiseDb = this.db.promise();
      await promiseDb.query('START TRANSACTION');

      const jobTitle = Array.isArray(job) ? job[0] : job;
      await promiseDb.query(
        `INSERT INTO Job_Assignment (\`group\`, \`class\`, job)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE job = VALUES(job)`,
        [job_group_id, class_id, jobTitle]
      );

      await promiseDb.query(
        "UPDATE Users SET `current_page` = 'jobdes' WHERE group_id = ? AND class = ? AND affiliation = 'student'",
        [job_group_id, class_id]
      );

      await promiseDb.query(
        "UPDATE Progress SET step = 'job_description' WHERE crn = ? AND group_id = ?",
        [class_id, job_group_id]
      );

      await promiseDb.query('DELETE FROM InterviewPage WHERE class = ? AND group_id = ?', [class_id, job_group_id]);
      await promiseDb.query('DELETE FROM MakeOfferPage WHERE class = ? AND group_id = ?', [class_id, job_group_id]);
      await promiseDb.query('DELETE FROM Resume WHERE class = ? AND group_id = ?', [class_id, job_group_id]);
      await promiseDb.query('DELETE FROM Resumepage2 WHERE class = ? AND group_id = ?', [class_id, job_group_id]);
      await promiseDb.query('DELETE FROM Offer_Status WHERE class = ? AND group_id = ?', [class_id, job_group_id]);
      await promiseDb.query('DELETE FROM Interview_Status WHERE class = ? AND group_id = ?', [class_id, job_group_id]);
      await promiseDb.query('DELETE FROM InterviewPopup WHERE class = ? AND group_id = ?', [class_id, job_group_id]);

      const [students] = await promiseDb.query(
        "SELECT email FROM Users WHERE group_id = ? AND class = ? AND affiliation = 'student'",
        [job_group_id, class_id]
      ) as any[];

      const emails = students.map(({ email }: any) => email);

      if (emails.length > 0) {
        const placeholders = emails.map(() => '?').join(',');
        await promiseDb.query(
          `DELETE rp FROM Resumepage rp
           JOIN Users u ON rp.student_id = u.id
           WHERE u.email IN (${placeholders}) AND u.class = ? AND u.group_id = ?`,
          [...emails, class_id, job_group_id]
        );

        await promiseDb.query(`DELETE FROM Notes WHERE user_email IN (${placeholders})`, emails);
      }

      if ((global as any).completedResReview && (global as any).completedResReview[job_group_id]) {
        (global as any).completedResReview[job_group_id] = new Set();
        console.log(`Reset completedResReview for group ${job_group_id}`);
      }

      await promiseDb.query('COMMIT');

      console.log('Emitting jobUpdated event via Socket.IO to online students in the group/class');
      console.log('Online students record:', this.onlineStudents);
      console.log("this is the emails", emails);
      const roomID = `group_${job_group_id}_class_${class_id}`;
        this.io.to(roomID).emit('jobUpdated', {
          job: jobTitle,
        }
      );

      

      console.log(`Job "${jobTitle}" assigned to Group ${job_group_id} in Class ${class_id}. All related data cleared.`);

      res.json({
        message: 'Group job updated and all related data cleared successfully!',
        job_group_id,
        class_id,
        job: jobTitle,
        cleared_tables: [
          'InterviewPage', 'MakeOfferPage', 'Resume', 'Resumepage',
          'Resumepage2', 'Offer_Status', 'Interview_Status', 'InterviewPopup', 'Notes'
        ],
        students_affected: emails.length,
        job_assignment_updated: true
      });
    } catch (error: any) {
      try {
        await this.db.promise().query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }

      console.error('Error updating job and clearing data:', error);
      res.status(500).json({
        error: 'Database error occurred while updating job and clearing data',
        details: error.message
      });
    }
  };

  getJobAssignment = (req: AuthRequest, res: Response): void => {
    const { groupId, classId } = req.params;

    this.db.query(
      'SELECT job FROM Job_Assignment WHERE `group` = ? AND `class` = ?',
      [groupId, classId],
      (err, results: any[]) => {
        if (err) {
          console.error('Error fetching job assignment:', err);
          res.status(500).json({ error: err.message });
          return;
        }

        if (results.length === 0) {
          res.status(201).json({ message: 'No job assignment found for this group' });
          return;
        }

        res.json({ job: results[0].job });
      }
    );
  };
}