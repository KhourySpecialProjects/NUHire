// src/controllers/group.controller.ts

import { Response } from 'express';
import { AuthRequest } from '../models/types';
import { Pool } from 'mysql2';

export class GroupController {
  constructor(private db: Pool, private io: any) {}

  getGroups = async (req: AuthRequest, res: Response): Promise<void> => {
    const { class: classId } = req.query;

    try {
      const promiseDb = this.db.promise();
      const [groupsResult] = await promiseDb.query(
        'SELECT DISTINCT group_id FROM `GroupsInfo` WHERE class_id = ? ORDER BY group_id',
        [classId]
      ) as any[];

      if (groupsResult.length === 0) {
        console.log(`No groups found for class ${classId}`);
        res.json([]);
        return;
      }

      console.log(`Class ${classId} has ${groupsResult.length} groups`);
      const groupIds = groupsResult.map((group: any) => group.group_id);
      res.json(groupIds);
    } catch (error) {
      console.error('Error fetching groups:', error);
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  };

  updateGroup = (req: AuthRequest, res: Response): void => {
    const { group_id, students } = req.body;

    if (!group_id || students.length === 0) {
      res.status(400).json({ error: 'Group ID and students are required.' });
      return;
    }

    const queries = students.map((email: string) => {
      return new Promise((resolve, reject) => {
        this.db.query('UPDATE Users SET `group_id` = ? WHERE email = ?', [group_id, email], (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
    });

    Promise.all(queries)
      .then(() => res.json({ message: 'Group updated successfully!' }))
      .catch(error => res.status(500).json({ error: (error as any).message }));
  };

  createGroups = (req: AuthRequest, res: Response): void => {
    const { class_id, num_groups } = req.body;

    console.log('Creating groups for class:', { class_id, num_groups });

    if (!class_id || !num_groups) {
      res.status(400).json({
        error: 'Missing required fields: class_id, num_groups'
      });
      return;
    }

    this.db.query('SELECT COUNT(*) as group_count FROM `GroupsInfo` WHERE class_id = ?', [class_id], (err, result: any[]) => {
      if (err) {
        console.error('Error checking existing groups:', err);
        res.status(500).json({ error: 'Failed to check existing groups' });
        return;
      }

      const existingGroupCount = result[0].group_count;

      if (existingGroupCount > 0) {
        console.log(`Groups already exist for class ${class_id}`);
        res.status(400).json({
          error: 'Groups already exist for this class',
          existing_groups: existingGroupCount
        });
        return;
      }

      const insertPromises = [];
      for (let i = 1; i <= num_groups; i++) {
        const insertPromise = new Promise((resolve, reject) => {
          const query = `
            INSERT INTO GroupsInfo (class_id, group_id, started) 
            VALUES (?, ?, 0)
          `;

          this.db.query(query, [class_id, i], (insertErr, insertResult: any) => {
            if (insertErr) {
              reject({ id: i, error: insertErr.message });
            } else {
              resolve({
                id: i,
                insertId: insertResult.insertId
              });
            }
          });
        });

        insertPromises.push(insertPromise);
      }

      Promise.allSettled(insertPromises).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').map(r => (r as any).value);
        const failed = results.filter(r => r.status === 'rejected').map(r => (r as any).reason);

        console.log(`✅ Created ${successful.length} groups for class ${class_id}`);

        if (failed.length > 0) {
          console.error(`❌ Failed to create ${failed.length} groups:`, failed);
        }

        res.json({
          message: 'Groups created successfully',
          class_id: parseInt(class_id),
          groups_created: successful.length,
          groups_failed: failed.length,
          groups: successful
        });
      });
    });
  };

  getClassInfo = (req: AuthRequest, res: Response): void => {
    const { classId } = req.params;

    console.log('Fetching class info for:', classId);

    const query = `
      SELECT 
        m.crn,
        COALESCE(g.max_students, 4) as slots_per_group
      FROM Moderator m
      LEFT JOIN \`GroupsInfo\` g ON m.crn = g.class_id
      WHERE m.crn = ?
      LIMIT 1
    `;

    this.db.query(query, [classId], (err, result: any[]) => {
      if (err) {
        console.error('Error fetching class info:', err);
        res.status(500).json({ error: 'Failed to fetch class information' });
        return;
      }

      if (result.length === 0) {
        res.status(404).json({ error: 'Class not found' });
        return;
      }

      console.log('Class info result:', result[0]);
      res.json(result[0]);
    });
  };

  joinGroup = (req: AuthRequest, res: Response): void => {
    const { email, class_id, group_id } = req.body;

    console.log('Student joining group:', { email, class_id, group_id });

    if (!email || !class_id || !group_id) {
      res.status(400).json({
        error: 'Missing required fields: email, class_id, group_id'
      });
      return;
    }

    const checkCapacityQuery = `
      SELECT 
        g.max_students,
        COUNT(u.email) as current_students
      FROM \`GroupsInfo\` g
      LEFT JOIN Users u ON u.group_id = g.group_id AND u.class = g.class_id
      WHERE g.class_id = ? AND g.group_id = ?
    `;

    this.db.query(checkCapacityQuery, [class_id, group_id], (err, capacityResult: any[]) => {
      if (err) {
        console.error('Error checking group capacity:', err);
        res.status(500).json({ error: 'Failed to check group capacity' });
        return;
      }

      if (capacityResult.length === 0) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const { max_students, current_students } = capacityResult[0];

      if (current_students >= max_students) {
        res.status(400).json({
          error: 'Group is full',
          current_students: current_students,
          max_students: max_students
        });
        return;
      }

      const updateQuery = 'UPDATE Users SET group_id = ? WHERE email = ? AND class = ?';

      this.db.query(updateQuery, [group_id, email, class_id], (updateErr, updateResult: any) => {
        if (updateErr) {
          console.error('Error assigning student to group:', updateErr);
          res.status(500).json({ error: 'Failed to join group' });
          return;
        }

        if (updateResult.affectedRows === 0) {
          res.status(404).json({ error: 'Student not found in this class' });
          return;
        }

        console.log(`✅ Student ${email} successfully joined group ${group_id} in class ${class_id}`);
        console.log(`📡 Emitting studentJoinedGroup event to class_${class_id}`);

        this.io.to(`class_${class_id}`).emit('studentJoinedGroup', { class_id });

        res.json({
          message: 'Successfully joined group',
          group_id: group_id,
          class_id: class_id
        });
      });
    });
  };

  getStudentsByClass = (req: AuthRequest, res: Response): void => {
    const { classId } = req.params;

    console.log('Fetching students for class:', classId);

    const query = `SELECT * FROM Users WHERE class = ?`;

    this.db.query(query, [classId], (err, results) => {
      if (err) {
        console.error('Error fetching students by class:', err);
        res.status(500).json({ error: 'Failed to fetch students' });
        return;
      }

      console.log(`Found ${(results as any[]).length} students for class ${classId}`);
      res.json(results);
    });
  };

  reassignStudent = (req: AuthRequest, res: Response): void => {
    const { email, new_group_id, class_id } = req.body;

    console.log('Reassigning student:', { email, new_group_id, class_id });

    if (!email || !new_group_id || !class_id) {
      res.status(400).json({
        error: 'Missing required fields: email, new_group_id, class_id'
      });
      return;
    }

    const updateQuery = 'UPDATE Users SET group_id = ? WHERE email = ? AND class = ?';

    this.db.query(updateQuery, [new_group_id, email, class_id], (err, result: any) => {
      if (err) {
        console.error('Error reassigning student to new group:', err);
        res.status(500).json({ error: 'Failed to reassign student' });
        return;
      }

      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Student not found in this class' });
        return;
      }

      console.log(`✅ Student ${email} successfully reassigned to group ${new_group_id} in class ${class_id}`);

      res.json({
        message: 'Student reassigned successfully',
        email,
        new_group_id,
        class_id
      });
    });
  };

  removeFromGroup = (req: AuthRequest, res: Response): void => {
    const { email, class_id } = req.body;

    console.log('Removing student from group:', { email, class_id });

    if (!email || !class_id) {
      res.status(400).json({
        error: 'Missing required fields: email, class_id'
      });
      return;
    }

    // First get the student's group_id before removing them
    const getGroupQuery = 'SELECT group_id FROM Users WHERE email = ? AND class = ?';
    
    this.db.query(getGroupQuery, [email, class_id], (err, results: any) => {
      if (err) {
        console.error('Error fetching student group:', err);
        res.status(500).json({ error: 'Failed to fetch student information' });
        return;
      }

      const studentGroupId = results[0]?.group_id;

      const updateQuery = 'UPDATE Users SET group_id = NULL WHERE email = ? AND class = ?';

      this.db.query(updateQuery, [email, class_id], (err, result: any) => {
        if (err) {
          console.error('Error removing student from group:', err);
          res.status(500).json({ error: 'Failed to remove student from group' });
          return;
        }

        if (result.affectedRows === 0) {
          res.status(404).json({ error: 'Student not found in this class' });
          return;
        }

        console.log(`✅ Student ${email} successfully removed from group ${studentGroupId} in class ${class_id}`);
        
        // Emit socket event to notify the group
        if (studentGroupId && this.io) {
          const roomId = `group_${studentGroupId}_class_${class_id}`;
          this.io.to(roomId).emit('studentRemovedFromGroup', {
            email,
            groupId: studentGroupId,
            classId: class_id
          });
          console.log(`📡 Emitted studentRemovedFromGroup to room: ${roomId}`);
        }
        
        res.json({
          message: 'Student removed from group successfully',
          email,
          class_id
        });
      });
    });
  };

  startAllGroups = (req: AuthRequest, res: Response): void => {
    const { class_id } = req.body;

    if (!class_id) {
      res.status(400).json({
        error: 'Missing required field: class_id'
      });
      return;
    }

    const updateQuery = 'UPDATE `GroupsInfo` SET started = 1 WHERE class_id = ?';

    this.db.query(updateQuery, [class_id], (err) => {
      if (err) {
        console.error('Error starting all groups:', err);
        res.status(500).json({ error: 'Failed to start all groups' });
        return;
      }

      console.log(`✅ All groups for class ${class_id} successfully started`);

      this.io.to(`class_${class_id}`).emit('groupStartedClass');
      console.log(`📡 Emitting groupStartedClass event to class_${class_id}`);

      res.json({
        message: 'All groups started successfully',
        class_id
      });
    });
  };

  startGroup = (req: AuthRequest, res: Response): void => {
    const { class_id, group_id } = req.body;

    if (!class_id || !group_id) {
      res.status(400).json({
        error: 'Missing required fields: class_id, group_id'
      });
      return;
    }

    const updateQuery = 'UPDATE `GroupsInfo` SET started = 1 WHERE class_id = ? AND group_id = ?';
    this.db.query(updateQuery, [class_id, group_id], (err) => {
      if (err) {
        console.error('Error starting group:', err);
        res.status(500).json({ error: 'Failed to start group' });
        return;
      }

      console.log(`✅ Group ${group_id} for class ${class_id} successfully started`);

      this.io.to(`class_${class_id}`).emit('groupStartedGroup', { group_id });
      console.log(`📡 Emitting groupStartedGroup event to class_${class_id} for group ${group_id}`);
      res.json({
        message: 'Group started successfully',
        class_id,
        group_id
      });
    });
  };

  getGroupStarted = (req: AuthRequest, res: Response): void => {
    const { classId, groupId } = req.params;

    console.log('Checking if group is started for class:', classId, 'group:', groupId);

    const query = 'SELECT started FROM `GroupsInfo` WHERE class_id = ? AND group_id = ?';

    this.db.query(query, [classId, groupId], (err, results: any[]) => {
      if (err) {
        console.error('Error checking if group is started:', err);
        res.status(500).json({ error: 'Failed to check group status' });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      console.log(`Group started status for class ${classId}, group ${groupId}:`, results[0]);
      res.json({ started: results[0].started });
    });
  };

  getGroupStatus = (req: AuthRequest, res: Response): void => {
    const { classId, groupId } = req.params;

    console.log('Fetching group status for class:', classId, 'group:', groupId);

    const query = 'SELECT started FROM `GroupsInfo` WHERE class_id = ? AND group_id = ?';

    this.db.query(query, [classId, groupId], (err, results: any[]) => {
      if (err) {
        console.error('Error fetching group status:', err);
        res.status(500).json({ error: 'Failed to fetch group status' });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      console.log(`Group status for class ${classId}, group ${groupId}:`, results[0]);
      res.json({ started: results[0].started });
    });
  };

  getGroupsSeen = (req: AuthRequest, res: Response): void => {
    const { email } = req.query;

    const query = `SELECT seen FROM Users WHERE email = ?`;

    this.db.query(query, [email], (err, results: any[]) => {
      if (err) {
        console.error('Error fetching groups seen status:', err);
        res.status(500).json({ error: 'Failed to fetch groups seen status' });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ seen: results[0].seen });
    });
  };

  createSingleGroup = (req: AuthRequest, res: Response): void => {
    const { class_id, group_id } = req.body;

    if (!class_id || !group_id) {
      res.status(400).json({
        error: 'Missing required fields: class_id, group_id'
      });
      return;
    }

    const query = `
      INSERT INTO GroupsInfo (class_id, group_id, started) 
      VALUES (?, ?, 0)
    `;

    this.db.query(query, [class_id, group_id], (err, result: any) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          res.status(409).json({ error: 'Group already exists' });
          return;
        }
        console.error('Error creating group:', err);
        res.status(500).json({ error: 'Failed to create group' });
        return;
      }

      console.log(`✅ Group ${group_id} created for class ${class_id}`);

      res.json({
        message: 'Group created successfully',
        class_id: parseInt(class_id),
        group_id: parseInt(group_id)
      });
    });
  };

