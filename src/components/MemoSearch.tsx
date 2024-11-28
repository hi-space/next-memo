import React, { useState } from 'react';
import { Search, Filter } from '@mui/icons-material';
import {
  Box,
  TextField,
  MenuItem,
  Paper,
  IconButton,
  Popover,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import InputAdornment from '@mui/material/InputAdornment';
import PriorityBadge from './PriorityBadge';
import { Priority, priorityEmojis } from '@/types/priority';

interface MemoSearchProps {
  onSearch: (value: string) => void;
  onFilter: (value: Priority) => void;
}

const MemoSearch: React.FC<MemoSearchProps> = ({ onSearch, onFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priority, setPriority] = useState<keyof typeof priorityEmojis>(3);
  const [priorityAnchorEl, setPriorityAnchorEl] =
    useState<HTMLButtonElement | null>(null);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: '0.7rem',
        backgroundColor: 'background.paper',
        border: '1px solid #e0e0e0',
      }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
        }}>
        <TextField
          fullWidth
          placeholder='메모 검색...'
          value={searchTerm}
          onChange={handleSearch}
          variant='standard'
          sx={{
            flex: 1,
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search
                    sx={{ color: 'text.secondary', width: 20, height: 20 }}
                  />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={(e) => setPriorityAnchorEl(e.currentTarget)}
            sx={{ p: 0 }}>
            <PriorityBadge priority={priority} />
          </IconButton>

          <Popover
            open={Boolean(priorityAnchorEl)}
            anchorEl={priorityAnchorEl}
            onClose={() => setPriorityAnchorEl(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            sx={{
              '& .MuiPopover-paper': {
                width: 'fit-content',
                marginTop: 0.5,
                '& .MuiMenuItem-root': {
                  width: '100%',
                },
              },
            }}>
            <Box
              sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                width: '100%',
              }}>
              {Object.entries(priorityEmojis).map(([value]) => {
                const priorityValue = Number(value) as Priority;
                return (
                  <MenuItem
                    key={value}
                    onClick={() => {
                      setPriority(priorityValue);
                      setPriorityAnchorEl(null);
                      onFilter(priorityValue);
                    }}
                    dense
                    selected={priority === priorityValue}
                    sx={{
                      borderRadius: 1,
                      py: 1,
                      width: '100%',
                      justifyContent: 'flex-start',
                    }}>
                    <PriorityBadge priority={priorityValue} size='small' />
                  </MenuItem>
                );
              })}
            </Box>
          </Popover>
        </Box>
      </Box>
    </Paper>
  );
};

export default MemoSearch;
