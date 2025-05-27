// src/components/Layout/MainLayout.jsx
import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, IconButton, Container, List,ListItem,ListItemButton,
  Box, Menu, MenuItem, Avatar, Button, Divider,Drawer,ListItemIcon,ListItemText
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PaymentIcon from '@mui/icons-material/Payment';
import { useRol} from '../../hooks/useRol';
import { Link, useLocation } from 'react-router-dom';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { useAuth } from '../../hooks/useAuth';
import { getUsuario } from '../../firebase/firestore';
import UserProfile from '../UI/UserProfile';

const MainLayout = ({children}) => {
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const { currentUser} = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userData,setUserData] = useState(null)
  const { isAdmin } = useRol();
  const drawerWidth = 240;
  // Actualizar MainLayout.jsx para incluir nuevas secciones
const menuItems = [
  { name: 'Desayunos', path: '/desayunos/orders', icon: RestaurantIcon },
  { name: 'Mis Nóminas', path: '/nominas', icon: PaymentIcon },
  { name: 'Vacaciones', path: '/vacaciones', icon: BeachAccessIcon },
  { name: 'Horas Extra', path: '/horas-extra', icon: AccessTimeIcon }
];

    
  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser && currentUser.email) {
        try {
          setLoading(true);
          const usuario = await getUsuario(currentUser.email);
          if (usuario) {
            setUserData(usuario);
          } else {
            // Si no hay datos en Firestore, usar los datos de Auth
            setUserData({
              id: currentUser.email,
              nombre: currentUser.displayName || currentUser.email,
              email: currentUser.email,
              photoURL: currentUser.photoURL
            });
          }
        } catch (error) {
          console.error("Error al obtener datos del usuario:", error);
          // En caso de error, usar datos de Auth como fallback
          setUserData({
            id: currentUser.email,
            nombre: currentUser.displayName || currentUser.email,
            email: currentUser.email
            
          });
        } finally {
          setLoading(false);
        }
        } else {
      // Si no hay usuario, cerrar el perfil
      setProfileOpen(false);
      setUserData(null);
    }
  };
    fetchUserData();
  }, [currentUser]);
  
    const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };


const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Desayunos App
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItemButton
          component={Link} 
          to="/orders"
          selected={location.pathname.startsWith('/orders')}
          onClick={() => {
            if (mobileOpen) {
              handleDrawerToggle();
             }
            }}
        >
          <ListItemIcon>
            <RestaurantIcon />
          </ListItemIcon>
          <ListItemText primary="Pedidos" />
        </ListItemButton>
        
        {isAdmin && (
          <ListItemButton
            component={Link} 
            to="/admin"
            selected={location.pathname.startsWith('/admin')}
              onClick={() => {
            if (mobileOpen) {
              handleDrawerToggle();
               }}}
          >
            <ListItemIcon>
              <AdminPanelSettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Administrar" />
          </ListItemButton>
        )}
      </List>
    </div>
  );

  // Excluir el layout en la página de login
  if (location.pathname === '/login') {
    return children;
  }

 return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {location.pathname.includes('/admin') ? 'Panel de Administración' : 'Pedidos de Desayuno'}
          </Typography>
          {currentUser && (
           <> 
          <IconButton onClick={() => setProfileOpen(true)}>
            <Avatar src={userData?.photoURL} />
            </IconButton>
            <UserProfile 
              open={profileOpen} 
              onClose={() => setProfileOpen(false)}
              user={userData}
              loading={loading}
              />
              </>
          )}
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
<Box
  component="main"
  sx={{ 
    flexGrow: 1, 
    p: { xs: 1, sm: 3 }, 
    width: { sm: `calc(100% - ${drawerWidth}px)` },
    maxWidth: '100vw',
    marginTop: '64px',
    overflow: 'hidden',
    boxSizing: 'border-box'
  }}
>
  {children}
</Box>
    </Box>
  );
};

export default MainLayout;