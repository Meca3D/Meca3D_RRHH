
// src/App.jsx
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import AppRoutes from './routes';
import LoadingScreen from './components/Layout/LoadingScreen';
import SnackbarProvider from './components/UI/SnackbarProvider';
import { ThemeProvider } from '@mui/material/styles';
import { corporateTheme } from './theme/corporateTheme';
import { standarTheme } from './theme/standardTheme';


  function App() {
  useFirebaseAuth();
  
  const { loading: authLoading } = useAuthStore();
  const { loading: uiLoading } = useUIStore();

  if (authLoading || uiLoading) {
    return <LoadingScreen />;
  }
  return (
    <ThemeProvider theme={standarTheme}>
      <CssBaseline />
      <BrowserRouter>
        <SnackbarProvider />
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;