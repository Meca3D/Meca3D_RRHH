// components/Admin/Vacaciones/ConfiguracionVacaciones.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, AppBar, Toolbar, IconButton, Box, Typography, Card, CardHeader, CardContent,
  Grid, Paper, Switch, FormControlLabel, RadioGroup, Radio, TextField, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Divider, Alert, FormControl,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBackIosNew,
  Rule,
  ThumbUpAlt,
  Shield,
  Save
} from '@mui/icons-material';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { useUIStore } from '../../../stores/uiStore';
import { formatearTiempoVacasLargo } from '../../../utils/vacacionesUtils';

const ConfiguracionVacacionesAdmin = () => {
  const navigate = useNavigate();
  const { configVacaciones, loadConfigVacaciones, updateConfigVacaciones } = useVacacionesStore();
  const { showSuccess, showError} = useUIStore()

  const [localCfg, setLocalCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const isEnabledByMode = ['porHoras','porHorasYsinConflictos'].includes(localCfg?.autoAprobar?.modo);


  useEffect(() => {
    const unsub = loadConfigVacaciones();
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [loadConfigVacaciones]);

  useEffect(() => {
    if (configVacaciones) {
      setLocalCfg(JSON.parse(JSON.stringify(configVacaciones)));
    } else {
      setLocalCfg({
        autoAprobar: { habilitado: false, modo: 'todas', maxHoras: 8, mensaje: 'Aprobado automáticamente por política activa.' },
        cobertura: {
          umbrales: {
            'Fresador': 4, 'Tornero': 3, 'Operario CNC': 3, 'Montador': 2, 'Administrativo': 2, 'Diseñador': 2, 'Ayudante de Taller': 2
          }
        }
      });
    }
  }, [configVacaciones]);

  const setAuto = (path, value) => {
    setLocalCfg(prev => ({
      ...prev,
      autoAprobar: { ...prev.autoAprobar, [path]: value }
    }));
  };

  const setUmbral = (puesto, value) => {
    const v = Math.max(0, parseInt(value || 0, 10));
    setLocalCfg(prev => ({
      ...prev,
      cobertura: {
        ...prev.cobertura,
        umbrales: { ...(prev.cobertura?.umbrales || {}), [puesto]: v }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resultado = await updateConfigVacaciones(localCfg);
      if (resultado) {
      showSuccess('Configuración guardada con éxito')
      navigate('/admin/configuracion')
      } else {
      showError('Error al guardar la configuración')
      }
    } finally {
      setSaving(false);
    }
  };

  if (!localCfg) return null;

  const umbrales = Object.entries(localCfg.cobertura?.umbrales || {});

  return (
    <>
     <AppBar  
        sx={{ 
            overflow:'hidden',
            background: 'linear-gradient(135deg, #a67373ff 0%, #8d3131ff 100%)',
            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
            zIndex: 1100
        }}
        >
        <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
            <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/admin/configuracion')}
            sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
                transform: 'scale(1.05)'
                },
                transition: 'all 0.3s ease'
            }}
            >
            <ArrowBackIosNew />
            </IconButton>

            {/* Título */}
            <Box sx={{ my:0.5, textAlign: 'center', flex: 1, mx: 2 }}>
            <Typography 
                variant="h5" 
                fontWeight="bold" 
                sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                lineHeight: 1.2
                }}
            >
                Configuración de Ausencias
            </Typography>
            <Typography 
                variant="caption" 
                sx={{ 
                opacity: 0.9,
                fontSize: { xs: '0.9rem', sm: '1rem' }
                }}
            >
                Auto-aprobación y Cobertura
            </Typography>
            </Box>
            <IconButton
            edge="end"
            color="inherit"
            sx={{
                cursor: 'default'
            }}
            >
            <Rule sx={{fontSize:'2rem'}}/>
            </IconButton>
        </Toolbar>
        </AppBar>

      <Container maxWidth="xl" sx={{ pb:2, pt:2 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                  <Typography fontSize='1.75rem' fontWeight={700} sx={{mb:2, textAlign:'center'}}>
                    Vacaciones
                    </Typography>
                <Typography fontSize='1.45rem' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ThumbUpAlt color="success" /> Auto-aprobación
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(localCfg.autoAprobar?.habilitado)}
                      onChange={(e) => setAuto('habilitado', e.target.checked)}
                    />
                  }
                  label="Habilitar auto-aprobación"
                />

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>Modo</Typography>
                <FormControl disabled={!localCfg.autoAprobar?.habilitado}>
                <RadioGroup
                  
                  value={localCfg.autoAprobar?.modo || 'todas'}
                  onChange={(e) => setAuto('modo', e.target.value)}
                >
                  <FormControlLabel value="todas" control={<Radio />} label="Todas las solicitudes"  />
                  <FormControlLabel value="noVentas" control={<Radio />} label="Todas menos las ventas"  />
                  <FormControlLabel value="porHoras" control={<Radio />} label="Solo solicitudes ≤ X horas" />
                  <FormControlLabel value="sinConflictos" control={<Radio />} label="Solo si no hay conflictos de cobertura" />
                  <FormControlLabel value="porHorasYsinConflictos" control={<Radio />} label="≤ X horas y sin conflictos" />
                </RadioGroup>
                </FormControl>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      type="number"
                      label="X horas (límite)"
                      fullWidth
                      onWheel={(e) => e.target.blur()}
                      slotProps={{
                        input: {
                          endAdornment: <InputAdornment position="end">horas</InputAdornment>,
                        },
                        htmlInput:{ 
                          min: 0, step: 1 
                        }
                      }}
                      value={localCfg.autoAprobar?.maxHoras || 8}
                      onChange={(e) => setAuto('maxHoras', Math.max(1, parseInt(e.target.value || 1, 10)))}
                      helperText={
                        isEnabledByMode
                            ? (
                                localCfg.autoAprobar?.maxHoras
                                    // Si está habilitado Y tiene valor, muestra el tiempo formateado
                                    ? <Typography component="span" fontSize='0.9rem' sx={{fontWeight:500, color:'black' }}>
                                          {formatearTiempoVacasLargo(localCfg.autoAprobar?.maxHoras)}
                                      </Typography>
                                    // Si está habilitado y NO tiene valor, muestra el mensaje de ayuda.
                                    : <Typography component="span" fontSize='0.9rem'>Especifica la cantidad de horas</Typography>
                            )
                            : null // Muestra NADA si está deshabilitado
                    }
                      disabled={!isEnabledByMode}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Mensaje de auto-aprobación"
                      fullWidth
                      multiline
                      minRows={3}
                      value={localCfg.autoAprobar?.mensaje || ''}
                      onChange={(e) => setAuto('mensaje', e.target.value)}
                      placeholder="Ej: Aprobado automáticamente según política activa sin conflictos."
                      sx={{mt:1}}
                    />
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography fontSize='1rem'>
                  La auto-aprobación se aplica en el momento de crear la solicitud y registra el mensaje indicado en “Comentarios Admin”
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography fontSize='1.45rem' gutterBottom sx={{ mb:1,display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Shield color="warning" /> Umbrales de Cobertura
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{bgcolor:'grey.100'}}>
                      <TableCell>
                        <Typography fontSize='1.2rem' fontWeight={700}>
                            Puesto
                        </Typography>
                      </TableCell>
                      <TableCell width={100}>
                        <Typography fontSize='1.2rem' fontWeight={700}>
                        Umbral
                        </Typography>
                    </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {umbrales.map(([puesto, valor]) => (
                      <TableRow key={puesto}>
                        <TableCell  sx={{p:2}}>
                            <Typography fontSize='1.2rem'>
                                {puesto}
                            </Typography>
                        </TableCell>
                        <TableCell  sx={{p:2}} >
                          <TextField
                            type="number"
                            size="small"
                            value={valor}
                            onChange={(e) => setUmbral(puesto, e.target.value)}
                            slotProps={{ 
                                htmlInput:{
                                    min: 0 
                                }
                                }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Alert severity='info'>
                   <Typography fontSize='1rem' sx={{ mb: 2 }}>
                    Define el número de personas de vacaciones a la vez, que activa “posible conflicto” por puesto
                  </Typography>
                </Alert>

              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>

              <Button
                variant="outlined"
                color="error"

                onClick={() => navigate('/admin')}
                disabled={saving}
                sx={{textTransform:'none', p:1.5}}
              >
                <Typography fontSize='1.2rem' display='flex'>
                  Volver
                </Typography>
              </Button>

              <Button
                variant="contained"
                color="primary"

                onClick={handleSave}
                disabled={saving}
                sx={{textTransform:'none', p:1.5}}
              >
                <Typography fontSize='1.2rem' display='flex' alignItems='center'>
                 <Save sx={{fontSize:'1.5rem', mr:1}}/> {saving ? 'Guardando...' : 'Guardar cambios'}
                </Typography>
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default ConfiguracionVacacionesAdmin;
