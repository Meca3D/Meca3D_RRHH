// src/components/Layout/MainLayout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, IconButton, Box, 
  Avatar, Drawer, List, ListItemButton, ListItemIcon, 
  ListItemText, Divider,
} from '@mui/material';
import EuroIcon from '@mui/icons-material/Euro';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentIcon from '@mui/icons-material/Payment';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import UserProfile from '../UI/UserProfile';


const MainLayout = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const {user, userProfile, isAuthenticated, canManageUsers} = useAuthStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerWidth = 280; // Aumentar un poco el ancho

  // Menú principal modernizado
  const menuItems = [
    { 
      name: 'Resumen', 
      path: '/dashboard', 
      icon: DashboardIcon, 
      color: 'azul',
    },
    { 
      name: 'Horas Extra', 
      path: '/horas-extra', 
      icon: AccessTimeIcon, 
      color: 'naranja',
    },
    {
      name: 'Nóminas',
      path: '/nominas',
      icon: PaymentIcon,
      roles: ['user', 'admin', 'owner'],
      color: 'verde' 
    },
    { 
      name: 'Vacaciones', 
      path: '/vacaciones', 
      icon: BeachAccessOutlinedIcon, 
      color: 'purpura',
    },
        { 
      name: 'Permisos', 
      path: '/vacaciones', 
      icon: AssignmentOutlinedIcon, 
      color: 'rojo',
    },
    { 
      name: 'Desayuno Sábados', 
      path: '/desayunos/orders', 
      icon: LocalCafeOutlinedIcon, 
      color: 'dorado',
    },

  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerClose = () => {
  setMobileOpen(false);
};

  const getPageTitle = () => {
    if (location.pathname === '/dashboard') return 'Mi Espacio';
    if (location.pathname.startsWith('/admin')) return 'Administración';
    if (location.pathname.startsWith('/desayunos')) return 'Desayunos';
    if (location.pathname.startsWith('/nominas')) return 'Mis Nóminas';
    if (location.pathname.startsWith('/vacaciones')) return 'Mis Vacaciones';
    if (location.pathname.startsWith('/permisos')) return 'Mis Permisos/Bajas';
    if (location.pathname.startsWith('/horas-extra')) return 'Mis Horas Extra';
    return 'Mecaformas 3D';
  };

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <Toolbar  sx={{ textAlign:"center", bgcolor: 'primary.main', color: 'white' }}>
        <Typography  variant="h6" noWrap component="div" fontWeight="bold">
          MecaFormas 3D
        </Typography>
      </Toolbar>
      
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="textPrimary" textAlign="center">
          Bienvenido, {userProfile?.nombre || 'Usuario'}
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
              key={item.name||item.path}
              component={Link}
              to={item.path}
              selected={isSelected}
              onClick={handleDrawerClose}
              sx={{
                bgcolor: isSelected ? `${item.color}.fondo` : 'rgba(255, 255, 255, 0.3)',
                border: '3px solid',
                borderRadius: 2,
                mb: 1,
                py: 1.5,
                borderColor: isSelected ? `${item.color}.main` : 'rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                
                // ✅ Estado activo (mobile-friendly)
                ...(isSelected && {
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  transform: 'translateX(6px)',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    right: 12,
                    top: '25%',
                    transform: 'translateY(-50%)',
                    width: 8,
                    height: 8,
                    bgcolor: `${item.color}.main`,
                    borderRadius: '50%',
                    animation: 'pulse 3s infinite'
                  }
                }),
                
                // ✅ Hover para desktop
                '&:hover': {
                  boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                  transform: isSelected ? 'translateX(8px) translateY(-2px)' : 'translateY(-2px)',
                  borderColor: `${item.color}.main`
                },
                
                // ✅ Efectos táctiles para móvil
                '&:active': {
                  transform: isSelected ? 'translateX(8px) scale(0.98)' : 'scale(0.98)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
                },
                
                // ✅ Focus para accesibilidad
                '&:focus-visible': {
                  outline: `3px solid ${item.color}.main`,
                  outlineOffset: '2px'
                },
                
                // ✅ Animación de pulso
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1, transform: 'translateY(-50%) scale(1)' },
                  '50%': { opacity: 0.7, transform: 'translateY(-50%) scale(1.2)' }
                }
              }}
            >
              <ListItemIcon 
                sx={{ 
                  minWidth: 40, 
                  color: `${item.color}.fondo`,
                  transition: 'all 0.3s ease'
                }}
              >
                <Icon 
                  sx={{
                    fontSize: '2.5rem',
                    color: `${item.color}.main`,
                    mr: 2,
                    transition: 'all 0.3s ease',
                    // ✅ Efecto de escala en item activo
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                  }}
                />
              </ListItemIcon>
              <ListItemText 
                primary={item.name}
                slotProps={{
                  primary: {
                    color: isSelected ? `${item.color}.main` : `${item.color}.main`,
                    fontSize: '1rem',
                    fontWeight: isSelected ? 800 : 700, // ✅ Más bold cuando está activo
                    sx: {
                      transition: 'all 0.3s ease'
                    }
                  },
                  secondary: {
                    fontSize: '0.75rem'
                  }
                }}
              />
            </ListItemButton>

          );
        })}
        
        {/* Separador para admin */}
        {canManageUsers() && (
          <>
            <Divider sx={{ my: 2 }} />

            <ListItemButton
              key="admin"
              component={Link}
              to="/admin"
              onClick={handleDrawerClose}
              selected={location.pathname.startsWith('/admin')}
              sx={{
                bgcolor: location.pathname === '/admin'? `azul.fondo` : 'rgba(255, 255, 255, 0.3)',
                border: '3px solid',
                borderRadius: 2,
                mb: 1,
                py: 1.5,
                borderColor: location.pathname === '/admin' ? `#1D4ED8` : 'rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                
                // ✅ Estado activo (mobile-friendly)
                ...(location.pathname === '/admin'&& {
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  transform: 'translateX(5px)',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    right: 12,
                    top: '25%',
                    transform: 'translateY(-50%)',
                    width: 8,
                    height: 8,
                    bgcolor: `azul.main`,
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }
                }),
                
                // ✅ Hover para desktop
                '&:hover': {
                  boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                  transform:  location.pathname === '/admin' ? 'translateX(8px) translateY(-2px)' : 'translateY(-2px)',
                  borderColor: `azul.main`
                },
                
                // ✅ Efectos táctiles para móvil
                '&:active': {
                  transform:  location.pathname === '/admin' ? 'translateX(8px) scale(0.98)' : 'scale(0.98)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
                },
                
                // ✅ Focus para accesibilidad
                '&:focus-visible': {
                  outline: `3px solid azul.main`,
                  outlineOffset: '2px'
                },
                
                // ✅ Animación de pulso
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1, transform: 'translateY(-50%) scale(1)' },
                  '50%': { opacity: 0.7, transform: 'translateY(-50%) scale(1.2)' }
                }
              }}
            >
              <ListItemIcon 
                sx={{ 
                  minWidth: 40, 
                  color: `azul.fondo`,
                  transition: 'all 0.3s ease'
                }}
              >
                <AdminPanelSettingsIcon 
                  sx={{
                    fontSize: '2.5rem',
                    color:  '#1D4ED8' ,
                    mr: 2,
                    transition: 'all 0.3s ease',
                    // ✅ Efecto de escala en item activo
                    transform:  location.pathname === '/admin' ? 'scale(1.1)' : 'scale(1)'
                  }}
                />
              </ListItemIcon>
              <ListItemText 
                primary="Administración"
                slotProps={{
                  primary: {
                    color: '#1D4ED8',
                    fontSize: '1rem',
                    fontWeight: location.pathname === '/admin' ? 800 : 700, // ✅ Más bold cuando está activo
                    sx: {
                      transition: 'all 0.3s ease'
                    }
                  },
                  secondary: {
                    fontSize: '0.75rem'
                  }
                }}
              />
            </ListItemButton>
            
          </>
        )}
      </List>
    </Box>
  );


  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'azul.main'
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
          
          {isAuthenticated && (
            <>
              <IconButton onClick={() => setProfileOpen(true)}>
                <Avatar 
                  src={userProfile?.photoURL || undefined}

                >
                  {!userProfile?.photoURL && (
                    (userProfile?.nombre?.[0] || user?.email?.[0] || 'U').toUpperCase()
                  )}
                </Avatar>
              </IconButton>
              <UserProfile 
                open={profileOpen} 
                onClose={() => setProfileOpen(false)}
                loading={false} 

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
          p: 1, 
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
