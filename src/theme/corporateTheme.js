// src/theme/corporateTheme.js
import { createTheme } from '@mui/material/styles';

export const corporateTheme = createTheme({
  palette: {
    primary: {
      main: '#3B82F6', // Azul corporativo
      light: '#60A5FA',
      dark: '#1D4ED8',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#8B5CF6', // Púrpura para vacaciones
      light: '#A78BFA',
      dark: '#7C3AED',
      contrastText: '#ffffff'
    },
    success: {
      main: '#10B981', // Verde para dinero/sueldos
      light: '#34D399',
      dark: '#059669',
      contrastText: '#ffffff'
    },
    warning: {
      main: '#F59E0B', // Naranja para horas extras
      light: '#FBBF24',
      dark: '#D97706',
      contrastText: '#ffffff'
    },
    error: {
      main: '#EF4444', // Rojo suave para permisos
      light: '#F87171',
      dark: '#DC2626',
      contrastText: '#ffffff'
    },
    info: {
      main: '#D97706', // Amarillo dorado para desayuno
      light: '#F59E0B',
      dark: '#B45309',
      contrastText: '#ffffff'
    }
  },
  shape: {
    borderRadius: 16 // Bordes más redondeados MD3
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700
    },
    h6: {
      fontWeight: 600
    },
    body1: {
      fontWeight: 500
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.08)',
          transition: 'all 0.3s ease'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600
        }
      }
    }
  }
});
