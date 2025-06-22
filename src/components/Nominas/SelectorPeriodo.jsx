import { useState } from 'react';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';

import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Chip,
  Alert,
  Grid
} from '@mui/material';
import { CalendarToday as CalendarIcon } from '@mui/icons-material';
import {  
  validarPeriodo,
  formatearPeriodo 
} from '../../utils/nominaUtils';

const SelectorPeriodo = ({ onPeriodoChange, periodoActual }) => {
  const [fechaInicio, setFechaInicio] = useState(periodoActual?.fechaInicio || '');
  const [fechaFin, setFechaFin] = useState(periodoActual?.fechaFin || '');
  const [errors, setErrors] = useState({});

  const handleFechaChange = (tipo, valor) => {
    if (tipo === 'inicio') {
      setFechaInicio(valor);
    } else {
      setFechaFin(valor);
    }
    
    const nuevaFechaInicio = tipo === 'inicio' ? valor : fechaInicio;
    const nuevaFechaFin = tipo === 'fin' ? valor : fechaFin;
    
    if (nuevaFechaInicio && nuevaFechaFin) {
      const validacion = validarPeriodo(nuevaFechaInicio, nuevaFechaFin);
      setErrors(validacion.errors);
      
      if (validacion.isValid && onPeriodoChange) {
        onPeriodoChange(nuevaFechaInicio, nuevaFechaFin);
      }
    }
  };

  return (
    <Card sx={{ borderRadius: 4, mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Seleccionar Período de Nómina
          </Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Importante:</strong> Selecciona exactamente el período en el que se recogieron 
            las horas extra para esta nómina. Los períodos pueden variar cada mes.
          </Typography>
        </Alert>
        
        {/* Selección manual de fechas */}
        <Grid container spacing={2}>
          <Grid size={{ xs:12, sm:6 }}>
            <TextField
              fullWidth
              focused
              type="date"
              label="Fecha de Inicio"
              value={fechaInicio}
              onChange={(e) => handleFechaChange('inicio', e.target.value)}
              error={!!errors.fechaInicio}
              helperText={errors.fechaInicio}
              slotProps={{
                InputLabel: {
                  shrink: true
                }
                 }}
            />
          </Grid>
          <Grid size={{ xs:12, sm:6 }}>
            <TextField
              fullWidth
              focused
              type="date"
              label="Fecha de Fin"
              value={fechaFin}
              onChange={(e) => handleFechaChange('fin', e.target.value)}
              error={!!errors.fechaFin}
              helperText={errors.fechaFin}
              slotProps={{
                InputLabel: {
                  shrink: true
                }
                 }}
            />
          </Grid>
        </Grid>
        
        {errors.general && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errors.general}
          </Alert>
        )}
        
        {/* Vista previa del período */}
        {fechaInicio && fechaFin && !errors.fechaInicio && !errors.fechaFin && !errors.general && (
          <Box severity="success" sx={{ mt: 2 ,p:2,bgcolor:'verde.fondo',borderRadius:2}}>
            <Typography textAlign="center" variant="body2">
              <strong>Período seleccionado</strong>
            </Typography>
            <Typography textAlign="center" variant="body2">
               {formatearPeriodo(fechaInicio, fechaFin)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SelectorPeriodo;
