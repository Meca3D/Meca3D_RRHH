
// src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import AppRoutes from './routes';
import LoadingScreen from './components/Layout/LoadingScreen';
import SnackbarProvider from './components/UI/SnackbarProvider';
import { ThemeProvider } from '@mui/material/styles';
import { corporateTheme } from './theme/corporateTheme';
import { standarTheme } from './theme/standardTheme';



  function App() {
    useEffect(() => {
      console.log("App.jsx: Llamando a initAuthListener desde useEffect.");
      useAuthStore.getState().initAuthListener();
    }, []);
  
const { loading: authLoading } = useAuthStore(); // ✅ Ya no necesitas initializeAuth
  const { loading: uiLoading } = useUIStore();
    console.log("App.jsx: authLoading =", authLoading, "uiLoading =", uiLoading);


  if (authLoading || uiLoading) {
    console.log("App.jsx: Mostrando LoadingScreen.");
    return <LoadingScreen />;
  }
  
console.log("App.jsx: Carga de autenticación y UI completada, renderizando AppRoutes.");
 
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