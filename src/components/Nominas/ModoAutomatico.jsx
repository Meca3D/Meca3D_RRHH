// components/Nominas/ModoAutomatico.jsx - SIN prop drilling
import {useEffect} from 'react';
import {
  Box, TextField, FormControlLabel, Switch, Typography, 
  MenuItem, Alert, Chip
} from '@mui/material';
import { AutoMode as AutoIcon } from '@mui/icons-material';
import EuroIcon from '@mui/icons-material/Euro';
import { formatCurrency } from '../../utils/nominaUtils';
import { useNominaStore } from '../../stores/nominaStore'; // ✅ Consumo directo
import { useAuthStore } from '../../stores/authStore';      // ✅ Consumo directo

const ModoAutomatico = ({ formData, setFormData }) => { // ✅ Solo props necesarias
  const { calcularAñosServicio, nivelesSalariales } = useNominaStore();
  const { userProfile } = useAuthStore();
  
  const nivelPreasignado = userProfile?.nivel;
  const esNivelPreasignado = nivelPreasignado && nivelPreasignado === formData.nivelSalarial;
  const tieneFechaIngreso = !!userProfile?.fechaIngreso;

    useEffect(() => {
    if (!tieneFechaIngreso && formData.trieniosAutomaticos) {
      setFormData({
        ...formData,
        trieniosAutomaticos: false
      });
    }
  }, [tieneFechaIngreso, formData.trieniosAutomaticos]);

  const handleNivelChange = (nivel) => {
    setFormData({
      ...formData,
      nivelSalarial: parseInt(nivel)
    });
  };

  const handleTrieniosAutomaticoChange = (checked) => {
      if (checked && !tieneFechaIngreso) {
            setFormData({
      ...formData,
      trieniosAutomaticos: false
    });
      return;
    }
    setFormData({
      ...formData,
      trieniosAutomaticos: checked
    });
  };

  const handleTrieniosManualChange = (trienios) => {
    setFormData({
      ...formData,
      trieniosManual: parseInt(trienios) || 0
    });
  };

    const handleValorTrieniosManualChange = (ValorTrienios) => {
    setFormData({
      ...formData,
      valorTrienioManual: parseInt(ValorTrienios) || 0
    });
  };

  // ✅ Datos obtenidos directamente de store
  const añosServicio = userProfile?.fechaIngreso ?
    calcularAñosServicio(userProfile.fechaIngreso) : 0;
  const trieniosCalculados = Math.floor(añosServicio / 3);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <AutoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Configuración Automática
      </Typography>

      {esNivelPreasignado && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Nivel preasignado:</strong> Tienes asignado el nivel {nivelPreasignado}.
          Puedes cambiarlo si es necesario.
        </Alert>
      )}

      {/* Selector de Nivel Salarial */}
      <TextField
        select
        label="Nivel Salarial"
        value={formData.nivelSalarial}
        onChange={(e) => handleNivelChange(e.target.value)}
        fullWidth
        sx={{ 
          mb: 3,
          '& .MuiOutlinedInput-root': esNivelPreasignado ? {
            backgroundColor: 'verde.fondo',
            '& fieldset': {
              borderColor: 'success.main',
              borderWidth: 2
            }
          } : {}
        }}
        helperText={
          !esNivelPreasignado &&
            "Selecciona el nivel salarial del empleado (1-15)"
        }
      >
        {Array.from({ length: 21 }, (_, i) => i + 1).map((nivel) => {
          const levelData = nivelesSalariales?.niveles?.[nivel];
          return (
            <MenuItem key={nivel} value={nivel}>
              <Box display="flex" justifyContent="space-between" width="100%">
                <span>Nivel {nivel}</span>
                {nivel === nivelPreasignado && (
                  <Chip label="Asignado" size="small" color="success" />
                )}
                {levelData && (
                  <span>{formatCurrency(levelData.sueldoBase)}</span>
                )}
              </Box>
            </MenuItem>
          );
        })}
      </TextField>

      {/* Configuración de Trienios */}
      <FormControlLabel
        control={
          <Switch
            checked={formData.trieniosAutomaticos}
            onChange={(e) => handleTrieniosAutomaticoChange(e.target.checked)}
            color="primary"
            disabled={!tieneFechaIngreso}
          />
        }
        label="Calcular trienios automáticamente"
      />

      {formData.trieniosAutomaticos && userProfile?.fechaIngreso && (
        <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
          <strong>Fecha de ingreso:</strong> {new Date(userProfile.fechaIngreso).toLocaleDateString('es-ES')}<br/>
          <strong>Años de servicio:</strong> {añosServicio.toFixed(1)} años<br/>
          <strong>Trienios calculados:</strong> {trieniosCalculados}
        </Alert>
      )}

      {!tieneFechaIngreso && (
        <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
          <strong>Sin fecha de ingreso:</strong> No se pueden calcular trienios automáticamente.
        </Alert>
      )}

      {!formData.trieniosAutomaticos && (
        <>
        <TextField
          type="number"
          label="Número de trienios"
          value={formData.trieniosManual}
          onChange={(e) => handleTrieniosManualChange(e.target.value)}
          slotProps={{
             htmlInput:{
            min: 0, max: 20 
            }
          }}
          helperText="Introduce el número de trienios"
          sx={{ mt: 2 }}
        />
        <TextField
          type="number"
          label="Valor de trienios"
          value={formData.valorTrienioManual}
          onChange={(e) => handleValorTrieniosManualChange(e.target.value)}
          slotProps={{
             htmlInput:{
            min: 0
            }
          }}
          helperText="Introduce el valor de un trienio"
          sx={{ mt: 2 }}
        />
        </>
      )}

      {/* Configuración de Tarifas de Horas Extra */}
      <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
        Tarifas de Horas Extra
      </Typography>
      
      <Box display="flex" gap={2} flexWrap="wrap">
        <TextField
          label="Tarifa Normal"
          type="number"
          value={formData.tarifasHorasExtra?.normal || ''}
          onChange={(e) => setFormData({
            ...formData,
            tarifasHorasExtra: {
              ...formData.tarifasHorasExtra,
              normal: parseFloat(e.target.value) || 0
            }
          })}
          slotProps={{
            input: {
              endAdornment: <EuroIcon fontSize="small" />
            },
            htmlInput: {
              step: 0.01, min: 0
            }
          }}
        />

        <TextField
          label="Tarifa Nocturna"
          type="number"
          value={formData.tarifasHorasExtra?.nocturna || ''}
          onChange={(e) => setFormData({
            ...formData,
            tarifasHorasExtra: {
              ...formData.tarifasHorasExtra,
              nocturna: parseFloat(e.target.value) || 0
            }
          })}
          slotProps={{
            input: {
              endAdornment: <EuroIcon fontSize="small" />
            },
            htmlInput: {
              step: 0.01, min: 0
            }
          }}
        />

        <TextField
          label="Tarifa Festiva"
          type="number"
          value={formData.tarifasHorasExtra?.festiva || ''}
          onChange={(e) => setFormData({
            ...formData,
            tarifasHorasExtra: {
              ...formData.tarifasHorasExtra,
              festiva: parseFloat(e.target.value) || 0
            }
          })}
          slotProps={{
            input: {
              endAdornment: <EuroIcon fontSize="small" />
            },
            htmlInput: {
              step: 0.01, min: 0
            }
          }}
        />

        <TextField
          label="Tarifa Festiva Nocturna"
          type="number"
          value={formData.tarifasHorasExtra?.festivaNocturna || ''}
          onChange={(e) => setFormData({
            ...formData,
            tarifasHorasExtra: {
              ...formData.tarifasHorasExtra,
              festivaNocturna: parseFloat(e.target.value) || 0
            }
          })}
          slotProps={{
            input: {
              endAdornment: <EuroIcon fontSize="small" />
            },
            htmlInput: {
              step: 0.01, min: 0
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default ModoAutomatico;
