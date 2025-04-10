import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  serverTimestamp,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  QueryConstraint,
  onSnapshot
} from 'firebase/firestore';
import { Team, Event, TeamMember } from '../types/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvbuOE92uiDPPzVDSXf5F2dzq-GTJoyFo",
  authDomain: "goalsync-81284.firebaseapp.com",
  projectId: "goalsync-81284",
  storageBucket: "goalsync-81284.firebasestorage.app",
  messagingSenderId: "287369509531",
  appId: "1:287369509531:web:324bd234daf4fe0aa0243e"
  // We don't need measurementId for React Native
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  if (!/already exists/.test(error.message)) {
    console.error('Firebase initialization error', error.stack);
  }
}

// Initialize Firebase services
const auth = getAuth();
const db = getFirestore();

// Auth functions
export const loginWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
  return signOut(auth);
};

export const onAuthChanged = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Firestore functions
export const createUser = async (userId: string, userData: any) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
  });
};

export const getUser = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  return userSnap.data();
};

export const createTeam = async (teamData: Omit<Team, 'id' | 'createdAt'>) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to create team');
    }

    // Get the trainer's user data
    const trainerData = await getUser(currentUser.uid);
    if (!trainerData) {
      throw new Error('Trainer data not found');
    }

    // Create the team document
    const teamRef = doc(collection(db, 'teams'));
    const teamId = teamRef.id;
    
    await setDoc(teamRef, {
      ...teamData,
      id: teamId,
      trainerId: currentUser.uid,
      createdAt: serverTimestamp(),
      players: [], // Initialize empty players array
      allowPlayerInjuryReporting: true, // Default to allowing players to report injuries
    });

    // Update trainer's user document with the team ID and role
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      teamId: teamId,
      role: 'staff',
      position: 'Head Coach',
      updatedAt: serverTimestamp()
    });

    return teamId;
  } catch (error: any) {
    console.error('Error creating team:', error);
    throw new Error(error.message || 'Failed to create team');
  }
};

export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to create event');
    }

    const eventRef = doc(collection(db, 'events'));
    const eventId = eventRef.id;

    await setDoc(eventRef, {
      ...eventData,
      id: eventId,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      attendees: [],
      absentees: [],
    });

    // Create a chat message for the event
    const chatRef = doc(collection(db, 'teams', eventData.teamId, 'messages'));
    const eventTime = eventData.startTime.toDate().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const eventDate = eventData.startTime.toDate().toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
    let messageText = `New ${eventData.type}\n\n${eventData.title}\n${eventDate} at ${eventTime}\n${eventData.location}`;
    
    if (eventData.type === 'match') {
      messageText += `\n${eventData.opponent}${eventData.isHomeGame ? ' (Home)' : ' (Away)'}`;
    }
    
    if (eventData.description) {
      messageText += `\n\n${eventData.description}`;
    }

    await setDoc(chatRef, {
      id: chatRef.id,
      userId: currentUser.uid,
      text: messageText,
      timestamp: serverTimestamp(),
      readBy: [currentUser.uid],
      type: 'event',
      eventData: {
        id: eventId,
        type: eventData.type,
        title: eventData.title,
        startTime: eventData.startTime,
        location: eventData.location,
        formation: eventData.formation,
        roster: eventData.roster,
        opponent: eventData.opponent,
        isHomeGame: eventData.isHomeGame
      }
    });

    return eventId;
  } catch (error: any) {
    console.error('Error creating event:', error);
    throw new Error(error.message || 'Failed to create event');
  }
};

export const updateAttendance = async (eventId: string, userId: string, status: 'present' | 'absent' | 'late') => {
  const attendanceRef = doc(db, 'attendance', `${eventId}_${userId}`);
  await setDoc(attendanceRef, {
    eventId,
    userId,
    status,
    timestamp: serverTimestamp(),
  });
};

export const createAnnouncement = async (announcementData: {
  teamId: string;
  title: string;
  message: string;
  createdBy: string;
  priority: 'normal' | 'high';
}) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to create announcement');
    }

    // Get user data to verify trainer status
    const userData = await getUser(currentUser.uid);
    if (!userData || userData.type !== 'trainer') {
      throw new Error('Only trainers can create announcements');
    }

    // Verify the team
    const teamRef = doc(db, 'teams', announcementData.teamId);
    const teamDoc = await getDoc(teamRef);
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }

    // Verify the user is the trainer of this team
    const team = teamDoc.data();
    if (team.trainerId !== currentUser.uid) {
      throw new Error('You can only create announcements for your own team');
    }

    // Create the announcement
    const announcementRef = doc(collection(db, 'announcements'));
    await setDoc(announcementRef, {
      ...announcementData,
      id: announcementRef.id,
      createdAt: serverTimestamp(),
      readBy: [],
    });

    // Create a chat message for the announcement
    const chatRef = doc(collection(db, 'teams', announcementData.teamId, 'messages'));
    await setDoc(chatRef, {
      id: chatRef.id,
      userId: currentUser.uid,
      text: `📢 ${announcementData.title}\n\n${announcementData.message}`,
      timestamp: serverTimestamp(),
      readBy: [currentUser.uid],
      type: 'announcement',
      announcementData: {
        title: announcementData.title,
        priority: announcementData.priority,
      },
    });

    return announcementRef.id;
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    throw new Error(error.message || 'Failed to create announcement');
  }
};

