import {
  Box,
  TextField,
  Typography,
  Alert,
  InputAdornment
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

const ModoManual = ({ formData, setFormData }) => {
  const handleSueldoBaseChange = (value) => {
    setFormData({
      ...formData,
      sueldoBaseManual: parseFloat(value) || 0
    });
  };

  const handleTrieniosChange = (value) => {
    setFormData({
      ...formData,
      trieniosManual: parseInt(value) || 0
    });
  };

  const handleValorTrienioChange = (value) => {
    setFormData({
      ...formData,
      valorTrienioManual: parseFloat(value) || 0
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <EditIcon sx={{ mr: 1, color: 'warning.main' }} />
        <Typography variant="h6" color="warning.main">
          Configuración Manual
        </Typography>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Modo manual:</strong> Los valores introducidos se usarán directamente para los cálculos.
        </Typography>
      </Alert>

      {/* Sueldo Base */}
      <TextField
        fullWidth
        label="Sueldo Base"
        type="number"
        placeholder='0'
        value={formData.sueldoBaseManual}
        onChange={(e) => handleSueldoBaseChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">€</InputAdornment>
            },
           htmlInput: {
            step: 0.01, min: 0
            }
          }}
        helperText="Introduce el sueldo base mensual"
        sx={{ mb: 3 }}
      />

      {/* Número de Trienios */}
      <TextField
        fullWidth
        label="Número de Trienios"
        type="number"
        value={formData.trieniosManual}
        onChange={(e) => handleTrieniosChange(e.target.value)}
        slotProps={{
          htmlInput: {
             min: 0, max: 20 
         }
        }}
        helperText="Número de trienios, si corresponden"
        sx={{ mb: 3 }}
      />

      {/* Valor por Trienio */}
      <TextField
        fullWidth
        label="Valor por Trienio"
        type="number"
        value={formData.valorTrienioManual}
        onChange={(e) => handleValorTrienioChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">€</InputAdornment>
            },
           htmlInput: {
            step: 0.01, min: 0
            }
          }}
        helperText="Valor de cada trienio"
        sx={{ mb: 3 }}
      />

      {/* Configuración de Tarifas de Horas Extra */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Tarifas de Horas Extra
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
        <TextField
          label="Hora Normal"
          type="number"
          value={formData.tarifasHorasExtra.normal}
          onChange={(e) => setFormData({
            ...formData,
            tarifasHorasExtra: {
              ...formData.tarifasHorasExtra,
              normal: parseFloat(e.target.value) || 0
            }
          })}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">€</InputAdornment>
            },
           htmlInput: {
            step: 0.01, min: 0
            }
          }}
        />
        
        <TextField
          label="Hora Nocturna"
          type="number"
          value={formData.tarifasHorasExtra.nocturna}
          onChange={(e) => setFormData({
            ...formData,
            tarifasHorasExtra: {
              ...formData.tarifasHorasExtra,
              nocturna: parseFloat(e.target.value) || 0
            }
          })}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">€</InputAdornment>
            },
           htmlInput: {
            step: 0.01, min: 0
            }
          }}
        />
        
        <TextField
          label="Hora Festiva"
          type="number"
          value={formData.tarifasHorasExtra.festiva}
          onChange={(e) => setFormData({
            ...formData,
            tarifasHorasExtra: {
              ...formData.tarifasHorasExtra,
              festiva: parseFloat(e.target.value) || 0
            }
          })}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">€</InputAdornment>
            },
           htmlInput: {
            step: 0.01, min: 0
            }
          }}
        />
        
        <TextField
          label="Hora Festiva Nocturna"
          type="number"
          value={formData.tarifasHorasExtra.festivaNocturna}
          onChange={(e) => setFormData({
            ...formData,
            tarifasHorasExtra: {
              ...formData.tarifasHorasExtra,
              festivaNocturna: parseFloat(e.target.value) || 0
            }
          })}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">€</InputAdornment>
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

export default ModoManual;