  addStudent = (req: AuthRequest, res: Response): void => {
    const { email, class_id, group_id, f_name, l_name } = req.body;

    console.log('Adding student to group:', { email, class_id, group_id, f_name, l_name });

    if (!email || !class_id || !group_id) {
      console.log('❌ Missing required fields:', { email, class_id, group_id });
      res.status(400).json({
        error: 'Missing required fields: email, class_id, group_id'
      });
      return;
    }

    // Check if the student exists in the database
    const checkStudentQuery = 'SELECT * FROM Users WHERE email = ?';
    console.log('🔍 Checking if student exists:', { email });
    
    this.db.query(checkStudentQuery, [email], (checkErr, checkResults: any[]) => {
      if (checkErr) {
        console.error('❌ Error checking student:', checkErr);
        res.status(500).json({ error: 'Failed to check student' });
        return;
      }

      console.log('🔎 checkResults:', checkResults);

      // If student doesn't exist, create them
      if (!checkResults || checkResults.length === 0) {
        console.log(`📝 Student ${email} does not exist. Creating new student.`);

        const insertQuery = `
          INSERT INTO Users (email, affiliation, class, group_id) 
          VALUES (?, 'student', ?, ?)
        `;
        
        this.db.query(insertQuery, [email, class_id, group_id], (insertErr, insertResult: any) => {
          if (insertErr) {
            console.error('❌ Error creating student:', insertErr);
            res.status(500).json({ error: 'Failed to create student' });
            return;
          }

          console.log('✅ New student created successfully:', insertResult);
          
          // Emit socket event to notify the group
          const roomId = `group_${group_id}_class_${class_id}`;
          this.io.to(roomId).emit('studentAddedToGroup', {
            groupId: group_id,
            classId: class_id
          });
          console.log(`📡 Emitted studentAddedToGroup to room: ${roomId}`);
          
          res.status(201).json({
            message: 'Student created and added to group successfully',
            email,
            group_id,
            class_id,
            f_name,
            l_name,
            action: 'created'
          });
        });
        return;
      }

      // Student exists, check if they're already in this specific class
      const existingStudent = checkResults[0];
      console.log('🔍 Student exists, checking class assignment:', existingStudent);
      
      if (existingStudent.class === class_id) {
        console.log(`❌ Student ${email} already exists in class ${class_id}`);
        res.status(409).json({ error: 'Student already exists in this class' });
        return;
      }

      // Student exists but not in this class, update their class and group
      const updateQuery = 'UPDATE Users SET class = ?, group_id = ? WHERE email = ?';
      console.log('📝 Updating student class and group:', { email, class_id, group_id });
      
      this.db.query(updateQuery, [class_id, group_id, email], (updateErr, updateResult: any) => {
        if (updateErr) {
          console.error('❌ Error updating student:', updateErr);
          res.status(500).json({ error: 'Failed to add student to class and group' });
          return;
        }

        console.log('🟢 Update result:', updateResult);

        if (updateResult.affectedRows === 0) {
          console.log(`❌ Student ${email} not updated`);
          res.status(404).json({ error: 'Student not added' });
          return;
        }

        console.log(`✅ Student ${email} successfully added to group ${group_id} in class ${class_id}`);
        
        // Emit socket event to notify the group
        const roomId = `group_${group_id}_class_${class_id}`;
        this.io.to(roomId).emit('studentAddedToGroup', {
          groupId: group_id,
          classId: class_id
        });
        console.log(`📡 Emitted studentAddedToGroup to room: ${roomId}`);
        
        res.json({
          message: 'Student added to group successfully',
          email,
          group_id,
          class_id,
          action: 'updated'
        });
      });
    });
  };

