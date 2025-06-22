// components/Nominas/CalculadoraNomina.jsx
import React from 'react';
import {
  Card, CardHeader, CardContent, Typography, Box, Alert, Grid, Button, IconButton
} from '@mui/material';
import { Refresh as RefreshIcon, Calculate as CalculateIcon } from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useNominaStore } from '../../stores/nominaStore';
import { formatCurrency, formatearPeriodo, formatearTiempo } from '../../utils/nominaUtils';

const CalculadoraNomina = ({ periodo }) => {
  const { user, userProfile } = useAuthStore();
  const { calcularNominaCompleta, horasExtra, calcularTotalHorasDecimales } = useNominaStore();

  // ✅ Validación temprana - sin datos no hay cálculo
  if (!periodo?.fechaInicio || !periodo?.fechaFin) {
    return (
      <Alert severity="info">
        Selecciona un período para calcular la nómina
      </Alert>
    );
  }

  if (!userProfile) {
    return (
      <Alert severity="warning">
        No se encontró configuración de usuario
      </Alert>
    );
  }

  // ✅ Cálculo automático durante el renderizado (sin useEffect ni useState)
  const horasDelPeriodo = horasExtra.filter(hora => 
    hora.fecha >= periodo.fechaInicio && hora.fecha <= periodo.fechaFin
  );

  const nominaCalculada = calcularNominaCompleta(userProfile, horasDelPeriodo);
  const totalTrienios = nominaCalculada.trienios * nominaCalculada.valorTrienio;
  const totalHorasExtra = horasDelPeriodo.reduce((sum, h) => sum + h.importe, 0);
  const totalNomina = nominaCalculada.sueldoBase + totalTrienios + totalHorasExtra;

  const totalHorasDecimales = calcularTotalHorasDecimales(horasDelPeriodo);
  const horasTotales = Math.floor(totalHorasDecimales);
  const minutosTotales = Math.round((totalHorasDecimales % 1) * 60);

  return (
    <Card elevation={0} sx={{ borderRadius: 4 }}>
      <CardHeader
        title="Resumen de Nómina" 
        sx={{
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              fontSize:'1.4rem',
              textAlign:'center',
              color: 'white'
        }}
      />
      <CardContent>
        {/* Información del período */}
        <Box sx={{ mb: 3,bgcolor:'verde.fondo', p:2, borderRadius:2 }}>
          <Typography fontSize='0.8rem' variant="body2" gutterBottom>
            <strong>Período:</strong> {formatearPeriodo(periodo.fechaInicio, periodo.fechaFin)}
          </Typography>
          <Typography variant="body2"  fontSize='0.8rem'>
            <strong>Horas extra:</strong> {horasDelPeriodo.length} registros ({formatearTiempo(horasTotales, minutosTotales)}) 
          </Typography>
        </Box>

        {/* Desglose de nómina */}
        <Grid container spacing={3}>
          <Grid size={{xs:6, md:3}}>
            <Box textAlign="center" p={2} sx={{ bgcolor: 'rgba(59, 130, 246, 0.05)', borderRadius: 2 }}>
              <Typography variant="h5" color="primary" fontWeight="bold">
                {formatCurrency(nominaCalculada.sueldoBase)}
              </Typography>
              <Typography variant="body2">Sueldo Base</Typography>
            </Box>
          </Grid>
          
          <Grid size={{xs:6, md:3}}>
            <Box textAlign="center" p={2} sx={{ bgcolor: 'rgba(16, 185, 129, 0.05)', borderRadius: 2 }}>
              <Typography variant="h5" color="success.main" fontWeight="bold">
                {formatCurrency(totalTrienios)}
              </Typography>
              <Typography variant="body2">
                Trienios ({nominaCalculada.trienios})
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={{xs:6, md:3}}>
            <Box textAlign="center" p={2} sx={{ bgcolor: 'rgba(245, 158, 11, 0.05)', borderRadius: 2 }}>
              <Typography variant="h5" color="warning.main" fontWeight="bold">
                {formatCurrency(totalHorasExtra)}
              </Typography>
              <Typography variant="body2">Horas Extra</Typography>
            </Box>
          </Grid>
          
          <Grid size={{xs:6, md:3}}>
            <Box textAlign="center" p={2} sx={{ 
              bgcolor: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)', 
              borderRadius: 2,
              border: '2px solid',
              borderColor: 'success.main'
            }}>
              <Typography variant="h5" color="success.main" fontWeight="bold">
                {formatCurrency(totalNomina)}
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                TOTAL NÓMINA
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Desglose detallado */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Desglose Detallado</Typography>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography>Sueldo Base:</Typography>
            <Typography fontWeight="bold">{formatCurrency(nominaCalculada.sueldoBase)}</Typography>
          </Box>
          {nominaCalculada.trienios > 0 && (
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Trienios:</Typography>
              <Typography fontWeight="bold">{formatCurrency(totalTrienios)}</Typography>
            </Box>
          )}
          {totalHorasExtra > 0 && (
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography>Horas Extra:</Typography>
              <Typography fontWeight="bold">{formatCurrency(totalHorasExtra)}</Typography>
            </Box>
          )}
          <Box display="flex" justifyContent="space-between" pt={1} borderTop="1px solid" borderColor="grey.300">
            <Typography variant="h6">TOTAL:</Typography>
            <Typography variant="h6" color="success.main" fontWeight="bold">
              {formatCurrency(totalNomina)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CalculadoraNomina;
