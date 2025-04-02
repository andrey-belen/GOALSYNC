import { Timestamp, FieldValue } from 'firebase/firestore';
import { UserType } from '../firebase.config';
import { SelectedPlayer } from './formation';

export interface User {
  id: string;
  email: string;
  name: string;
  type: UserType;
  teamId?: string;  // Optional since not all users will be part of a team
  number?: string;
  position?: string;
  photoURL?: string;
  createdAt: Timestamp;
}

export interface Team {
  id: string;
  name: string;
  trainerId: string;
  players: string[]; // array of player IDs
  createdAt: Timestamp;
  allowPlayerInjuryReporting: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  number?: string | null;
  position?: 'GK' | 'DEF' | 'MID' | 'FWD' | 'Coach' | 'Unassigned';
  role: 'staff' | 'player';
  status: 'active' | 'injured' | 'inactive';
}

export interface Event {
  id: string;
  teamId: string;
  title: string;
  type: 'training' | 'match' | 'meeting';
  startTime: Timestamp;
  endTime: Timestamp;
  location: string;
  description?: string;
  isOutdoor?: boolean;
  isAttendanceRequired?: boolean;
  // Match specific fields
  opponent?: string;
  isHomeGame?: boolean;
  formation?: string;
  roster?: {
    id: string;
    name: string;
    number: string;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    isStarter: boolean;
    fieldPosition?: string;
    status?: 'active' | 'injured';
  }[];
  // Attendance tracking
  attendees?: string[];
  absentees?: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'scheduled' | 'completed' | 'cancelled';
  homeTeam: string;
  awayTeam: string;
  attendance?: {
    playerId: string;
    attended: boolean;
  }[];
}

export interface Attendance {
  id: string;
  eventId: string;
  userId: string;
  status: 'present' | 'absent' | 'late';
  timestamp: Timestamp;
}

export interface Announcement {
  id: string;
  teamId: string;
  title: string;
  message: string;
  createdBy: string;
  createdAt: Timestamp;
  readBy: string[]; // array of user IDs
  priority: 'normal' | 'high';
}

export interface Message {
  id: string;
  userId: string;
  text: string;
  timestamp: Timestamp;
  readBy: string[];
  type?: 'message' | 'announcement' | 'event';
  announcementData?: {
    title: string;
    priority: 'normal' | 'high';
  };
  eventData?: {
    id: string;
    type: 'training' | 'match' | 'meeting';
    title: string;
    startTime: Timestamp;
    location: string;
  };
}

export interface Chat {
  id: string;
  teamId: string;
  messages: Message[];
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  type: UserType;
  teamId?: string;
  number?: string;
  position?: 'GK' | 'DEF' | 'MID' | 'FWD' | 'ST';
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface PlayerMatchStats {
  id: string;
  matchId: string;
  playerId: string;
  stats: {
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    minutesPlayed: number;
    shotsOnTarget: number;
    saves?: number; // for goalkeepers
    cleanSheet?: boolean; // for goalkeepers
  };
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  comments?: string;
}

export interface MatchStats {
  id: string;
  matchId: string;
  score: {
    home: number;
    away: number;
  };
  possession: number; // percentage for home team
  status: 'draft' | 'final';
  playerStats: string[]; // array of PlayerMatchStats IDs
  submittedBy: string;
  submittedAt: Timestamp;
  updatedAt: Timestamp;
}

// Helper type for Firestore documents
export type WithId<T> = T & { id: string };

// Helper type for Firestore document snapshots
export type DocSnapshot<T> = {
  id: string;
  data(): T | undefined;
  exists(): boolean;
};

export type QuerySnapshot<T> = {
  docs: DocSnapshot<T>[];
  empty: boolean;
}; 