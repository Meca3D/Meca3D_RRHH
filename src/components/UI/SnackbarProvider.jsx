// src/components/Providers/SnackbarProvider.jsx
import React from 'react'
import { Snackbar, Alert, Button } from '@mui/material'
import { useUIStore } from '../../stores/uiStore'

const SnackbarProvider = () => {
  const { snackbar, hideSnackbar } = useUIStore()
  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return
    hideSnackbar()
  }
  const handleAction = async () => {
    try {
      await snackbar.onAction?.()
    } finally {
      hideSnackbar()
    }
  }

  return (
    <Snackbar
      open={snackbar.open}
      onClose={handleClose}
      autoHideDuration={snackbar.persist ? null : 3500}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        onClose={handleClose}
        severity={snackbar.severity}
        variant="filled"
        action={
          snackbar.actionText ? (
            <Button color="inherit" size="small" onClick={handleAction}>
              {snackbar.actionText}
            </Button>
          ) : null
        }
        sx={{ width: '100%' }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  )
}

export default SnackbarProvider

