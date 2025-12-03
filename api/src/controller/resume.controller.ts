
// ============================================
// src/controllers/resume.controller.ts
// ============================================

import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Pool } from 'mysql2';
import fs from 'fs';
import path from 'path';

export class ResumeController {
  constructor(private db: Pool, private io: any) {}

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

    console.log('🗳️ [BACKEND-VOTE] Received vote submission:', {
      student_id,
      group_id,
      class: classId,
      timespent,
      resume_number,
      vote
    });

    if (!student_id || !group_id || !classId || !resume_number || timespent === undefined || timespent === null || !vote) {
      console.log('❌ [BACKEND-VOTE] Validation failed. Received data:', { student_id, group_id, classId, timespent, resume_number, vote });
      res.status(400).json({
        error: 'student_id, group_id, class, resume_number, timespent, and vote are required'
      });
      return;
    }

    // First, get the old vote to send in socket event
    this.db.query(
      'SELECT vote FROM Resume WHERE student_id = ? AND resume_number = ? AND group_id = ? AND class = ?',
      [student_id, resume_number, group_id, classId],
      (err, results: any[]) => {
        const oldVote = results && results.length > 0 ? results[0].vote : 'unanswered';

        const query = `INSERT INTO Resume (student_id, group_id, class, timespent, resume_number, vote) 
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE timespent = VALUES(timespent), vote = VALUES(vote);`;

        console.log('🗳️ [BACKEND-VOTE] Executing query with params:', [student_id, group_id, classId, timespent, resume_number, vote]);

        this.db.query(query, [student_id, group_id, classId, timespent, resume_number, vote], (err, result) => {
          if (err) {
            console.error('❌ [BACKEND-VOTE] Error saving vote:', err);
            res.status(500).json({ error: 'Database error' });
            return;
          }

          console.log(`✅ [BACKEND-VOTE] Vote recorded for resume ${resume_number} by student ${student_id} in group ${group_id}, class ${classId}`);
          
          // EMIT socket event to all group members
          const roomId = `group_${group_id}_class_${classId}`;
          this.io.to(roomId).emit('voteUpdated', {
            resume_number,
            oldVote,
            newVote: vote,
            student_id
          });
          console.log(`📡 [SOCKET] Emitted voteUpdated to room ${roomId}: Resume ${resume_number}, ${oldVote} -> ${vote}`);

          res.status(200).json({ message: 'Resume review updated successfully' });
        });
      }
    );
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

    console.log('📊 [BACKEND-GET-VOTES] Fetching votes for group:', group_id, 'class:', studentClass);

    if (!studentClass) {
      res.status(400).json({ error: 'class query parameter is required' });
      return;
    }

    // Just return ALL votes for this group/class - don't merge them
    const getVotesQuery = `
      SELECT 
        res.resume_number,
        res.vote,
        res.checked
      FROM Resume res
      JOIN Users u ON res.student_id = u.id
      WHERE res.group_id = ? AND u.class = ?
    `;

