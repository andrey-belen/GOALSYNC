import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface FootballIconProps {
  size?: number;
  color?: string;
}

export const FootballIcon: React.FC<FootballIconProps> = ({
  size = 100,
  color = '#e17777',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
        fill={color}
      />
      <Path
        d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm3.89 11.89l-3.89-2.89V7h2v4.11l2.89 2.89-1 1z"
        fill={color}
        fillOpacity={0.5}
      />
    </Svg>
  );
}; 