
// ============================================
// src/controllers/resume.controller.ts
// ============================================

import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Connection } from 'mysql2';
import fs from 'fs';
import path from 'path';

export class ResumeController {
  constructor(private db: Connection) {}

  getAllResumes = (req: AuthRequest, res: Response): void => {
    this.db.query('SELECT * FROM Resume', (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  };

  submitVote = (req: AuthRequest, res: Response): void => {
    const { student_id, group_id, class: classId, timespent, resume_number, vote } = req.body;

    if (!student_id || !group_id || !classId || !resume_number || timespent === undefined || timespent === null || !vote) {
      console.log('Validation failed. Received data:', { student_id, group_id, classId, timespent, resume_number, vote });
      res.status(400).json({
        error: 'student_id, group_id, class, resume_number, timespent, and vote are required'
      });
      return;
    }

    const query = `INSERT INTO Resume (student_id, group_id, class, timespent, resume_number, vote) 
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE timespent = VALUES(timespent), vote = VALUES(vote);`;

    this.db.query(query, [student_id, group_id, classId, timespent, resume_number, vote], (err, result) => {
      if (err) {
        console.error('Error saving vote:', err);
        res.status(500).json({ error: 'Database error' });
        return;
      }

      console.log(`Vote recorded for resume ${resume_number} by student ${student_id} in group ${group_id}, class ${classId}`);
      res.status(200).json({ message: 'Resume review updated successfully' });
    });
  };

  getResumesByStudent = (req: AuthRequest, res: Response): void => {
    const { student_id } = req.params;
    this.db.query('SELECT * FROM Resume WHERE student_id = ?', [student_id], (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  };

  deleteResumeByStudent = (req: AuthRequest, res: Response): void => {
    const { student_id } = req.params;
    this.db.query('DELETE FROM Resume WHERE student_id = ?', [student_id], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Resume deleted successfully' });
    });
  };

  getResumesByGroup = (req: AuthRequest, res: Response): void => {
    const { group_id } = req.params;
    const { class: studentClass } = req.query;

    let query = 'SELECT * FROM Resume WHERE group_id = ?';
    let params: any[] = [group_id];

    if (studentClass) {
      query = `
        SELECT r.* 
        FROM Resume r
        JOIN Users u ON r.student_id = u.id
        WHERE r.group_id = ? AND u.class = ?
      `;
      params = [group_id, studentClass];
    }

    this.db.query(query, params, (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  };

  checkResume = async (req: AuthRequest, res: Response): Promise<void> => {
    const { user_id, group_id, resume_number, checked } = req.body;

    try {
      this.db.query(
        'UPDATE resume_votes SET checked = ? WHERE user_id = ? AND group_id = ? AND resume_number = ?',
        [checked, user_id, group_id, resume_number],
        (err) => {
          if (err) {
            res.status(500).json({ success: false });
            return;
          }
          res.json({ success: true });
        }
      );
    } catch (error) {
      console.error('Error updating checkbox:', error);
      res.status(500).json({ success: false });
    }
  };

  getCheckedResumes = (req: AuthRequest, res: Response): void => {
    const { group_id } = req.params;
    this.db.query('SELECT vote, resume_number FROM Resume WHERE group_id = ? AND checked = "True"', [group_id], (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  };

  getAllResumePdfs = (req: AuthRequest, res: Response): void => {
    const query = `
      SELECT 
        r.id, 
        r.title, 
        r.file_path,
        c.f_name as first_name,
        c.l_name as last_name,
        c.interview
      FROM Resume_pdfs r
      LEFT JOIN Candidates c ON r.id = c.resume_id
      ORDER BY r.id DESC
    `;

    this.db.query(query, (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  };

  createResumePdf = (req: AuthRequest, res: Response): void => {
    const { resTitle, filePath, f_name, l_name, vid } = req.body;

    if (!resTitle || !filePath || !f_name || !l_name || !vid) {
      res.status(400).json({ error: 'Missing fields' });
      return;
    }

    const resumeSql = 'INSERT INTO Resume_pdfs (title, file_path) VALUES (?, ?)';
    this.db.query(resumeSql, [resTitle, filePath], (err, resumeResult: any) => {
      if (err) {
        console.error('Error inserting resume:', err);

        if (err.code === 'ER_DUP_ENTRY') {
          res.status(409).json({
            error: 'A resume with this file already exists. Please choose a different file.'
          });
          return;
        }

        res.status(500).json({ error: 'Database error' });
        return;
      }

      const resumeId = resumeResult.insertId;

      const candidateSql = 'INSERT INTO Candidates (resume_id, interview, f_name, l_name) VALUES (?, ?, ?, ?)';
      this.db.query(candidateSql, [resumeId, vid, f_name, l_name], (err2) => {
        if (err2) {
          console.error('Error inserting candidate:', err2);
          res.status(500).json({ error: 'Database error' });
          return;
        }

        res.json({
          message: 'Resume and candidate added successfully!',
          resumeId: resumeId
        });
      });
    });
  };

  deleteResumePdf = (req: AuthRequest, res: Response): void => {
    const { file_path } = req.params;
    this.db.query('DELETE FROM Resume_pdfs WHERE file_path = ?', [file_path], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Resume deleted successfully' });
    });
  };

  getResumeFile = (req: AuthRequest, res: Response): void => {
    const { fileName } = req.params;
    const fullPath = path.join(__dirname, '../../uploads/resumes', fileName);
    console.log('Serving resume file:', fullPath);

    if (fs.existsSync(fullPath)) {
      res.sendFile(fullPath);
    } else {
      res.status(404).json({ error: `Resume not found: ${fileName}` });
    }
  };

  getResumePdfById = (req: AuthRequest, res: Response): void => {
    const { id } = req.params;
    this.db.query('SELECT * FROM Resume_pdfs WHERE id = ?', [id], (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  };

  deleteResumeFile = (req: AuthRequest, res: Response): void => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, '../../uploads/resumes', fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      this.db.query('SELECT id FROM Resume_pdfs WHERE file_path = ?', [`uploads/resumes/${fileName}`], (err, resumeResults: any[]) => {
        if (err) {
          console.error('Database lookup error:', err);
          res.status(500).json({ error: 'Database lookup failed' });
          return;
        }

        if (resumeResults.length === 0) {
          res.status(404).json({ error: 'Resume not found in database' });
          return;
        }

        const resumeId = resumeResults[0].id;

        this.db.query('DELETE FROM Candidates WHERE resume_id = ?', [resumeId], (err, candidateResult: any) => {
          if (err) {
            console.error('Candidate deletion error:', err);
            res.status(500).json({ error: 'Candidate deletion failed' });
            return;
          }

          console.log(`Deleted ${candidateResult.affectedRows} candidate(s) for resume ID ${resumeId}`);

          this.db.query('DELETE FROM Resume_pdfs WHERE file_path = ?', [`uploads/resumes/${fileName}`], (err, resumeResult: any) => {
            if (err) {
              console.error('Resume deletion error:', err);
              res.status(500).json({ error: 'Resume deletion failed' });
              return;
            }

            console.log(`Deleted resume: ${fileName}, Resume ID: ${resumeId}`);
            res.json({
              message: `File "${fileName}" and associated candidate deleted successfully.`,
              deletedResume: resumeResult.affectedRows > 0,
              deletedCandidate: candidateResult.affectedRows > 0
            });
          });
        });
      });
    } else {
      res.status(404).send(`File "${fileName}" not found.`);
    }
  };
}
