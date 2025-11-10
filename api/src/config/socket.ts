// src/config/socket.ts

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Connection } from 'mysql2';
import { SocketEvents } from '../models/types';

export function initializeSocketHandlers(io: SocketIOServer, db: Connection): Record<string, string> {
  const onlineStudents: Record<string, string> = {};

  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    socket.on('adminOnline', ({ adminEmail }: { adminEmail: string }) => {
      socket.join(adminEmail);
    });

    socket.on('studentOnline', ({ studentId }: { studentId: string }) => {
      onlineStudents[studentId] = socket.id;

      socket.on('message', (data: any) => {
        console.log('Received message:', data);
        io.emit('message', data);
      });

      db.query('SELECT group_id, current_page FROM Users WHERE email = ?', [studentId], (err, result: any[]) => {
        if (!err && result.length > 0) {
          const { group_id, current_page } = result[0];
          io.emit('updateOnlineStudents', { studentId, group_id, current_page });
        }
      });
    });

    socket.on('joinGroup', (group_id: string) => {
      socket.join(group_id);
    });

    socket.on('joinClass', ({ classId }: { classId: number }) => {
      console.log(`Socket ${socket.id} joining class room: class_${classId}`);
      socket.join(`class_${classId}`);
    });

    socket.on('check', ({ group_id, resume_number, checked }: SocketEvents['check']) => {
      console.log(`Checkbox update received: Room ${group_id}, Resume ${resume_number}, Checked: ${checked}`);

      let actualGroupId = group_id;
      let classId = null;

      const roomMatch = /group_(\d+)_class_(\d+)/.exec(group_id);
      if (roomMatch) {
        actualGroupId = roomMatch[1];
        classId = roomMatch[2];
      }

      const query = classId
        ? 'UPDATE Resume SET `checked` = ? WHERE group_id = ? AND class = ? AND resume_number = ?'
        : 'UPDATE Resume SET `checked` = ? WHERE group_id = ? AND resume_number = ?';

      const params = classId
        ? [checked, actualGroupId, classId, resume_number]
        : [checked, actualGroupId, resume_number];

      db.query(query, params, (err) => {
        if (err) {
          console.error('Database Error:', err);
          return;
        }

        console.log(`Database updated successfully for resume ${resume_number}`);
        io.to(group_id).emit('checkboxUpdated', { resume_number, checked });
        console.log(`Emitted checkboxUpdated to room ${group_id}: Resume ${resume_number}, Checked: ${checked}`);
      });
    });

    socket.on('checkint', ({ group_id, interview_number, checked }: SocketEvents['checkint']) => {
      socket.to(group_id).emit('checkboxUpdated', { interview_number, checked });
    });

    socket.on('studentPageChanged', ({ studentId, currentPage }: SocketEvents['studentPageChanged']) => {
      if (onlineStudents[studentId]) {
        io.emit('studentPageChange', { studentId, currentPage });
      }
    });

    socket.on('sendPopupToGroups', ({ groups, headline, message, class: classId, candidateId }: SocketEvents['sendPopupToGroups']) => {
      if (!groups || groups.length === 0) return;

      let query = "SELECT email FROM Users WHERE group_id IN (?) AND affiliation = 'student'";
      let params: any[] = [groups];

      if (classId) {
        query += ' AND class = ?';
        params.push(classId);
      }

      db.query(query, params, (err, results: any[]) => {
        if (!err && results.length > 0) {
          results.forEach(({ email }) => {
            const studentSocketId = onlineStudents[email];
            if (studentSocketId) {
              io.to(studentSocketId).emit('receivePopup', { headline, message, candidateId });
            }
          });

          console.log(`Popup sent to Groups: ${groups.join(', ')} in Class ${classId || 'All'}`);
        } else {
          console.log('No online students in the selected groups.');
        }
      });
    });

    socket.on('updateRatingsWithPresetBackend', ({ classId, groupId, candidateId, vote, isNoShow }: SocketEvents['updateRatingsWithPresetBackend']) => {
      const roomId = `group_${groupId}_class_${classId}`;

      io.to(roomId).emit('updateRatingsWithPresetFrontend', {
        classId,
        groupId,
        candidateId,
        vote,
        isNoShow
      });
    });

    socket.on('makeOfferRequest', ({ classId, groupId, candidateId }: SocketEvents['makeOfferRequest']) => {
      console.log(`Student in class ${classId}, group ${groupId} wants to offer candidate ${candidateId}`);

      db.query('SELECT admin_email FROM Moderator WHERE crn = ?', [classId], (err, moderators: any[]) => {
        console.log('Moderator query result:', moderators);
        if (!err && moderators.length > 0) {
          moderators.forEach(({ admin_email }) => {
            io.to(admin_email).emit('makeOfferRequest', {
              classId,
              groupId,
              candidateId
            });
            console.log(`Notified ${admin_email} about offer request from group ${groupId}`);
          });
        } else {
          console.log('No assigned admin found for class', classId, 'or database error:', err);
        }
      });

      const roomId = `group_${groupId}_class_${classId}`;
      io.to(roomId).emit('groupMemberOffer');
    });

    socket.on('makeOfferResponse', ({ classId, groupId, candidateId, accepted }: SocketEvents['makeOfferResponse']) => {
      console.log(`Advisor responded to class ${classId}, group ${groupId} for candidate ${candidateId}: accepted=${accepted}`);
      io.emit('makeOfferResponse', { classId, groupId, candidateId, accepted });
    });

    socket.on('moveGroup', ({ classId, groupId, targetPage }: SocketEvents['moveGroup']) => {
      console.log(`Moving group ${groupId} in class ${classId} to ${targetPage}`);
      const roomId = `group_${groupId}_class_${classId}`;
      console.log(`Emitting moveGroup to room: ${roomId}`);
      io.to(roomId).emit('moveGroup', { classId, groupId, targetPage });
    });

    socket.on('submitInterview', ({ currentVideoIndex, nextVideoIndex, isLastInterview, groupId, classId }: SocketEvents['submitInterview']) => {
      console.log(`Interview ${currentVideoIndex + 1} submitted by group ${groupId}, class ${classId}, moving to video ${nextVideoIndex + 1}, isLast: ${isLastInterview}`);
      const roomId = `group_${groupId}_class_${classId}`;
      io.to(roomId).emit('interviewSubmitted', { currentVideoIndex, nextVideoIndex, isLastInterview, groupId, classId });
    });

    socket.on('offerSelected', ({ candidateId, groupId, classId, roomId, checked }: SocketEvents['offerSelected']) => {
      console.log(`Candidate ${candidateId} ${checked ? 'selected' : 'deselected'} for offer by group ${groupId}, class ${classId}`);
      socket.to(roomId).emit('offerSelected', { candidateId, groupId, classId, checked });
    });

    socket.on('offerSubmitted', ({ candidateId, groupId, classId, roomId }: SocketEvents['offerSubmitted']) => {
      console.log(`Offer submitted for candidate ${candidateId} by group ${groupId}, class ${classId}`);
      socket.to(roomId).emit('offerSubmitted', { candidateId, groupId, classId });
    });

    socket.on('userCompletedResReview', ({ groupId }: SocketEvents['userCompletedResReview']) => {
      if (!groupId) {
        console.log('No group ID provided for userCompletedResReview');
        return;
      }

      const studentEmail = Object.keys(onlineStudents).find(email => onlineStudents[email] === socket.id);
      if (!studentEmail) {
        console.log('Could not identify student for userCompletedResReview');
        return;
      }

      console.log(`Student ${studentEmail} completed res-review in group ${groupId}`);

      db.query("SELECT f_name, l_name, email, current_page FROM Users WHERE group_id = ? AND affiliation = 'student'", [groupId], (err, groupMembers: any[]) => {
        if (err) {
          console.error('Error fetching group members:', err);
          return;
        }

        console.log(`Group ${groupId} has ${groupMembers.length} members`);

        if (!(global as any).completedResReview) {
          (global as any).completedResReview = {};
        }
        if (!(global as any).completedResReview[groupId]) {
          (global as any).completedResReview[groupId] = new Set();
        }

        const wasAlreadyCompleted = (global as any).completedResReview[groupId].has(studentEmail);
        (global as any).completedResReview[groupId].add(studentEmail);

        if (wasAlreadyCompleted) {
          console.log(`Student ${studentEmail} already marked as completed, ignoring duplicate`);
          return;
        }

        const completedCount = (global as any).completedResReview[groupId].size;
        const totalCount = groupMembers.length;
        const allCompleted = completedCount >= totalCount;

        console.log(`Group ${groupId} completion: ${completedCount}/${totalCount} completed by: ${Array.from((global as any).completedResReview[groupId]).join(', ')}`);

        if (allCompleted) {
          console.log(`🎉 All members in group ${groupId} have completed res-review! Notifying group members.`);

          groupMembers.forEach(member => {
            const memberSocketId = onlineStudents[member.email];
            if (memberSocketId) {
              console.log(`Sending groupCompletedResReview to ${member.email}`);
              io.to(memberSocketId).emit('groupCompletedResReview', {
                groupId,
                completedCount,
                totalCount,
                message: 'All group members have completed their individual resume reviews!'
              });
            } else {
              console.log(`Member ${member.email} is not online`);
            }
          });
        } else {
          console.log(`Group ${groupId} still waiting for ${totalCount - completedCount} more members to complete`);
        }
      });
    });

    socket.on('confirmOffer', ({ groupId, classId, candidateId, studentId, roomId }: SocketEvents['confirmOffer']) => {
      io.to(roomId).emit('confirmOffer', {
        candidateId,
        studentId,
        groupId,
        classId
      });
    });

    socket.on('sentPresetVotes', async ({ student_id, group_id, class: classId, question1, question2, question3, question4, candidate_id }: SocketEvents['sentPresetVotes']) => {
      console.log('inside sentPresetVotes, with data:', { student_id, group_id, classId, question1, question2, question3, question4, candidate_id });
      try {
        const query = `
          INSERT INTO InterviewPopup 
            (candidate_id, group_id, class, question1, question2, question3, question4)
          VALUES 
            (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            question1 = question1 + VALUES(question1),
            question2 = question2 + VALUES(question2),
            question3 = question3 + VALUES(question3),
            question4 = question4 + VALUES(question4)`;

        db.query(query, [candidate_id, group_id, classId, question1, question2, question3, question4], (err) => {
          if (err) {
            console.error('Error updating interview popup votes:', err);
          } else {
            console.log(`Updated interview popup votes for candidate ${candidate_id} in group ${group_id} class ${classId}`);
          }
        });
      } catch (error) {
        console.error('Error in sentPresetVotes:', error);
      }
    });

    socket.on('teamConfirmSelection', ({ groupId, classId, studentId, roomId }: SocketEvents['teamConfirmSelection']) => {
      io.to(roomId).emit('teamConfirmSelection', {
        groupId,
        classId,
        studentId,
        roomId
      });
    });

      socket.on('teamUnconfirmSelection', ({ groupId, classId, studentId, roomId }: SocketEvents['teamUnconfirmSelection']) => {
      io.to(roomId).emit('teamUnconfirmSelection', {
        groupId,
        classId,
        studentId,
        roomId
      });
    });

    socket.on('allowGroupAssignment', ({ classId, message }: SocketEvents['allowGroupAssignment']) => {
      console.log('Teacher allowing group assignment for class:', classId);
      io.to(`class_${classId}`).emit('allowGroupAssignmentStudent', {
        classId: classId,
        message: message
      });
    });

    socket.on('groupAssignmentClosed', ({ classId, message }: SocketEvents['groupAssignmentClosed']) => {
      console.log('Teacher closing group assignment for class:', classId);
      io.to(`class_${classId}`).emit('groupAssignmentClosedStudent', {
        classId: classId,
        message: message
      });
    });

    socket.on('disconnect', () => {
      Object.keys(onlineStudents).forEach(studentId => {
        if (onlineStudents[studentId] === socket.id) {
          console.log(`Student ${studentId} disconnected`);
          delete onlineStudents[studentId];
        }
      });
    });

    socket.on('progressUpdated', ({ crn, group_id, step, email }) => {
      console.log(`Progress updated: Group ${group_id}, Class ${crn}, Step: ${step}`);
      io.emit('progressUpdated', { crn, group_id, step, email });
    });
  });

  return onlineStudents;
}