export const getTeamAnnouncements = async (teamId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to view announcements');
    }

    // Get user data to verify team membership
    const userData = await getUser(currentUser.uid);
    
    // Get team data to check players array
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }
    
    const teamData = teamDoc.data();
    const playerIds = teamData.players || [];
    
    // Check if the user is a team member or the trainer
    const isTeamMember = userData?.teamId === teamId;
    const isInPlayersArray = playerIds.includes(currentUser.uid);
    const isTrainer = userData?.type === 'trainer' || teamData.trainerId === currentUser.uid;
    
    console.log('Team membership check:', {
      userId: currentUser.uid,
      teamId,
      isTeamMember,
      isInPlayersArray,
      isTrainer
    });
    
    if (!isTeamMember && !isInPlayersArray && !isTrainer) {
      console.log('User not authorized to view team announcements:', {
        userId: currentUser.uid,
        userData,
        teamData: { trainerId: teamData.trainerId, players: playerIds },
        requestedTeamId: teamId
      });
      throw new Error('You can only view announcements for your own team');
    }

    const q = query(
      collection(db, 'announcements'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.docs.length} announcements for team ${teamId}`);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error: any) {
    console.error('Error fetching team announcements:', error);
    throw new Error(error.message || 'Failed to fetch announcements');
  }
};

export const markAnnouncementAsRead = async (announcementId: string, userId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to mark announcements as read');
    }

    // Verify the user is marking their own read status
    if (currentUser.uid !== userId) {
      throw new Error('You can only mark your own read status');
    }

    // Get the announcement to verify team membership
    const announcementRef = doc(db, 'announcements', announcementId);
    const announcementDoc = await getDoc(announcementRef);
    if (!announcementDoc.exists()) {
      throw new Error('Announcement not found');
    }

    const announcement = announcementDoc.data();
    const userData = await getUser(currentUser.uid);
    if (!userData || userData.teamId !== announcement.teamId) {
      throw new Error('You can only mark announcements as read for your own team');
    }

    await updateDoc(announcementRef, {
      readBy: arrayUnion(userId)
    });
  } catch (error: any) {
    console.error('Error marking announcement as read:', error);
    throw new Error(error.message || 'Failed to mark announcement as read');
  }
};

export const deleteAnnouncement = async (announcementId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to delete announcement');
    }

    // Get user data to verify trainer status
    const userData = await getUser(currentUser.uid);
    if (!userData || userData.type !== 'trainer') {
      throw new Error('Only trainers can delete announcements');
    }

    // Get the announcement to verify ownership
    const announcementRef = doc(db, 'announcements', announcementId);
    const announcementDoc = await getDoc(announcementRef);
    if (!announcementDoc.exists()) {
      throw new Error('Announcement not found');
    }

    const announcement = announcementDoc.data();
    
    // Verify the user is the trainer of the team
    const teamRef = doc(db, 'teams', announcement.teamId);
    const teamDoc = await getDoc(teamRef);
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }

    const team = teamDoc.data();
    if (team.trainerId !== currentUser.uid) {
      throw new Error('You can only delete announcements for your own team');
    }

    await deleteDoc(announcementRef);
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    throw new Error(error.message || 'Failed to delete announcement');
  }
};

export const getTeamByTrainerId = async (trainerId: string): Promise<Team | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to fetch team');
    }

    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('trainerId', '==', currentUser.uid), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Team;
  } catch (error: any) {
    console.error('Error fetching team:', error);
    throw new Error(error.message || 'Failed to fetch team');
  }
};

export const invitePlayer = async (teamId: string, playerEmail: string, playerDetails: { position: string; number: string }) => {
  try {
    // Check if the number is already taken in the team
    const teamMembers = await getTeamMembers(teamId);
    const isNumberTaken = teamMembers.some(member => 
      'number' in member && member.number?.toString() === playerDetails.number
    );

    if (isNumberTaken) {
      throw new Error(`Jersey number ${playerDetails.number} is already taken`);
    }

    // Get team data to include team name
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }
    const teamData = teamDoc.data();

    // Create an invitation document
    const invitationRef = doc(collection(db, 'invitations'));
    await setDoc(invitationRef, {
      teamId,
      teamName: teamData.name,
      playerEmail,
      position: playerDetails.position,
      number: parseInt(playerDetails.number),
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    // TODO: Send email invitation to the player
    // This would typically be handled by a Cloud Function
  } catch (error: any) {
    console.error('Error inviting player:', error);
    throw new Error(error.message || 'Failed to invite player');
  }
};

export const acceptInvitation = async (invitationId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to accept invitation');
    }

    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const invitation = invitationDoc.data();
    
    // Verify the invitation is for this user
    if (invitation.playerEmail !== currentUser.email) {
      throw new Error('This invitation is not for you');
    }

    const teamRef = doc(db, 'teams', invitation.teamId);
    const teamDoc = await getDoc(teamRef);

    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }

    // Update team members
    await updateDoc(teamRef, {
      players: arrayUnion(currentUser.uid)
    });

    // Update invitation status
    await updateDoc(invitationRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: currentUser.uid
    });

    // Update user's team association with the position and number from the invitation
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      teamId: invitation.teamId,
      position: invitation.position,
      number: invitation.number,
      role: 'player',
      updatedAt: serverTimestamp()
    });

  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    throw new Error(error.message || 'Failed to accept invitation');
  }
};

export const declineInvitation = async (invitationId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to decline invitation');
    }

    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);

    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const invitation = invitationDoc.data();
    
    // Verify the invitation is for this user
    if (invitation.playerEmail !== currentUser.email) {
      throw new Error('This invitation is not for you');
    }

    // Update invitation status to declined
    await updateDoc(invitationRef, {
      status: 'declined',
      declinedAt: serverTimestamp(),
      declinedBy: currentUser.uid
    });

  } catch (error: any) {
    console.error('Error declining invitation:', error);
    throw new Error(error.message || 'Failed to decline invitation');
  }
};

export const getPendingInvitations = async (playerEmail: string) => {
  const invitationsRef = collection(db, 'invitations');
  const q = query(
    invitationsRef,
    where('playerEmail', '==', playerEmail),
    where('status', '==', 'pending')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    
    if (!teamDoc.exists()) {
      // Get all users with this teamId
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('teamId', '==', teamId));
      const userDocs = await getDocs(q);
      
      // Clean up all users that were part of this team
      const cleanupPromises = userDocs.docs.map(userDoc => 
        updateDoc(doc(usersRef, userDoc.id), {
          teamId: null,
          role: null,
          position: null,
          number: null,
          updatedAt: serverTimestamp()
        })
      );
      
      await Promise.all(cleanupPromises);
      throw new Error('Team not found');
    }

    const team = teamDoc.data();
    const playerIds = team.players || [];
    
    // Get all user documents for the team members
    const usersRef = collection(db, 'users');
    const promises = playerIds.map((playerId: string) => getDoc(doc(usersRef, playerId)));
    const userDocs = await Promise.all(promises);
    
    // Get trainer document
    const trainerDoc = await getDoc(doc(usersRef, team.trainerId));
    
    const members: TeamMember[] = [];
    
    // Add trainer to members list
    if (trainerDoc.exists()) {
      const trainerData = trainerDoc.data();
      members.push({
        id: trainerDoc.id,
        name: trainerData.name,
        position: 'Coach',
        role: 'staff',
        status: 'active',
        number: null
      });
    }
    
    // Add players to members list
    userDocs.forEach(userDoc => {
      if (userDoc.exists()) {
        const userData = userDoc.data();
        members.push({
          id: userDoc.id,
          name: userData.name,
          position: userData.position as TeamMember['position'] || 'Unassigned',
          number: userData.number || null,
          role: 'player',
          status: (userData.status as TeamMember['status']) || 'active'
        });
      }
    });
    
    return members;
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    throw new Error(error.message || 'Failed to fetch team members');
  }
};

export const fixTrainerTeamAssociation = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    // Find the team where the current user is the trainer
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('trainerId', '==', currentUser.uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('No team found for this trainer');
    }

    const teamDoc = snapshot.docs[0];
    const teamId = teamDoc.id;

    // Update the trainer's user document with the team ID
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      teamId: teamId,
      updatedAt: serverTimestamp()
    });

    return teamId;
  } catch (error: any) {
    console.error('Error fixing trainer team association:', error);
    throw new Error(error.message || 'Failed to fix team association');
  }
};

export const deleteTeam = async (teamId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to delete team');
    }

    // Get the team to verify ownership
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }

    const teamData = teamDoc.data();
    if (teamData.trainerId !== currentUser.uid) {
      throw new Error('Only the team trainer can delete the team');
    }

    // Get all users who have this teamId (in case some users have stale references)
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('teamId', '==', teamId));
    const userDocs = await getDocs(q);
    
    // Clean up all users that have this teamId
    const userCleanupPromises = userDocs.docs.map(userDoc => 
      updateDoc(doc(usersRef, userDoc.id), {
        teamId: null,
        role: null,
        position: null,
        number: null,
        updatedAt: serverTimestamp()
      })
    );

    // Delete any pending invitations for this team
    const invitationsRef = collection(db, 'invitations');
    const invitationsQuery = query(invitationsRef, where('teamId', '==', teamId));
    const invitationDocs = await getDocs(invitationsQuery);
    const invitationCleanupPromises = invitationDocs.docs.map(invitationDoc => 
      deleteDoc(doc(invitationsRef, invitationDoc.id))
    );

    // Wait for all cleanup operations to complete
    await Promise.all([...userCleanupPromises, ...invitationCleanupPromises]);

    // Finally, delete the team document
    await deleteDoc(teamRef);

  } catch (error: any) {
    console.error('Error deleting team:', error);
    throw new Error(error.message || 'Failed to delete team');
  }
};

export const removePlayer = async (teamId: string, playerId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to remove player');
    }

    // Get the team to verify trainer permissions
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }

    const team = teamDoc.data();
    if (team.trainerId !== currentUser.uid) {
      throw new Error('Only the team trainer can remove players');
    }

    // Update the team document to remove the player
    await updateDoc(teamRef, {
      players: team.players.filter((id: string) => id !== playerId)
    });

    // Update the player's user document to remove team association
    const userRef = doc(db, 'users', playerId);
    await updateDoc(userRef, {
      teamId: null,
      position: null,
      number: null,
      role: null,
      updatedAt: serverTimestamp()
    });

  } catch (error: any) {
    console.error('Error removing player:', error);
    throw new Error(error.message || 'Failed to remove player');
  }
};

export const updateTeamName = async (teamId: string, newName: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to update team');
    }

    // Get the team to verify trainer permissions
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }

    const team = teamDoc.data();
    if (team.trainerId !== currentUser.uid) {
      throw new Error('Only the team trainer can update team name');
    }

    // Update the team name
    await updateDoc(teamRef, {
      name: newName,
      updatedAt: serverTimestamp()
    });

  } catch (error: any) {
    console.error('Error updating team name:', error);
    throw new Error(error.message || 'Failed to update team name');
  }
};

export const joinTeamByQR = async (teamId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to join team');
    }

    // Get user data to check if they're already in a team
    const userData = await getUser(currentUser.uid);
    if (userData?.teamId) {
      throw new Error('You are already part of a team');
    }

    // Get team data to verify it exists
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }

    // Update team players array
    await updateDoc(teamRef, {
      players: arrayUnion(currentUser.uid)
    });

    // Update user's team association
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      teamId: teamId,
      role: 'player',
      updatedAt: serverTimestamp()
    });

  } catch (error: any) {
    console.error('Error joining team:', error);
    throw new Error(error.message || 'Failed to join team');
  }
};

export const cleanupUserTeamAssociation = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      teamId: null,
      role: null,
      position: null,
      number: null,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    console.error('Error cleaning up user team association:', error);
    throw new Error(error.message || 'Failed to clean up team association');
  }
};

export const updateTeamSettings = async (teamId: string, settings: { allowPlayerInjuryReporting?: boolean }) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to update team settings');
    }

    // Get the team to verify trainer permissions
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }

    const team = teamDoc.data();
    if (team.trainerId !== currentUser.uid) {
      throw new Error('Only the team trainer can update team settings');
    }

    // Update the team settings
    await updateDoc(teamRef, {
      ...settings,
      updatedAt: serverTimestamp()
    });

  } catch (error: any) {
    console.error('Error updating team settings:', error);
    throw new Error(error.message || 'Failed to update team settings');
  }
};

// Export types
export type { DocumentData, QueryDocumentSnapshot, Timestamp };

// Export Firebase instances
export { auth, db };

// Export Firestore utilities
export {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
};

// Calendar Events Functions
export const getTeamEvents = async (teamId: string, startDate?: Date, endDate?: Date): Promise<Event[]> => {
  try {
    const eventsRef = collection(db, 'events');
    let queryConstraints: QueryConstraint[] = [where('teamId', '==', teamId)];

    if (startDate && endDate) {
      queryConstraints = [
        ...queryConstraints,
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate)),
        orderBy('startTime', 'asc')
      ];
    }

    const q = query(eventsRef, ...queryConstraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Event[];
  } catch (error: any) {
    console.error('Error fetching team events:', error);
    throw new Error(error.message || 'Failed to fetch team events');
  }
};

export const updateEvent = async (eventId: string, updates: Partial<Event>) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to update event');
    }

    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    // Only allow updates by the event creator or team trainer
    const event = eventDoc.data();
    const teamDoc = await getDoc(doc(db, 'teams', event.teamId));
    
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }

    if (event.createdBy !== currentUser.uid && teamDoc.data().trainerId !== currentUser.uid) {
      throw new Error('Only the event creator or team trainer can update this event');
    }

    await updateDoc(eventRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    console.error('Error updating event:', error);
    throw new Error(error.message || 'Failed to update event');
  }
};

export const deleteEvent = async (eventId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to delete event');
    }

    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    // Only allow deletion by the event creator or team trainer
    const event = eventDoc.data();
    const teamDoc = await getDoc(doc(db, 'teams', event.teamId));
    
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }

    if (event.createdBy !== currentUser.uid && teamDoc.data().trainerId !== currentUser.uid) {
      throw new Error('Only the event creator or team trainer can delete this event');
    }

    await deleteDoc(eventRef);
  } catch (error: any) {
    console.error('Error deleting event:', error);
    throw new Error(error.message || 'Failed to delete event');
  }
};

export const updateEventAttendance = async (eventId: string, userId: string, isAttending: boolean) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to update attendance');
    }

    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();
    console.log('Current event data:', {
      id: eventId,
      title: eventData.title,
      attendees: eventData.attendees || [],
      absentees: eventData.absentees || []
    });

    // Initialize arrays if they don't exist
    if (!eventData.attendees) {
      await updateDoc(eventRef, { attendees: [] });
    }
    if (!eventData.absentees) {
      await updateDoc(eventRef, { absentees: [] });
    }

    // Update the appropriate attendance array
    if (isAttending) {
      const updates = {
        attendees: arrayUnion(userId),
        absentees: arrayRemove(userId),
        updatedAt: serverTimestamp()
      };
      console.log('Applying updates for present:', updates);
      await updateDoc(eventRef, updates);
    } else {
      const updates = {
        attendees: arrayRemove(userId),
        absentees: arrayUnion(userId),
        updatedAt: serverTimestamp()
      };
      console.log('Applying updates for absent:', updates);
      await updateDoc(eventRef, updates);
    }

    // Verify the update
    const updatedDoc = await getDoc(eventRef);
    const updatedData = updatedDoc.data();
    console.log('Updated event data:', {
      id: eventId,
      title: updatedData?.title,
      attendees: updatedData?.attendees || [],
      absentees: updatedData?.absentees || []
    });

  } catch (error: any) {
    console.error('Error updating event attendance:', error);
    throw new Error(error.message || 'Failed to update attendance');
  }
};

// Chat functions
export const sendMessage = async (teamId: string, message: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to send messages');
    }

    const userData = await getUser(currentUser.uid);
    if (!userData) {
      throw new Error('User data not found');
    }

    const chatRef = doc(collection(db, 'teams', teamId, 'messages'));
    await setDoc(chatRef, {
      id: chatRef.id,
      userId: currentUser.uid,
      userName: userData.name,
      text: message,
      timestamp: serverTimestamp(),
      readBy: [currentUser.uid],
      edited: false,
    });

    return chatRef.id;
  } catch (error: any) {
    console.error('Error sending message:', error);
    throw new Error(error.message || 'Failed to send message');
  }
};

export const editMessage = async (teamId: string, messageId: string, newText: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to edit messages');
    }

    const messageRef = doc(db, 'teams', teamId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageDoc.data();
    if (messageData.userId !== currentUser.uid) {
      throw new Error('You can only edit your own messages');
    }

    await updateDoc(messageRef, {
      text: newText,
      edited: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error editing message:', error);
    throw new Error(error.message || 'Failed to edit message');
  }
};

export const deleteMessage = async (teamId: string, messageId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to delete messages');
    }

    const messageRef = doc(db, 'teams', teamId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageDoc.data();
    if (messageData.userId !== currentUser.uid) {
      throw new Error('You can only delete your own messages');
    }

    await deleteDoc(messageRef);
  } catch (error: any) {
    console.error('Error deleting message:', error);
    throw new Error(error.message || 'Failed to delete message');
  }
};

export const getMessages = (teamId: string, callback: (messages: any[]) => void) => {
  const messagesRef = collection(db, 'teams', teamId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    }));
    callback(messages.reverse());
  });
};

export const markMessageAsRead = async (teamId: string, messageId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to mark messages as read');
    }

    const messageRef = doc(db, 'teams', teamId, 'messages', messageId);
    await updateDoc(messageRef, {
      readBy: arrayUnion(currentUser.uid),
    });
  } catch (error: any) {
    console.error('Error marking message as read:', error);
    throw new Error(error.message || 'Failed to mark message as read');
  }
};

export const getEventAttendanceStatus = async (eventId: string): Promise<boolean> => {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();
    // Check if either attendees or absentees arrays exist and have entries
    return (eventData.attendees?.length > 0 || eventData.absentees?.length > 0) || false;
  } catch (error: any) {
    console.error('Error checking attendance status:', error);
    return false;
  }
};

export const getTeamAttendanceStats = async (teamId: string) => {
  try {
    // Get all events for the team
    const eventsRef = collection(db, 'events');
    const now = new Date();
    console.log('Current time:', now);
    
    const q = query(
      eventsRef,
      where('teamId', '==', teamId),
      orderBy('startTime', 'desc')
    );
    
    const eventDocs = await getDocs(q);
    console.log('Total events found:', eventDocs.size);
    
    let totalEvents = 0;
    let playerAttendance: Record<string, { present: number; total: number }> = {};

    // Get team members
    const teamMembers = await getTeamMembers(teamId);
    const playerMembers = teamMembers.filter(member => member.role === 'player');
    
    console.log('Team members:', playerMembers.map(p => ({ id: p.id, name: p.name })));
    
    // Initialize attendance records for all players
    playerMembers.forEach(player => {
      playerAttendance[player.id] = { present: 0, total: 0 };
    });

    // Process each event
    for (const doc of eventDocs.docs) {
      const event = doc.data();
      const eventDate = event.startTime.toDate();
      
      // Initialize arrays if undefined
      const attendees = event.attendees || [];
      const absentees = event.absentees || [];
      
      console.log('Processing event:', {
        id: doc.id,
        title: event.title,
        type: event.type,
        date: eventDate,
        attendees: attendees,
        absentees: absentees,
        hasMarkedAttendance: attendees.length > 0 || absentees.length > 0
      });

      // Check if attendance has been marked for any player
      const hasMarkedAttendance = attendees.length > 0 || absentees.length > 0;
      console.log('Has marked attendance:', hasMarkedAttendance);
      
      if (hasMarkedAttendance) {
        totalEvents++;
        console.log('Counting event:', event.title, 'Total events so far:', totalEvents);

        // For each player, check their attendance status
        playerMembers.forEach(player => {
          const playerId = player.id;
          if (attendees.includes(playerId)) {
            playerAttendance[playerId].present++;
            playerAttendance[playerId].total++;
            console.log(`${player.name} marked present for ${event.title}`);
          } else if (absentees.includes(playerId)) {
            playerAttendance[playerId].total++;
            console.log(`${player.name} marked absent for ${event.title}`);
          }
          // Only count in total if they were marked either present or absent
        });
      } else {
        console.log('Skipping event without marked attendance:', event.title);
      }
    }

    console.log('Final attendance records:', playerAttendance);
    console.log('Total events counted:', totalEvents);

    // Calculate player stats and team average
    let totalTeamPercentage = 0;
    let activePlayerCount = 0;

    const playerStats = playerMembers.map(player => {
      const attendance = playerAttendance[player.id] || { present: 0, total: 0 };
      const percentage = attendance.total > 0
        ? Math.round((attendance.present / attendance.total) * 100)
        : 0;
      
      if (attendance.total > 0) {
        totalTeamPercentage += percentage;
        activePlayerCount++;
      }

      return {
        id: player.id,
        name: player.name,
        number: player.number || '-',
        position: player.position || 'Unassigned',
        attendance: attendance,
        percentage: percentage
      };
    }).sort((a, b) => b.percentage - a.percentage);

    // Calculate team average only from players who have attendance records
    const teamAverage = activePlayerCount > 0
      ? Math.round(totalTeamPercentage / activePlayerCount)
      : 0;

    return {
      totalEvents,
      teamAverage,
      playerStats
    };

  } catch (error) {
    console.error('Error calculating attendance stats:', error);
    throw new Error('Failed to calculate attendance stats');
  }
};

// Get matches that need score submission or have pending player stats
export const getPendingMatchStats = async (teamId: string) => {
  try {
    console.log('Searching for pending match stats for team:', teamId);
    
    // First, get all completed matches from this team that don't have final stats
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('teamId', '==', teamId),
      where('type', '==', 'match'),
      where('status', '==', 'completed')
    );
    
    const eventsSnapshot = await getDocs(q);
    console.log('Found completed matches:', eventsSnapshot.docs.length);
    
    const matches = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Event);
    
    // For each match, check if there's a corresponding matchStats entry with final status
    const pendingMatches = [];
    
    for (const match of matches) {
      const matchStatsRef = doc(db, 'matchStats', match.id);
      const matchStatsSnap = await getDoc(matchStatsRef);
      
      if (!matchStatsSnap.exists() || matchStatsSnap.data()?.status !== 'final') {
        console.log('Found pending match:', match.id, match.title);
        pendingMatches.push(match);
      }
    }
    
    // Also check for matches that have ended but don't have a status of 'completed'
    // This catches matches that haven't been properly marked as completed
    const now = new Date();
    const pastMatchesQ = query(
      eventsRef,
      where('teamId', '==', teamId),
      where('type', '==', 'match')
    );
    
    const pastMatchesSnapshot = await getDocs(pastMatchesQ);
    const pastMatches = pastMatchesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as Event)
      .filter(match => {
        const endTime = match.endTime?.toDate() || null;
        return endTime && endTime < now && match.status !== 'completed';
      });
    
    console.log('Found past matches without completed status:', pastMatches.length);
    
    // For these matches, check if they already have match stats
    for (const match of pastMatches) {
      const matchStatsRef = doc(db, 'matchStats', match.id);
      const matchStatsSnap = await getDoc(matchStatsRef);
      
      if (!matchStatsSnap.exists() || matchStatsSnap.data()?.status !== 'final') {
        console.log('Found past match needing stats:', match.id, match.title);
        // Only add if not already in the pendingMatches array
        if (!pendingMatches.some(m => m.id === match.id)) {
          pendingMatches.push(match);
        }
      }
    }
    
    console.log('Total pending matches found:', pendingMatches.length);
    return pendingMatches;
  } catch (error) {
    console.error('Error getting pending match stats:', error);
    throw error;
  }
};

// Get player stats submissions that need trainer approval
export const getPendingPlayerStats = async (teamId: string) => {
  try {
    console.log('Searching for pending player stats for team:', teamId);
    
    // First, get all match IDs for this team
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('teamId', '==', teamId),
      where('type', '==', 'match')
    );
    
    const eventsSnapshot = await getDocs(q);
    const matchIds = eventsSnapshot.docs.map(doc => doc.id);
    console.log('Found matches for team:', matchIds.length);
    
    if (matchIds.length === 0) {
      console.log('No matches found for team, returning empty array');
      return [];
    }
    
    // Now get all pending player stats for these matches
    // Firestore has a limit of 10 items in 'in' queries, so we might need multiple queries
    let pendingStats: any[] = [];
    
    // Process in batches of 10
    for (let i = 0; i < matchIds.length; i += 10) {
      const batchIds = matchIds.slice(i, i + 10);
      console.log(`Processing batch ${i/10 + 1} with ${batchIds.length} matches`);
      
      const playerStatsRef = collection(db, 'playerMatchStats');
      const statsQuery = query(
        playerStatsRef,
        where('matchId', 'in', batchIds),
        where('status', '==', 'pending')
      );
      
      const statsSnapshot = await getDocs(statsQuery);
      const batchStats = statsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      console.log(`Found ${batchStats.length} pending stats in this batch`);
      pendingStats = [...pendingStats, ...batchStats];
    }
    
    console.log('Total pending player stats found:', pendingStats.length);
    
    if (pendingStats.length === 0) {
      console.log('No pending player stats found, returning empty array');
      return [];
    }
    
    // Get match details and player names for better display
    console.log('Enhancing pending stats with match and player details');
    const enhancedStats = await Promise.all(pendingStats.map(async (stat: any) => {
      const matchRef = doc(db, 'events', stat.matchId);
      const matchSnap = await getDoc(matchRef);
      const match = matchSnap.exists() ? matchSnap.data() : null;
      
      const playerRef = doc(db, 'users', stat.playerId);
      const playerSnap = await getDoc(playerRef);
      const player = playerSnap.exists() ? playerSnap.data() : null;
      
      return {
        ...stat,
        matchTitle: match?.title || 'Unknown Match',
        matchDate: match?.startTime || null,
        playerName: player?.name || 'Unknown Player',
      };
    }));
    
    console.log('Enhanced stats:', enhancedStats.length);
    return enhancedStats;
  } catch (error) {
    console.error('Error getting pending player stats:', error);
    throw error;
  }
};

// Get player stats statuses for a specific player
export const getPlayerStatsNotifications = async (playerId: string) => {
  try {
    console.log('Searching for player stats notifications for player:', playerId);
    
    // Define proper types for PlayerMatchStats and Event
    interface PlayerMatchStat {
      id: string;
      playerId: string;
      matchId: string;
      status: 'pending' | 'approved' | 'rejected';
      submittedAt: any;
      stats: any;
      comment?: string;
      [key: string]: any;
    }
    
    interface Event {
      id: string;
      teamId: string;
      title: string;
      type: 'match' | 'training' | 'meeting';
      startTime: Timestamp;
      endTime: Timestamp;
      location: string;
      description?: string;
      status?: 'scheduled' | 'completed' | 'cancelled';
      isOutdoor?: boolean;
      isAttendanceRequired?: boolean;
      attendees?: string[];
      absentees?: string[];
      createdAt?: Timestamp;
      updatedAt?: Timestamp;
      createdBy?: string;
      // Match-specific fields
      opponent?: string;
      isHomeGame?: boolean;
      formation?: string;
      roster?: {
        id: string;
        name: string;
        number: string;
        position: string;
        isStarter: boolean;
        fieldPosition?: string;
        status?: string;
      }[];
      scoreSubmitted?: boolean;
    }
    
    // Get all player match stats for this player
    const playerStatsRef = collection(db, 'playerMatchStats');
    const q = query(
      playerStatsRef,
      where('playerId', '==', playerId),
      orderBy('submittedAt', 'desc')
    );
    
    const statsSnapshot = await getDocs(q);
    const allStats = statsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as PlayerMatchStat[];
    
    // Extract different stat types
    const pendingStats = allStats.filter(stat => stat.status === 'pending');
    const approvedStats = allStats.filter(stat => stat.status === 'approved');
    const rejectedStats = allStats.filter(stat => stat.status === 'rejected');
    
    // Get match details for each stat
    const enhancedStats = await Promise.all(allStats.map(async (stat) => {
      const matchRef = doc(db, 'events', stat.matchId);
      const matchSnap = await getDoc(matchRef);
      const match = matchSnap.exists() ? matchSnap.data() : null;
      
      return {
        ...stat,
        matchTitle: match?.title || 'Unknown Match',
        matchDate: match?.startTime || null,
        opponent: match?.opponent || 'Unknown Team',
      };
    }));
    
    // Also find matches that need stats submission
    const eventsRef = collection(db, 'events');
    const matchesQuery = query(
      eventsRef,
      where('type', '==', 'match'),
      where('status', '==', 'completed')
    );
    
    const matchesSnapshot = await getDocs(matchesQuery);
    const completedMatches = matchesSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as Event[];
    
    // Filter for matches that include this player in the roster
    const playerMatches = completedMatches.filter(match => 
      match.roster?.some(player => player.id === playerId)
    );
    
    // Find matches that the player hasn't submitted stats for yet
    const matchesWithNoStats = playerMatches.filter(match => 
      !allStats.some(stat => stat.matchId === match.id)
    );
    
    const needsSubmission = matchesWithNoStats.map(match => ({
      id: match.id,
      matchTitle: match.title || 'Unknown Match',
      matchDate: match.startTime || null,
      opponent: match.opponent || 'Unknown Team'
    }));
    
    return {
      pendingApproval: enhancedStats.filter(stat => stat.status === 'pending'),
      approved: enhancedStats.filter(stat => stat.status === 'approved'),
      rejected: enhancedStats.filter(stat => stat.status === 'rejected'),
      needsSubmission
    };
  } catch (error) {
    console.error('Error getting player stats notifications:', error);
    throw error;
  }
};

// Create a notification
export const createNotification = async (data: {
  userId: string;
  type: 'stats_approved' | 'stats_rejected' | 'stats_released' | 'stats_needed' | 'approval_needed';
  title: string;
  message: string;
  relatedId?: string; // matchId or statId
  teamId: string;
}) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to create notifications');
    }
    
    const notificationRef = doc(collection(db, 'notifications'));
    await setDoc(notificationRef, {
      id: notificationRef.id,
      ...data,
      createdAt: serverTimestamp(),
      read: false
    });
    
    return notificationRef.id;
  } catch (error: any) {
    console.error('Error creating notification:', error);
    throw new Error(error.message || 'Failed to create notification');
  }
};

// Get notifications for a user
export const getUserNotifications = async (userId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('Auth error: User not authenticated when trying to get notifications');
      throw new Error('User must be authenticated to get notifications');
    }
    
    // Make sure users can only access their own notifications
    if (currentUser.uid !== userId) {
      console.log('Permission denied: User trying to access another user\'s notifications', {
        currentUserId: currentUser.uid,
        requestedUserId: userId
      });
      throw new Error('You can only access your own notifications');
    }
    
    console.log('Fetching notifications for user:', userId);
    
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20) // Limit to most recent 20 notifications
      );
      
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.docs.length} notifications for user ${userId}`);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (queryError: any) {
      console.error('Error in Firestore query for notifications:', queryError);
      console.log('Query details:', {
        userId,
        errorCode: queryError.code,
        errorMessage: queryError.message
      });
      throw new Error(`Database error: ${queryError.message}`);
    }
  } catch (error: any) {
    console.error('Error getting user notifications:', error);
    throw new Error(error.message || 'Failed to get notifications');
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to update notifications');
    }
    
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    throw new Error(error.message || 'Failed to update notification');
  }
};

