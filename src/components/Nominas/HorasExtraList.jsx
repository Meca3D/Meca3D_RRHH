// components/Nominas/HorasExtraList.jsx
import {useEffect } from 'react';
import {
  Card, CardHeader, CardContent, Typography, Box, Paper, Chip, Alert, IconButton,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import { useAuthStore } from '../../stores/authStore';
import { useNominaStore } from '../../stores/nominaStore'; 
import { useUIStore } from '../../stores/uiStore';
import {
  tiposHorasExtra, 
  formatCurrency, 
  formatDate, 
  formatearTiempo
} from '../../utils/nominaUtils'; 

const HorasExtraList = ({ periodo, onHorasChange }) => {
  const { user} = useAuthStore();
  const { 
    horasExtra, 
    getHorasExtraByPeriod,
    calcularTotalHorasExtra, // ✅ Para importe total
    calcularTotalHorasDecimales, // ✅ Para horas totales
    loading 
  } = useNominaStore();
  const { showSuccess, showError } = useUIStore();

  useEffect(() => {
    const fechaInicio = periodo?.fechaInicio;
    const fechaFin = periodo?.fechaFin;
    const userEmail = user?.email;

    if (fechaInicio && fechaFin && userEmail) {
      const unsubscribe = getHorasExtraByPeriod(userEmail, fechaInicio, fechaFin);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [periodo?.fechaInicio, periodo?.fechaFin, user?.email]);

  const getTipoInfo = (tipo) => {
    return tiposHorasExtra.find(t => t.value === tipo) || { label: tipo, color: '#666' };
  };

  const totalImporte = calcularTotalHorasExtra(horasExtra);
  const totalHoras = calcularTotalHorasDecimales(horasExtra);
  const horasTotales = Math.floor(totalHoras);
  const minutosTotales = Math.round((totalHoras % 1) * 60);

  if (!periodo?.fechaInicio || !periodo?.fechaFin) {
    return (
      <Alert severity="info">
        Selecciona un período para ver las horas extra registradas
      </Alert>
    );
  }

  return (
    <>
      <Card elevation={0} sx={{ mb: 3, borderRadius: 4 }}>
        <CardHeader
          title="Horas Extra Registradas"
          sx={{
            background: 'linear-gradient(135deg, #FB8C00 0%, #F57C00 100%)',
            color: 'white',
            '& .MuiCardHeader-title': {
              fontSize:'1.4rem',
              textAlign:'center',
            }
          }}
        />
        <CardContent>
          {loading ? (
            <Box textAlign="center" p={4}>
              <CircularProgress />
              <Typography>Cargando horas extra...</Typography>
            </Box>
          ) : horasExtra.length === 0 ? (
            <Alert severity="info">
              No hay horas extra registradas en este período
            </Alert>
          ) : (
            <>
              {/* Resumen */}
              <Box display="flex" justifyContent='space-between' mb={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {formatearTiempo(horasTotales, minutosTotales)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Horas
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(totalImporte)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Importe
                  </Typography>
                </Box>
              </Box>

              {/* Tabla de horas extra */}
              <Box>
                <Box display="flex" p={1} sx={{}} bgcolor='#f5f5f5'>
                  <Typography sx={{ flex: 1, width: '25%', textAlign: 'center', fontWeight:'bold' }}>Fecha</Typography>
                  <Typography sx={{ flex: 1, width: '25%', textAlign: 'center', fontWeight:'bold' }}>Tipo</Typography>
                  <Typography sx={{ flex: 1, width: '25%', textAlign: 'center', fontWeight:'bold' }}>Hora</Typography>
                  <Typography sx={{ flex: 1, width: '25%', textAlign: 'center', fontWeight:'bold' }}>Importe</Typography>
                </Box>
                {horasExtra.map((hora) => {
                  const tipoInfo = getTipoInfo(hora.tipo);
                  return (
                    <Box key={hora.id} display="flex" p={1} borderBottom="2px solid" borderColor="grey.300">
                      <Typography sx={{ flex: 1, width: '25%', textAlign: 'center', fontSize:'0.9rem' }}>
                        {formatDate(hora.fecha)}
                      </Typography>
                      <Typography sx={{ flex: 1, width: '25%', textAlign: 'center', fontSize:'0.9rem' }}>
                        {tipoInfo.label}
                      </Typography>
                      <Typography sx={{ flex: 1,width: '25%', fontSize:'0.85rem', textAlign:'center' }}>
                        {formatearTiempo(hora.horas || 0, hora.minutos || 0)}
                      </Typography>
                      <Typography sx={{ flex: 1, width: '25%', textAlign: 'center', fontSize:'0.9rem' }}>
                        {formatCurrency(hora.importe)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default HorasExtraList;
