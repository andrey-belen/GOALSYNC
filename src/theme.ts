export const theme = {
  colors: {
    background: '#1a1f3d',
    primary: '#e17777',
    success: '#2ecc71',
    error: '#e74c3c',
    warning: '#f1c40f',
    white: '#ffffff',
    card: '#2a2f4d',
    text: {
      primary: '#ffffff',
      secondary: '#a0a0a0',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 25,
  }
};

export type Theme = typeof theme;

interface Match {
  // Your own data that you collect manually
  ownStats: {
    score: {
      home: number;
      away: number;
    };
    players: Array<{
      id: string;
      goals: number;
      assists: number;
      // etc
    }>;
  };
  
  // Just a reference to display the official widget
  fussballDe?: {
    matchId: string;
    // NO data from fussball.de, just the ID to show the widget
  };
} 