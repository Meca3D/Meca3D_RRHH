import { Box, Typography, CircularProgress, Chip, Fade, Zoom } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useCountdown } from '../../hooks/useCountdown';

const CountdownTimer = ({ fechaReserva }) => {
  const countdown = useCountdown(fechaReserva);
  
  if (!countdown) return null;
  
  // Calcular el porcentaje para la animación circular
  const totalSeconds = 20 * 60; // 20 minutos en segundos
  const remainingSeconds = (countdown.hours * 3600) + (countdown.minutes * 60) + countdown.seconds;
  const percentage = (remainingSeconds / totalSeconds) * 100;
  
  // Determinar el color según el tiempo restante
  const getColor = () => {
    if (countdown.expired) return '#EF4444';
    if (remainingSeconds < 300) return '#F59E0B'; // Menos de 5 min = naranja
    return '#22C55E'; // Verde
  };
  
  const color = getColor();
  
  if (countdown.expired) {
    return (
      <Zoom in={true}>
        <Chip
          icon={<AccessTimeIcon />}
          label="Pedido cerrado"
          sx={{
            mb:1,
            width: '100%',
            height: 48,
            fontSize: '0.95rem',
            fontWeight: 600,
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            color: '#EF4444',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            '& .MuiChip-icon': {
              color: '#EF4444',
              fontSize: 22
            }
          }}
        />
      </Zoom>
    );
  }
  
  return (
    <Fade in={true}>
      <Box sx={{ 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        bgcolor: `${color}15`,
        borderRadius: 3,
        border: `2px solid ${color}40`,
        transition: 'all 0.5s ease-in-out'
      }}>
        {/* Circular Progress animado */}
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant="determinate"
            value={percentage}
            size={56}
            thickness={4}
            sx={{
              color: color,
              transition: 'color 0.5s ease-in-out',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AccessTimeIcon sx={{ color: color, fontSize: 24 }} />
          </Box>
        </Box>
        
        {/* Tiempo restante con animación */}
        <Box sx={{ flex: 1 }}>
          <Typography 
            textAlign='center'
            variant="body1" 
            sx={{ 
              color: 'dorado.main',
              display: 'block',
              fontWeight: 600,
              mb: 0.5
            }}
          >
            Tiempo para unirse
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline', justifyContent: 'center' }}>
            <Typography
              variant="h6"
              sx={{
                color: color,
                fontWeight: 700,
                fontFamily: 'monospace',
                fontSize: '1.3rem',
                letterSpacing: 1,
                transition: 'color 0.5s ease-in-out'
              }}
            >
              {String(countdown.hours).padStart(2, '0')}:
              {String(countdown.minutes).padStart(2, '0')}:
              {String(countdown.seconds).padStart(2, '0')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Fade>
  );
};

export default CountdownTimer;
