import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#757575', // 607d8b
    },
    success: {
      main: '#388E3C', //  그린
    },
    error: {
      main: '#C62828', //  레드
    },
    info: {
      main: '#0277BD', //  블루
    },
    warning: {
      main: '#EF6C00', //  오렌지
    },
    background: {
      default: '#F8F8F7',
      paper: '#ffffff',
    },
  },
});
