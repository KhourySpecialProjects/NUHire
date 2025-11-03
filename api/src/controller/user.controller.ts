import { Response } from 'express';
import { AuthRequest, User } from '../models/types';
import { Connection, RowDataPacket } from 'mysql2';

export class UserController {
  constructor(private db: Connection) {}

  getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      this.db.query('SELECT * FROM Users', (err, results) => {
        if (err) {
          console.error('Error fetching users:', err);
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results);
      });
    } catch (error) {
      console.error('Unexpected error in getAllUsers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      this.db.query('SELECT * FROM Users WHERE id = ?', [id], (err, results) => {
        if (err) {
          console.error('Error fetching user:', err);
          res.status(500).json({ error: err.message });
          return;
        }

        const users = results as RowDataPacket[] as User[];
        
        if (users.length === 0) {
          res.status(404).json({ message: 'User not found' });
          return;
        }

        res.json(users[0]);
      });
    } catch (error) {
      console.error('Unexpected error in getUserById:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { First_name, Last_name, Email, Affiliation } = req.body;

    console.log('=== POST /users endpoint hit ===');
    console.log('Request body:', { First_name, Last_name, Email, Affiliation });

    if (!First_name || !Last_name || !Email || !Affiliation) {
      console.log('❌ Validation failed: Missing required fields');
      res.status(400).json({ message: 'First name, last name, email, and affiliation are required' });
      return;
    }

    console.log('✅ Validation passed, checking if user exists in database');

    this.db.query('SELECT * FROM Users WHERE email = ?', [Email], (err, results) => {
      if (err) {
        console.error('❌ Database error during user lookup:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      const users = results as RowDataPacket[] as User[];
      console.log(`Database query result: Found ${users.length} users with email ${Email}`);

      if (users.length > 0) {
        console.log('User already exists, updating information:', users[0]);
        
        // Update existing user with new information
        this.db.query(
          'UPDATE Users SET f_name = ?, l_name = ?, affiliation = ? WHERE email = ?',
          [First_name, Last_name, Affiliation, Email],
          (updateErr, updateResult) => {
            if (updateErr) {
              console.error('❌ Failed to update user record:', updateErr);
              res.status(500).json({ error: updateErr.message });
              return;
            }
            
            console.log('✅ User record updated successfully');
            res.status(200).json({
              message: 'User information updated successfully',
              action: 'updated',
              f_name: First_name,
              l_name: Last_name,
              email: Email,
              affiliation: Affiliation
            });
          }
        );
        return;
      } else {
        console.log('User does not exist, creating new user');

        let sql: string;
        let params: any[];

        if (Affiliation === 'admin') {
          console.log('Creating new admin user');
          sql = 'INSERT INTO Users (f_name, l_name, email, affiliation) VALUES (?, ?, ?, ?)';
          params = [First_name, Last_name, Email, Affiliation];
        } else if (Affiliation === 'student') {
          console.log('❌ Student not found in database - they should be imported via CSV first');
          res.status(404).json({
            message: 'Student not found. Please contact your instructor to be added to the class.',
            action: 'student_not_found'
          });
          return;
        } else {
          console.log('❌ Invalid affiliation:', Affiliation);
          res.status(400).json({ message: 'Invalid affiliation' });
          return;
        }

        console.log('Executing user creation query...');
        this.db.query(sql, params, (err, result) => {
          if (err) {
            console.error('❌ Failed to create user:', err);
            res.status(500).json({ error: err.message });
            return;
          }

          const insertResult = result as RowDataPacket;
          console.log('✅ User created successfully');
          res.status(201).json({
            id: insertResult.insertId,
            First_name,
            Last_name,
            Email,
            Affiliation,
            action: 'created'
          });
        });
      }
    });
  } catch (error) {
    console.error('Unexpected error in createUser:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

  getStudents = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { class: classId } = req.query;

      let query = "SELECT f_name, l_name, email, group_id FROM Users WHERE affiliation = 'student'";
      let params: any[] = [];

      if (classId) {
        query += ' AND class = ?';
        params.push(classId);
      }

      this.db.query(query, params, (err, results) => {
        if (err) {
          console.error('Error fetching students:', err);
          res.status(500).json({ error: err.message });
          return;
        }
        console.log(results);
        res.json(results);
      });
    } catch (error) {
      console.error('Unexpected error in getStudents:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  updateCurrentPage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { page, user_email } = req.body;

      if (!page || !user_email) {
        res.status(400).json({ error: 'Page and email are required.' });
        return;
      }

      this.db.query(
        'UPDATE Users SET `current_page` = ? WHERE email = ?',
        [page, user_email],
        (err, result) => {
          if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Failed to update current page.' });
            return;
          }
          res.json({ message: 'Page updated successfully!' });
        }
      );
    } catch (error) {
      console.error('Unexpected error in updateCurrentPage:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  updateUserClass = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { email, class: classId } = req.body;

      if (req.user?.email !== email && req.user?.affiliation !== 'admin') {
        res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
        return;
      }

      if (!email || !classId) {
        res.status(400).json({ error: 'Email and class are required.' });
        return;
      }

      this.db.query('UPDATE Users SET `class` = ? WHERE email = ?', [classId, email], (err, result) => {
        if (err) {
          console.error('Database error:', err);
          res.status(500).json({ error: 'Failed to update class.' });
          return;
        }

        const updateResult = result as RowDataPacket;
        if (updateResult.affectedRows === 0) {
          res.status(404).json({ error: 'User not found.' });
          return;
        }

        res.json({ message: 'Class updated successfully!' });
      });
    } catch (error) {
      console.error('Unexpected error in updateUserClass:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  updateUserSeen = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required.' });
        return;
      }

      this.db.query('UPDATE Users SET `seen` = 1 WHERE email = ?', [email], (err, result) => {
        if (err) {
          console.error('Database error:', err);
          res.status(500).json({ error: 'Failed to update seen.' });
          return;
        }

        res.json({ message: 'Seen updated successfully!' });
      });
    } catch (error) {
      console.error('Unexpected error in updateUserSeen:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  check = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.params;
      console.log("Check endpoint hit with email:", email);

      if (!email) {
        res.status(400).json({ error: 'Email is required.' });
        return;
      }

      this.db.query('SELECT COUNT(*) AS count FROM Users WHERE email = ?', [email], (err, result) => {
        if (err) {
          console.error('Database error:', err);
          res.status(500).json({ error: 'Failed to check if email is within users.' });
          return;
        }
        const rows = result as RowDataPacket[];
        const count = rows[0].count;
        console.log("Check query result:", result);
        res.json({ exists: count > 0 });
      });
    } catch (error) {
      console.error('Unexpected error in check:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}