// src/components/UI/LoadingScreen.jsx
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import FactoryIcon from '@mui/icons-material/Factory';

const LoadingScreen = ({ message = "Cargando Mecaformas 3D..." }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 2
      }}
    >
      <FactoryIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
      <CircularProgress size={60} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingScreen;
