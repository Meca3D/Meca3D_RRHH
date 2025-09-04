// Crear tema personalizado

import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
export const standarTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Azul estándar de Material UI
      light: '#63a4ff',
      dark: '#004ba0',
    },
    secondary: {
      main: '#f50057', // Rosa para acentos
      light: '#ff5983',
      dark: '#bb002f',
    },
    background: {
      default: '#f5f5f5', // Un fondo gris muy claro
    },

    azul: {
        main:'#3B82F6',
        fondo: alpha('#3B82F6',0.1),
        fondoFuerte: alpha('#3B82F6',0.3)
    },
    verde: {
        main:'#129569ff',
        fondo: alpha('#129569',0.1),
        fondoFuerte: alpha('#129569',0.3)
    },
    naranja: {
        main:'#FB8C00',
        fondo: alpha('#FFA726',0.1),
        fondoFuerte: alpha('#FFA726',0.3)
    },
    rojo: {
        main:'#EF4444',
        fondo: alpha('#EF4444',0.1),
        fondoFuerte: alpha('#EF4444',0.3)
    },
    purpura: {
        main:'#7B1FA2',
        fondo: alpha('#7B1FA2',0.1),
        fondoFuerte: alpha('#7B1FA2',0.3)
    },
    dorado: {
        main:'#6D3B07',
        fondo: alpha('#6D3B07',0.1),
        fondoFuerte: alpha('#6D3B07',0.3)
    },

    comida: {
      main: '#fbc02d', 
    },
    bebida: {
      main: '#6d4c41', 
    },
  
    favoritos: {
      main: '#f44336', 
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif']
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  });