// Delete a notification
export const deleteNotification = async (notificationId: string) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to delete notifications');
    }
    
    const notificationRef = doc(db, 'notifications', notificationId);
    await deleteDoc(notificationRef);
    
    console.log(`Notification ${notificationId} deleted successfully`);
    return true;
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    throw new Error(error.message || 'Failed to delete notification');
  }
};

// Remove match score requirement
export const deleteMatchScoreRequirement = async (teamId: string, matchId: string) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to update match requirements');
    }
    
    console.log(`Removing score requirement for match ${matchId}`);
    
    // Create a matchStats document to mark this as completed
    const matchStatsRef = doc(db, 'matchStats', matchId);
    
    // Check if it already exists
    const statsDoc = await getDoc(matchStatsRef);
    
    if (statsDoc.exists()) {
      // Update the existing document
      await updateDoc(matchStatsRef, {
        status: 'final',
        skipReasonNote: 'Marked as complete by trainer to skip score submission',
        skipReason: 'technical_issue',
        lastUpdatedBy: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create a new document
      await setDoc(matchStatsRef, {
        id: matchId,
        teamId: teamId,
        status: 'final',
        skipReasonNote: 'Marked as complete by trainer to skip score submission',
        skipReason: 'technical_issue',
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        lastUpdatedBy: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      });
    }
    
    // Also update the event to mark it as having scores
    const eventRef = doc(db, 'events', matchId);
    await updateDoc(eventRef, {
      scoreSubmitted: true,
      updatedAt: serverTimestamp()
    });

    // Delete any related notifications for this match
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('relatedId', '==', matchId),
      where('type', '==', 'stats_needed')
    );
    
    const notificationsSnapshot = await getDocs(notificationsQuery);
    const deletePromises = notificationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Match ${matchId} successfully marked as completed and notifications deleted`);
    return true;
  } catch (error: any) {
    console.error('Error removing match score requirement:', error);
    throw new Error(error.message || 'Failed to remove score requirement');
  }
};

// Check for past matches that need scoring and create notifications
export const checkAndCreateMatchScoreNotifications = async (teamId: string) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to check match notifications');
    }
    
    console.log('Checking for matches that need score submission for team:', teamId);
    
    // First verify the current user is the team trainer (has permission)
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }
    
    const trainerId = teamDoc.data().trainerId;
    if (!trainerId) {
      throw new Error('Team does not have a trainer assigned');
    }
    
    // Verify current user has permission (is team trainer)
    if (auth.currentUser.uid !== trainerId) {
      console.log('Current user is not the team trainer - skipping notification creation');
      return 0;
    }
    
    // Get all match events for this team
    const eventsRef = collection(db, 'events');
    const matchesQuery = query(
      eventsRef,
      where('teamId', '==', teamId),
      where('type', '==', 'match')
    );
    
    const matchesSnapshot = await getDocs(matchesQuery);
    const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Event);
    
    // Find matches that have already ended but don't have scores
    const now = new Date();
    const pastMatches = matches.filter(match => {
      // Check if match has ended
      const endTime = match.endTime?.toDate() || null;
      // Check if match doesn't have score already
      const scoreSubmitted = match.scoreSubmitted || false;
      
      return endTime && endTime < now && !scoreSubmitted;
    });
    
    console.log(`Found ${pastMatches.length} past matches without scores`);
    
    // Check for existing notifications for these matches
    const notificationsRef = collection(db, 'notifications');
    let notificationsCreated = 0;
    
    // Create notifications for matches without scores
    for (const match of pastMatches) {
      // Check if notification already exists for this match
      const notificationQuery = query(
        notificationsRef,
        where('relatedId', '==', match.id),
        where('type', '==', 'stats_needed')
      );
      
      try {
        const notificationSnapshot = await getDocs(notificationQuery);
        
        // Only create notification if one doesn't already exist
        if (notificationSnapshot.empty) {
          console.log(`Creating notification for match: ${match.title}`);
          
          // Format match date for display
          const matchDate = match.startTime?.toDate();
          const formattedDate = matchDate ? matchDate.toLocaleDateString() : 'Unknown date';
          
          // Create notification
          await createNotification({
            userId: trainerId,
            teamId: teamId,
            type: 'stats_needed',
            title: 'Match Score Needed',
            message: `Please submit the score for your match against ${match.opponent} on ${formattedDate}`,
            relatedId: match.id
          });
          
          notificationsCreated++;
        } else {
          console.log(`Notification already exists for match: ${match.title}`);
        }
      } catch (notificationError) {
        console.error(`Error checking notifications for match ${match.id}:`, notificationError);
        // Continue to next match even if this one fails
      }
    }
    
    console.log(`Created ${notificationsCreated} new notifications for matches without scores`);
    return notificationsCreated;
  } catch (error: any) {
    console.error('Error checking for match score notifications:', error);
    throw new Error(error.message || 'Failed to check for match notifications');
  }
}; 