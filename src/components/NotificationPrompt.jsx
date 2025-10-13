import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useNotifications } from '../hooks/useNotifications';
import { useAuthStore } from '../stores/authStore';

export const NotificationPrompt = ({ open, onClose }) => {
  const { requestPermission } = useNotifications();
  const { updateNotificationPreference } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await requestPermission();
      onClose(true);
    } catch (error) {
      console.error(error);
      onClose(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    // Guardar que el usuario rechazó para no molestar más
    await updateNotificationPreference('declined');
    onClose(false);
  };

  return (
    <Dialog open={open} onClose={handleDecline}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <NotificationsActiveIcon color="primary" />
        Activar Notificaciones
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Recibe alertas instantáneas sobre:
        </Typography>
        <Box component="ul" sx={{ pl: 2, mt: 1 }}>
          <Typography component="li" variant="body2">✅ Solicitudes aprobadas/rechazadas</Typography>
          <Typography component="li" variant="body2">📅 Recordatorios</Typography>
          <Typography component="li" variant="body2">💬 Mensajes importantes</Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Incluso cuando no estés usando la aplicación.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDecline} color="inherit">
          No, gracias
        </Button>
        <Button onClick={handleAccept} variant="contained" disabled={loading}>
          {loading ? 'Activando...' : 'Activar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
