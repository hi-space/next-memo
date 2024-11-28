import React, { useState } from 'react';
import { Search, Filter } from '@mui/icons-material';
import {
  Box,
  TextField,
  MenuItem,
  Paper,
  IconButton,
  Popover,
  Typography,
  Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import InputAdornment from '@mui/material/InputAdornment';
import PriorityBadge from './PriorityBadge';
import { Priority, priorityEmojis } from '@/types/priority';
import { Emojis } from '@/types/emoji';

interface MemoSearchProps {
  onSearch: (value: string) => void;
  onPriorityFilter: (value: Priority | null) => void;
  onPrefixFilter: (value: string) => void;
  onRefresh: () => void;
}

const MemoSearch: React.FC<MemoSearchProps> = ({
  onSearch,
  onPriorityFilter,
  onPrefixFilter,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [prefix, setPrefix] = useState('');
  const [priorityAnchorEl, setPriorityAnchorEl] =
    useState<HTMLButtonElement | null>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(
    null
  );

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
          gap: 2,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
        }}>
        <Popover
          open={Boolean(emojiAnchorEl)}
          anchorEl={emojiAnchorEl}
          onClose={() => setEmojiAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}>
          <Box
            sx={{
              p: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))',
              gap: 0.5,
              width: 'fit-content',
              maxWidth: '200px',
            }}>
            <MenuItem
              dense
              onClick={() => {
                setPrefix('');
                setEmojiAnchorEl(null);
                onPrefixFilter('');
              }}
              sx={{
                minWidth: '32px',
                justifyContent: 'center',
                padding: '4px',
              }}>
              <em>❌</em>
            </MenuItem>
            {Emojis.map((emoji) => (
              <MenuItem
                key={emoji}
                onClick={() => {
                  setPrefix(emoji);
                  setEmojiAnchorEl(null);
                  onPrefixFilter(emoji);
                }}
                dense
                sx={{
                  minWidth: '32px',
                  justifyContent: 'center',
                  padding: '4px',
                }}>
                {emoji}
              </MenuItem>
            ))}
          </Box>
        </Popover>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1 }}>
          <IconButton
            size='small'
            onClick={(e) => setEmojiAnchorEl(e.currentTarget)}
            sx={{
              width: 32,
              height: 32,
              fontSize: '1.2rem',
              mb: 0.5,
              flexShrink: 0,
            }}>
            {prefix || <EmojiEmotionsIcon sx={{ fontSize: '1.2rem' }} />}
          </IconButton>

          <TextField
            fullWidth
            placeholder='메모 검색...'
            value={searchTerm}
            onChange={handleSearch}
            variant='standard'
            sx={{ flex: 1, minWidth: 100 }}
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
        </Box>

        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <IconButton
            onClick={(e) => setPriorityAnchorEl(e.currentTarget)}
            sx={{ p: 0 }}>
            {priority !== null ? (
              <PriorityBadge priority={priority} />
            ) : (
              <Chip
                icon={
                  <span
                    style={{
                      fontSize: '0.875rem',
                    }}>
                    ⚪
                  </span>
                }
                size='small'
                variant='outlined'
                sx={{
                  '& .MuiChip-icon': {
                    ml: 0.5,
                    mr: -0.5,
                  },
                  height: 24,
                  borderRadius: '12px',
                }}
                label='전체'
              />
            )}
          </IconButton>

          <IconButton
            onClick={() => onRefresh()}
            size='small'
            sx={{
              p: 0.5,
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
              },
            }}>
            <RefreshIcon />
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
              <MenuItem
                onClick={() => {
                  setPriority(null);
                  setPriorityAnchorEl(null);
                  onPriorityFilter(null);
                }}
                dense
                selected={priority === null}
                sx={{
                  borderRadius: 1,
                  py: 1,
                  width: '100%',
                  justifyContent: 'flex-start',
                }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    icon={
                      <span
                        style={{
                          fontSize: '0.875rem',
                        }}>
                        ⚪
                      </span>
                    }
                    size='small'
                    variant='outlined'
                    sx={{
                      '& .MuiChip-icon': {
                        ml: 0.5,
                        mr: -0.5,
                      },
                      height: 24,
                      borderRadius: '12px',
                    }}
                    label='전체'
                  />
                </Box>
              </MenuItem>
              {Object.entries(priorityEmojis).map(([value]) => {
                const priorityValue = Number(value) as Priority;
                return (
                  <MenuItem
                    key={value}
                    onClick={() => {
                      setPriority(priorityValue);
                      setPriorityAnchorEl(null);
                      onPriorityFilter(priorityValue);
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
