// src/components/Layout/MainLayout.jsx
import { useEffect, useState } from 'react';
import { useNavigate , Outlet} from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, IconButton, Box, 
  Avatar, Drawer, List, ListItemButton, ListItemIcon, 
  ListItemText, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PaymentIcon from '@mui/icons-material/Payment';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useRol } from '../../hooks/useRol';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getUsuario } from '../../firebase/firestore';
import UserProfile from '../UI/UserProfile';

const MainLayout = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const { currentUser } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const { isAdmin } = useRol();
  const drawerWidth = 280; // Aumentar un poco el ancho

  // Menú principal modernizado
  const menuItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: DashboardIcon, 
      color: 'primary',
      description: 'Vista general'
    },
    { 
      name: 'Desayunos', 
      path: '/desayunos/orders', 
      icon: RestaurantIcon, 
      color: 'secondary',
      description: 'Pedidos de los sábados'
    },
    { 
      name: 'Mis Nóminas', 
      path: '/nominas', 
      icon: PaymentIcon, 
      color: 'success',
      description: 'Consultar nóminas'
    },
    { 
      name: 'Vacaciones', 
      path: '/vacaciones', 
      icon: BeachAccessIcon, 
      color: 'info',
      description: 'Solicitar vacaciones'
    },
    { 
      name: 'Horas Extra', 
      path: '/horas-extra', 
      icon: AccessTimeIcon, 
      color: 'warning',
      description: 'Registrar horas'
    }
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
            setUserData({
              id: currentUser.email,
              nombre: currentUser.displayName || currentUser.email,
              email: currentUser.email,
              photoURL: currentUser.photoURL
            });
          }
        } catch (error) {
          console.error("Error al obtener datos del usuario:", error);
          setUserData({
            id: currentUser.email,
            nombre: currentUser.displayName || currentUser.email,
            email: currentUser.email
          });
        } finally {
          setLoading(false);
        }
      } else {
        setProfileOpen(false);
        setUserData(null);
      }
    };
    fetchUserData();
  }, [currentUser]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerClose = () => {
  setMobileOpen(false);
};

  const getPageTitle = () => {
    if (location.pathname === '/dashboard') return 'Dashboard Principal';
    if (location.pathname.startsWith('/admin')) return 'Administración';
    if (location.pathname.startsWith('/desayunos')) return 'Desayunos';
    if (location.pathname.startsWith('/nominas')) return 'Mis Nóminas';
    if (location.pathname.startsWith('/vacaciones')) return 'Mis Vacaciones';
    if (location.pathname.startsWith('/horas-extra')) return 'Mis Horas Extra';
    return 'RRHH App';
  };

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <Toolbar  sx={{ textAlign:"center", bgcolor: 'primary.main', color: 'white' }}>
        <Typography  variant="h6" noWrap component="div" fontWeight="bold">
          MecaFormas 3D
        </Typography>
      </Toolbar>
      
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="textSecondary" textAlign="center">
          Bienvenido, {userData?.nombre || 'Usuario'}
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ px: 1, py: 2 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isSelected = location.pathname === item.path || 
                           (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <ListItemButton
              key={item.name}
              component={Link}
              to={item.path}
              selected={isSelected}
              onClick={handleDrawerClose}
              sx={{
                borderRadius: 2,
                mb: 1,
                py: 1.5,
                '&.Mui-selected': {
                  backgroundColor: `${item.color}.light`,
                  '&:hover': {
                    backgroundColor: `${item.color}.light`,
                  },
                  '& .MuiListItemIcon-root': {
                    color: `${item.color}.main`,
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: 600,
                    color: `${item.color}.main`,
                  }
                },
                '&:hover': {
                  backgroundColor: `${item.color}.light`,
                  '& .MuiListItemIcon-root': {
                    color: `${item.color}.main`,
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon />
              </ListItemIcon>
              <ListItemText 
                primary={item.name}
                secondary={item.description}
                primaryTypographyProps={{
                  fontSize: '0.95rem',
                  fontWeight: isSelected ? 600 : 400
                }}
                secondaryTypographyProps={{
                  fontSize: '0.75rem'
                }}
              />
            </ListItemButton>
          );
        })}
        
        {/* Separador para admin */}
        {isAdmin && (
          <>
            <Divider sx={{ my: 2 }} />
            <ListItemButton
              component={Link}
              to="/admin"
              onClick={handleDrawerClose}
              selected={location.pathname.startsWith('/admin')}
              sx={{
                borderRadius: 2,
                py: 1.5,
                bgcolor: 'error.light',
                '&:hover': {
                  bgcolor: 'error.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  }
                },
                '&.Mui-selected': {
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'error.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
                <AdminPanelSettingsIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Administración"
                secondary="Panel de control"
                primaryTypographyProps={{
                  fontSize: '0.95rem',
                  fontWeight: 600
                }}
                secondaryTypographyProps={{
                  fontSize: '0.75rem'
                }}
              />
            </ListItemButton>
          </>
        )}
      </List>
    </Box>
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
          bgcolor: 'primary.main'
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
            {getPageTitle()}
          </Typography>
          
          {currentUser && (
            <>
              <IconButton onClick={() => setProfileOpen(true)}>
                <Avatar 
                  src={userData?.photoURL || undefined}
                  alt={userData?.nombre || userData?.id || 'Usuario'}
                >
                  {!userData?.photoURL && (
                    (userData?.nombre?.[0] || userData?.id?.[0] || 'U').toUpperCase()
                  )}
                </Avatar>
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
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginTop: '64px'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
