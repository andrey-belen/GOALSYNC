import { NavigatorScreenParams } from '@react-navigation/native';
import { UserType } from '../firebase.config';
import { SelectedPlayer } from './formation';
import { Event, Announcement } from './database';

interface MatchDetails {
  id: string;
  title: string;
  date: Date;
  time: Date;
  location: string;
  isHomeGame: boolean;
  opponent: string;
  formation: string;
  players: SelectedPlayer[];
  notes?: string;
}

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Login: undefined;
  Register: { userType: UserType };
  UserType: undefined;
  Profile: undefined;
  TeamManagement: undefined;
  Announcement: undefined;
  Schedule: undefined;
  QRScanner: undefined;
  FormationTemplate: {
    onFormationSelect: (formation: string) => void;
  };
  FormationSetup: {
    formation: string;
    players?: SelectedPlayer[];
    onComplete?: (players: SelectedPlayer[]) => void;
    id?: string;
    title?: string;
    date?: Date;
    time?: Date;
    location?: string;
    isHomeGame?: boolean;
    opponent?: string;
    notes?: string;
  };
  MatchDetails: {
    matchDetails: MatchDetails;
  };
  MatchConfirmation: {
    matchDetails: MatchDetails;
  };
  Attendance: {
    eventId: string;
    eventType: string;
    title: string;
    date: Date;
    time: Date;
    location: string;
    notes?: string;
  };
  Reports: undefined;
  Formation: {
    onFormationSet: (formation: string, positions: any) => void;
    selectedFormation?: string;
    selectedPositions?: string[];
    isMatchFormation?: boolean;
  };
  EventDetails: {
    eventId: string;
    title: string;
    type: 'training' | 'match' | 'meeting';
    date: Date;
    time: Date;
    location: string;
    notes?: string;
  };
  EditEvent: { eventId: string };
  CreateEvent: undefined;
  Chat: { teamId: string };
  AttendanceDetails: undefined;
  ForgotPassword: undefined;
  PlayerAttendanceHistory: {
    userId: string;
    userName: string;
    stats: {
      teamId: string;
      attendance: {
        present: number;
        total: number;
      };
      percentage: number;
    };
  };
  AllAnnouncements: undefined;
  AnnouncementDetails: {
    announcement: Announcement;
  };
  MatchStats: {
    matchId: string;
    isHomeGame: boolean;
  };
  UploadMatchStats: {
    matchId: string;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Team: {
    refresh?: number;
    selectedFilter?: 'all' | 'players' | 'staff' | 'injured';
  };
  Calendar: undefined;
  Chat: {
    teamId: string;
  };
  Profile: undefined;
};

export type AuthStackParamList = {
  UserType: undefined;
  Register: { userType: UserType };
  Login: undefined;
  ForgotPassword: undefined;
}; 