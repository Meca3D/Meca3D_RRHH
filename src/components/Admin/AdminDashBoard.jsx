// components/Admin/AdminDashboard.jsx
import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import AdminMenu from './AdminMenu';

const AdminDashboard = () => {
  return (
    <Container maxWidth={false} sx={{ width:'100%', mt: 0, mb: 4 }}>
      <Typography color="primary" textAlign="center" variant="h4" component="h1" gutterBottom>
        Administración
      </Typography>
      
      <Box sx={{ display: 'flex' }}>
        <Box sx={{ width: 240}}>
          <AdminMenu />
        </Box>
      </Box>
    </Container>
  );
};

export default AdminDashboard;
