import { createTheme, responsiveFontSizes } from '@mui/material/styles';

export let corporateTheme = createTheme({
  palette: {
    primary: {
      main: '#3B82F6', // Un azul vibrante para elementos principales
      light: '#60A5FA',
      dark: '#1D4ED8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6B7280', // Un gris oscuro para texto secundario y iconos
      light: '#9CA3AF',
      dark: '#4B5563',
    },
    success: {
      main: '#059669', // Verde para totales positivos
      light: '#34D399',
      dark: '#047857',
    },
    error: {
      main: '#DC2626', // Rojo para deducciones o alertas
      light: '#F87171',
      dark: '#B91C1C',
    },
    warning: {
      main: '#F59E0B', // Naranja para elementos de precaución (ej. paga extra)
      light: '#FCD34D',
      dark: '#B45309',
    },
    info: {
      main: '#2563EB', // Azul para información
      light: '#3B82F6',
      dark: '#1E40AF',
    },
    text: {
      primary: '#111827', // Texto principal muy oscuro
      secondary: '#374151', // Texto secundario
      disabled: '#9CA3AF',
    },
    background: {
      default: '#F9FAFB', // Fondo principal muy claro
      paper: '#FFFFFF', // Fondo de tarjetas y componentes
    },
    divider: '#E5E7EB', // Líneas divisorias
  },
  typography: {
    fontFamily: ['Inter', 'Roboto', 'sans-serif'].join(','),
    h4: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
    button: {
      textTransform: 'none', // Botones con texto normal
      fontWeight: 600,
    },
  },
  spacing: 4, // Establecer el espaciado base a 4px (sistema de cuadrícula de 4 puntos)
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px', // Bordes más suaves para las tarjetas
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
        outlined: {
          borderColor: '#D1D5DB',
          color: '#4B5563',
          '&:hover': {
            borderColor: '#9CA3AF',
            backgroundColor: '#F3F4F6',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.9rem',
          color: '#6B7280',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          fontSize: '0.95rem',
          paddingTop: '12px',
          paddingBottom: '12px',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.95rem',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#E5E7EB',
          borderStyle: 'dashed', // Estilo más moderno para divisores
        },
      },
    },
  },
});

corporateTheme = responsiveFontSizes(corporateTheme); // Ajusta automáticamente los tamaños de fuente para la responsividad

export default corporateTheme;