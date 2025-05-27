
// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './components/Auth/AuthContext';
import Login from './components/Auth/Login';
import OrderList from './components/Orders/OrderList';
import OrderDetail from './components/Orders/OrderDetail';
import CreateOrder from './components/Orders/CreateOrder';
import MainLayout from './components/Layout/MainLayout';
import Loading from './components/Layout/Loading';
import AppRoutes from './routes'

// Crear tema personalizado
const theme = createTheme({
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
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
         <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;