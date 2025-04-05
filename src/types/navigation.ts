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
  Home: undefined;
  MainTabs: { screen?: string };
  Team: { teamId?: string };
  CreateTeam: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Schedule: undefined;
  ScheduleDetail: { eventId: string; eventType: string };
  Attendance: {
    eventId: string;
    eventType: string;
    title: string;
    date: Date;
    time: Date;
    location: string;
    notes?: string;
  };
  AttendanceDetails: undefined;
  ConnectPlayers: undefined;
  PlayerProfile: { playerId: string };
  AllAnnouncements: undefined;
  Announcement: undefined;
  Chat: undefined;
  FormationSetup: {
    formation: string;
    players: Array<{
      id: string;
      name: string;
      position?: string;
      number?: string;
    }>;
    onComplete: (positions: any) => void;
  };
  LineupScreen: {
    matchId: string;
    teamId: string;
  };
  MatchDetails: {
    matchDetails: {
      id: string;
      title: string;
      date: Date;
      time: Date;
      location: string;
      isHomeGame: boolean;
      opponent: string;
      formation: string;
      players: Array<{
        id: string;
        name: string;
        position?: string;
        number?: string;
      }>;
      notes?: string;
    };
  };
  MatchStats: {
    matchId: string;
    isHomeGame: boolean;
  };
  UploadMatchStats: {
    matchId: string;
  };
  SubmitPlayerStats: {
    matchId: string;
    playerId: string;
    isGoalkeeper?: boolean;
  };
  Notifications: undefined;
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