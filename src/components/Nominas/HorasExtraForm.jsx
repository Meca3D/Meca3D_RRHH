// components/Nominas/HorasExtraForm.jsx
import React, { useState } from 'react';
import {
  Card, CardHeader, CardContent, TextField, Button, Grid, Box,
  MenuItem, Typography, Alert, CircularProgress
} from '@mui/material';
import { Add as AddIcon, Save as SaveIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { useAuthStore } from '../../stores/authStore';
import { useNominaStore } from '../../stores/nominaStore';
import { useUIStore } from '../../stores/uiStore';
import { tiposHorasExtra, formatearTiempo } from '../../utils/nominaUtils';

const HorasExtraForm = ({ onSuccess }) => {
  const { user, userProfile } = useAuthStore();
  const { 
    addHorasExtra, 
    calcularImporteHorasExtra, 
    loading 
  } = useNominaStore();
  const { showSuccess, showError } = useUIStore();

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
    tipo: 'normal',
    horas: 0,
    minutos: 0,
    tarifa: userProfile?.tarifasHorasExtra?.normal || 15
  });

  const [saving, setSaving] = useState(false);

  // ✅ Calcular importe en tiempo real
  const importeCalculado = calcularImporteHorasExtra(
    formData.horas, 
    formData.minutos, 
    formData.tarifa
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.fecha) {
      showError('La fecha es obligatoria');
      return;
    }
    
    if (formData.horas === 0 && formData.minutos === 0) {
      showError('Debes introducir al menos 1 minuto');
      return;
    }

    if (formData.minutos >= 60) {
      showError('Los minutos deben ser menores a 60');
      return;
    }

    setSaving(true);
    try {
      const horasExtraData = {
        empleadoEmail: user.email,
        fecha: formData.fecha,
        tipo: formData.tipo,
        horas: parseInt(formData.horas) || 0,
        minutos: parseInt(formData.minutos) || 0,
        tarifa: parseFloat(formData.tarifa),
        importe: importeCalculado
      };

      await addHorasExtra(horasExtraData);
      
      // Reset form
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'normal',
        horas: 0,
        minutos: 0,
        tarifa: userProfile?.tarifasHorasExtra?.normal || 15
      });

      showSuccess('Horas extra registradas correctamente');
      if (onSuccess) onSuccess();
    } catch (error) {
      showError('Error al registrar horas extra: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ✅ Actualizar tarifa según tipo seleccionado
  const handleTipoChange = (tipo) => {
    const tarifas = userProfile?.tarifasHorasExtra || {};
    const tarifa = tarifas[tipo] || 15;
    
    setFormData({
      ...formData,
      tipo,
      tarifa
    });
  };

  return (
    <Card elevation={0} sx={{ mb: 3, borderRadius: 4 }}>
      <CardHeader
        title="Registrar Horas Extra"
        avatar={<AddIcon />}
        sx={{
          background: 'linear-gradient(135deg, #FB8C00 0%, #F57C00 100%)',
          color: 'white'
        }}
      />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Fecha */}
            <Grid item xs={12} md={6}>
              <TextField
                type="date"
                label="Fecha"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Tipo de hora extra */}
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Tipo de Hora Extra"
                value={formData.tipo}
                onChange={(e) => handleTipoChange(e.target.value)}
                fullWidth
                required
              >
                {tiposHorasExtra.map((tipo) => (
                  <MenuItem key={tipo.value} value={tipo.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          bgcolor: tipo.color, 
                          borderRadius: '50%' 
                        }} 
                      />
                      {tipo.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* ✅ HORAS - Campo separado */}
            <Grid item xs={6} md={3}>
              <TextField
                type="number"
                label="Horas"
                value={formData.horas}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  horas: Math.max(0, parseInt(e.target.value) || 0)
                })}
                inputProps={{ min: 0, max: 12 }}
                fullWidth
                helperText="Máximo 12h"
              />
            </Grid>

            {/* ✅ MINUTOS - Campo separado */}
            <Grid item xs={6} md={3}>
              <TextField
                type="number"
                label="Minutos"
                value={formData.minutos}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  minutos: Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                })}
                inputProps={{ min: 0, max: 59, step: 5 }}
                fullWidth
                helperText="0-59 min"
              />
            </Grid>

            {/* Tarifa */}
            <Grid item xs={12} md={6}>
              <TextField
                type="number"
                label="Tarifa por hora (€)"
                value={formData.tarifa}
                onChange={(e) => setFormData({ ...formData, tarifa: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
              />
            </Grid>
          </Grid>

          {/* ✅ Vista previa del cálculo */}
          <Alert severity="info" sx={{ mt: 3, mb: 3 }}>
            <Typography variant="body1">
              <strong>Tiempo:</strong> {formatearTiempo(formData.horas, formData.minutos)}
            </Typography>
            <Typography variant="body1">
              <strong>Tarifa:</strong> {formData.tarifa}€/hora
            </Typography>
            <Typography variant="h6" color="success.main">
              <strong>Importe total:</strong> {importeCalculado.toFixed(2)}€
            </Typography>
          </Alert>

          {/* Botón de guardar */}
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving || loading}
            fullWidth
            sx={{
              py: 2,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #FB8C00 0%, #F57C00 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #F57C00 0%, #EF6C00 100%)',
              }
            }}
          >
            {saving ? 'Guardando...' : 'Registrar Horas Extra'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default HorasExtraForm;
