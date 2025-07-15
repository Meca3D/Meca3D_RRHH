import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, AppBar, Toolbar,
  IconButton, Button, Grid, TextField, Divider, Alert, RadioGroup, FormControlLabel, Radio, CircularProgress, MenuItem
} from '@mui/material';
import {
  ArrowBackIosNew as ArrowBackIosNewIcon,
  CardGiftcard as GiftIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useNominaStore } from '../../stores/nominaStore';
import { useUIStore } from '../../stores/uiStore';

const PagaExtra = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { configuracionNomina, guardarNomina, loadingConfiguracion } = useNominaStore();
  const { showSuccess, showError } = useUIStore();

  const [tipoPaga, setTipoPaga] = useState('verano');
  const [importe, setImporte] = useState('');
  const [año, setAño] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  // Cargar importe predeterminado de la configuración
  useEffect(() => {
    if (configuracionNomina?.pagaExtra) {
      setImporte(configuracionNomina.pagaExtra);
    }
  }, [configuracionNomina]);

  // Opciones de año (actual y 4 anteriores)
  const añosDisponibles = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Guardar paga extra
  const handleGuardar = async () => {
    if (!importe || isNaN(importe) || Number(importe) <= 0) {
      showError('El importe debe ser mayor que 0');
      return;
    }
    setSaving(true);
    try {
      const nominaData = {
        empleadoEmail: user.email,
        año: Number(año),
        mes: tipoPaga === 'verano' ? 'P.E. Verano' : 'P.E. Navidad',
        tipo: "paga extra",
        importePagaExtra: Number(importe),
        sueldoBase: 0,
        trienios: 0,
        otrosComplementos: [],
        horasExtra: { total: 0, desglose: [] },
        deduccion: {
          concepto: 'sin deducción',
          cantidad:  0,
        },
  
        extra: {
          concepto: 'sin complemento extra',
          cantidad: 0,
        },
        total: Number(importe)
      };


                
      await guardarNomina(nominaData);
      showSuccess('Paga extra guardada correctamente');
      navigate('/nominas/consultar');
    } catch (error) {
      showError(`Error al guardar la paga extra ${error}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppBar sx={{
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #7B1FA2 0%, #6A1B9A 100%)',
        boxShadow: '0 2px 10px rgba(123, 31, 162, 0.2)',
        zIndex: 1100
      }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/nominas')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
                transform: 'scale(1.05)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <ArrowBackIosNewIcon />
          </IconButton>
          <Box sx={{ my: 0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' }, lineHeight: 1.2 }}>
              Generar Paga Extra
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Verano o Navidad
            </Typography>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            disabled
            sx={{
              bgcolor: 'rgba(255,255,255,0.08)',
              cursor: 'default'
            }}
          >
            <GiftIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 4 }}>
            {loadingConfiguracion ? (
              <Box textAlign="center" p={4}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Cargando configuración...</Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" color="purpura.main" fontWeight="600" gutterBottom>
                  Tipo de paga extra
                </Typography>
                <RadioGroup
                  row
                  value={tipoPaga}
                  onChange={e => setTipoPaga(e.target.value)}
                  sx={{ mb: 3 }}
                >
                  <FormControlLabel
                    value="verano"
                    control={<Radio sx={{ color: 'purpura.main', '&.Mui-checked': { color: 'purpura.main' } }} />}
                    label="Verano"
                  />
                  <FormControlLabel
                    value="navidad"
                    control={<Radio sx={{ color: 'purpura.main', '&.Mui-checked': { color: 'purpura.main' } }} />}
                    label="Navidad"
                  />
                </RadioGroup>
                <TextField
                  select
                  label="Año"
                  value={año}
                  onChange={e => setAño(e.target.value)}
                  fullWidth
                  sx={{ mb: 3 }}
                >
                  {añosDisponibles.map(a => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  type="number"
                  label="Importe paga extra (€)"
                  value={importe}
                  onChange={e => setImporte(e.target.value)}
                  fullWidth
                  slotProps={{ 
                    htmlInput:{
                        min: 0, step: 0.01 
                     }
                    }}
                  helperText="Predeterminado según tu configuración. Puedes cambiarlo"
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'purpura.main'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'purpura.main'
                      }
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'purpura.main'
                    }
                  }}
                />
                <Divider sx={{ my: 3 }} />
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleGuardar}
                  disabled={saving}
                  fullWidth
                  sx={{
                    py: 2,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #7B1FA2 0%, #6A1B9A 100%)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: '0 4px 15px rgba(123, 31, 162, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #6A1B9A 0%, #7B1FA2 100%)',
                      boxShadow: '0 6px 20px rgba(123, 31, 162, 0.4)',
                      transform: 'translateY(-2px)'
                    },
                    '&:disabled': {
                      background: 'linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar Paga Extra'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Nota:</strong> La paga extra no incluye horas extra ni trienios. El importe es el que tienes configurado, pero puedes editarlo antes de guardar.
          </Typography>
        </Alert>
      </Container>
    </>
  );
};

export default PagaExtra;
