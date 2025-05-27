// src/components/Layout/Loading.jsx
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';

const Loading = ({ message = "Cargando..." }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
      }}
    >
      <Box
        sx={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: 'primary.main',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mb: 2,
          animation: 'pulse 1.5s infinite ease-in-out',
          '@keyframes pulse': {
            '0%': {
              transform: 'scale(0.95)',
              boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.7)',
            },
            '70%': {
              transform: 'scale(1)',
              boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)',
            },
            '100%': {
              transform: 'scale(0.95)',
              boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)',
            },
          },
        }}
      >
        <RestaurantIcon sx={{ fontSize: 30, color: 'white' }} />
      </Box>
      
      <CircularProgress size={40} thickness={4} sx={{ mb: 2 }} />
      
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default Loading;