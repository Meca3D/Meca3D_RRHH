// components/Admin/AdminMenu.jsx
import React from 'react';
import { List, MenuItem, ListItemIcon, ListItemText, ListItemButton } from '@mui/material';
import { Link } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import NestedMenuItem from '../UI/NestedMenuItem';

const AdminMenu = () => {
  return (
    <List sx={{ml:-4}}>
      
      <NestedMenuItem 
        label="Productos" 
        icon={<RestaurantMenuIcon />}
      >
        <MenuItem component={Link} to="/admin/productos/crear">
          <ListItemIcon><AddIcon /></ListItemIcon>
          <ListItemText>Crear</ListItemText>
        </MenuItem>
        <MenuItem component={Link} to="/admin/productos/modificar">
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Modificar</ListItemText>
        </MenuItem>
        <MenuItem component={Link} to="/admin/productos/eliminar">
          <ListItemIcon><DeleteIcon /></ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </NestedMenuItem>

        <MenuItem component={Link} to="/admin/usuarios">
          <ListItemIcon><PeopleIcon /></ListItemIcon>
          <ListItemText>Gestionar Usuarios</ListItemText>
        </MenuItem>

    </List>
  );
};

export default AdminMenu;
