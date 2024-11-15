import React from 'react';
import { Chip } from '@mui/material';
import { Priority, getPriorityConfig } from '../types/priority';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'small' | 'medium';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'small',
}) => {
  const { emoji, label } = getPriorityConfig(priority);

  const colors: Record<Priority, 'info' | 'success' | 'warning' | 'error'> = {
    1: 'info',
    2: 'success',
    3: 'warning',
    4: 'warning',
    5: 'error',
  };

  return (
    <Chip
      icon={
        <span style={{ fontSize: size === 'small' ? '0.875rem' : '1rem' }}>
          {emoji}
        </span>
      }
      size={size}
      color={colors[priority]}
      variant='outlined'
      sx={{
        '& .MuiChip-icon': {
          ml: 0.5,
          mr: -0.5,
        },
        height: size === 'small' ? 24 : 32,
        borderRadius: '12px',
      }}
      label={label}
    />
  );
};

export default PriorityBadge;
