export interface SelectedPlayer {
  id: string;
  name: string;
  number: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  isStarter: boolean;
  fieldPosition?: string;
  status?: 'active' | 'injured';
}

export interface Formation {
  id: string;
  name: string;
  positions: string[];
}

export interface PlayerPosition {
  x: number;
  y: number;
  position: string;
  player?: SelectedPlayer;
} 