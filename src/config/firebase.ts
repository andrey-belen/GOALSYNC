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
    if (!userData || userData.teamId !== teamId) {
      throw new Error('You can only view announcements for your own team');
    }

    const q = query(
      collection(db, 'announcements'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
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