    this.db.query(getVotesQuery, [group_id, studentClass], (err, votes: any[]) => {
      if (err) {
        console.error('❌ [BACKEND-GET-VOTES] Error fetching votes:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      console.log('📊 [BACKEND-GET-VOTES] All votes from Resume table:', votes);
      res.json(votes); // Return ALL votes, not merged
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
    const { class_id } = req.query; // Get class_id from query params
    
    if (!class_id) {
      res.status(400).json({ error: 'class_id is required' });
      return;
    }

    const query = `
      SELECT 
        r.id, 
        r.title, 
        r.file_path,
        r.class_id,
        c.f_name as first_name,
        c.l_name as last_name,
        c.interview
      FROM Resume_pdfs r
      LEFT JOIN Candidates c ON r.id = c.resume_id
      WHERE r.class_id = ?
      ORDER BY r.id ASC
    `;

    this.db.query(query, [class_id], (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  };

  createResumePdf = (req: AuthRequest, res: Response): void => {
    const { resTitle, filePath, f_name, l_name, vid, class_id } = req.body;

    if (!resTitle || !filePath || !f_name || !l_name || !vid || !class_id) {
      res.status(400).json({ error: 'Missing fields (resTitle, filePath, f_name, l_name, vid, class_id required)' });
      return;
    }

    const resumeSql = 'INSERT INTO Resume_pdfs (title, file_path, class_id) VALUES (?, ?, ?)';
    this.db.query(resumeSql, [resTitle, filePath, class_id], (err, resumeResult: any) => {
      if (err) {
        console.error('Error inserting resume:', err);

        if (err.code === 'ER_DUP_ENTRY') {
          res.status(409).json({
            error: 'A resume with this title already exists in this class. Please choose a different title.'
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

  deleteResumeFile = (req: AuthRequest, res: Response): void => {
    const fileName = req.params.fileName;
    const classId = req.query.class_id;
    
    if (!classId) {
      res.status(400).json({ error: 'class_id is required' });
      return;
    }

    const filePath = path.join(__dirname, '../../uploads/resumes', fileName);

    this.db.query(
      'SELECT id FROM Resume_pdfs WHERE file_path = ? AND class_id = ?', 
      [`uploads/resumes/${fileName}`, classId], 
      (err, resumeResults: any[]) => {
        if (err) {
          console.error('Database lookup error:', err);
          res.status(500).json({ error: 'Database lookup failed' });
          return;
        }

        if (resumeResults.length === 0) {
          res.status(404).json({ error: 'Resume not found in database for this class' });
          return;
        }

        const resumeId = resumeResults[0].id;

        // Delete candidates associated with this resume (CASCADE should handle this, but being explicit)
        this.db.query('DELETE FROM Candidates WHERE resume_id = ?', [resumeId], (err, candidateResult: any) => {
          if (err) {
            console.error('Candidate deletion error:', err);
            res.status(500).json({ error: 'Candidate deletion failed' });
            return;
          }

          console.log(`Deleted ${candidateResult.affectedRows} candidate(s) for resume ID ${resumeId}`);

          // Delete the resume entry for this specific class
          this.db.query(
            'DELETE FROM Resume_pdfs WHERE id = ? AND class_id = ?', 
            [resumeId, classId], 
            (err, resumeResult: any) => {
              if (err) {
                console.error('Resume deletion error:', err);
                res.status(500).json({ error: 'Resume deletion failed' });
                return;
              }

              console.log(`Deleted resume: ${fileName}, Resume ID: ${resumeId} for class ${classId}`);

              // Check if this file is still used by other classes
              this.db.query(
                'SELECT COUNT(*) as count FROM Resume_pdfs WHERE file_path = ?',
                [`uploads/resumes/${fileName}`],
                (err, results: any[]) => {
                  if (err) {
                    console.error('Error checking file usage:', err);
                    res.json({
                      message: `Resume and candidate deleted for class ${classId}. Physical file not removed.`,
                      deletedResume: resumeResult.affectedRows > 0,
                      deletedCandidate: candidateResult.affectedRows > 0
                    });
                    return;
                  }

                  // Only delete the physical file if no other classes are using it
                  if (results[0].count === 0 && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    res.json({
                      message: `File "${fileName}", resume, and associated candidate deleted successfully.`,
                      deletedResume: resumeResult.affectedRows > 0,
                      deletedCandidate: candidateResult.affectedRows > 0,
                      deletedPhysicalFile: true
                    });
                  } else {
                    res.json({
                      message: `Resume and candidate deleted for class ${classId}. File still in use by other classes.`,
                      deletedResume: resumeResult.affectedRows > 0,
                      deletedCandidate: candidateResult.affectedRows > 0,
                      deletedPhysicalFile: false
                    });
                  }
                }
              );
            }
          );
        });
      }
    );
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


  batchVote = async (req: AuthRequest, res: Response): Promise<void> => {
    const { votes } = req.body;
    
    if (!Array.isArray(votes) || votes.length === 0) {
      res.status(400).json({ error: "Invalid votes array" });
      return;
    }

    try {
      // Insert all votes in a single transaction
      const values = votes.map(vote => [
        vote.student_id,
        vote.group_id,
        vote.class,
        vote.timespent,
        vote.resume_number,
        vote.vote
      ]);

      const query = `
        INSERT INTO resume_votes (student_id, group_id, class, timespent, resume_number, vote)
        VALUES ?
      `;

      this.db.query(query, [values], (err, result) => {
        if (err) {
          console.error("Error saving batch votes:", err);
          res.status(500).json({ error: "Failed to save votes" });
          return;
        }
        
        console.log(`✅ Saved ${votes.length} votes successfully`);
        res.json({ success: true, votesCount: votes.length });
      });
    } catch (error) {
      console.error("Error in batchVote:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
