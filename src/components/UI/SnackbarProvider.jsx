import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useUIStore } from '../../stores/uiStore';

const SnackbarProvider = () => {
  const { snackbar, hideSnackbar } = useUIStore();

  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert 
        onClose={hideSnackbar} 
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );
};

export default SnackbarProvider;