  deleteStudent = (req: AuthRequest, res: Response): void => {
    const { email, class_id } = req.body;

    if (!email || !class_id) {
      res.status(400).json({ error: 'Missing required fields: email, class_id' });
      return;
    }

    this.db.query('DELETE FROM Users WHERE email = ? AND class = ?', [email, class_id], (err, result: any) => {
      if (err) {
        res.status(500).json({ error: 'Failed to delete student' });
        return;
      }
      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }
      res.json({ message: 'Student deleted successfully', email, class_id });
    });
  };

  getProgress = (req: AuthRequest, res: Response): void => {
    const { classId, groupId } = req.params;

    console.log('Fetching group progress for class:', classId, 'group:', groupId);

    const query = `
      SELECT step
      FROM Progress
      WHERE crn = ? AND group_id = ?
    `;

    this.db.query(query, [classId, groupId], (err, results: any[]) => {
      if (err) {
        console.error('Error fetching group progress:', err);
        res.status(500).json({ error: 'Failed to fetch group progress' });
        return;
      }
      
      console.log(`Group progress for class ${classId}, group ${groupId}:`, results);
      
      const stepOrder = ['none', 'job_description', 'res_1', 'res_2', 'interview', 'offer', 'employer'];
      
      const steps = results.map((row: any) => row.step);
      
      const validSteps = steps.filter((step: string) => step !== 'none');
      
      let leftmostStep = 'none';
      
      if (validSteps.length > 0) {
        leftmostStep = validSteps.reduce((earliest: string, current: string) => {
          const earliestIndex = stepOrder.indexOf(earliest);
          const currentIndex = stepOrder.indexOf(current);
          return currentIndex < earliestIndex ? current : earliest;
        });
      }

      console.log(`Leftmost progress step for class ${classId}, group ${groupId}:`, leftmostStep);
      
      res.json({ progress: leftmostStep });
    });
  };

  assignJobToAllGroups = async (req: AuthRequest, res: Response): Promise<void> => {
    const { class_id, job_title } = req.body;

    console.log('Assigning job to all groups in class:', { class_id, job_title });

    if (!class_id || !job_title) {
      res.status(400).json({
        error: 'Missing required fields: class_id, job_title'
      });
      return;
    }

    try {
      const promiseDb = this.db.promise();

      // Get all groups for the class (excluding ungrouped -1)
      const [groupsResult] = await promiseDb.query(
        'SELECT DISTINCT group_id FROM `GroupsInfo` WHERE class_id = ? ORDER BY group_id',
        [class_id]
      ) as any[];

      if (groupsResult.length === 0) {
        res.status(404).json({ error: 'No groups found for this class' });
        return;
      }

      const groupIds = groupsResult.map((group: any) => group.group_id);
      console.log(`Found ${groupIds.length} groups for class ${class_id}:`, groupIds);

      // Update job assignment for all groups
      const updatePromises = groupIds.map((groupId: number) => {
        return promiseDb.query(
          `INSERT INTO Progress (crn, group_id, job) 
          VALUES (?, ?, ?) 
          ON DUPLICATE KEY UPDATE job = VALUES(job)`,
          [class_id, groupId, job_title]
        );
      });

      await Promise.all(updatePromises);

      console.log(`✅ Successfully assigned job "${job_title}" to ${groupIds.length} groups in class ${class_id}`);

      res.json({
        message: 'Job assigned to all groups successfully',
        class_id: parseInt(class_id),
        job_title,
        groups_updated: groupIds.length,
        group_ids: groupIds
      });
    } catch (error) {
      console.error('Error assigning job to all groups:', error);
      res.status(500).json({ error: 'Failed to assign job to all groups' });
    }
  };
}