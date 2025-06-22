import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import { Visibility as PreviewIcon } from '@mui/icons-material';
import { formatCurrency } from '../../utils/nominaUtils';
import { useNominaStore } from '../../stores/nominaStore';;
import { useAuthStore } from '../../stores/authStore';

const VistaPrevia = ({ formData, nivelesSalariales }) => {
  const { calcularDatosNomina } = useNominaStore();
  const { userProfile } = useAuthStore();

  // Calcular datos según la configuración actual
  const usuarioCompleto = {
    ...formData,
    fechaIngreso: userProfile?.fechaIngreso,
    nivel: userProfile?.nivel
  }
  
  const datosCalculados = calcularDatosNomina(usuarioCompleto, nivelesSalariales);
  const totalTrienios = datosCalculados.trienios * datosCalculados.valorTrienio;
  const totalBase = datosCalculados.sueldoBase + totalTrienios;

  return (
    <Card sx={{ 
      overflow: 'hidden',
      mt: 3, 
      borderRadius: 4,
      background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
      border: '2px solid #CBD5E1'
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography  variant="h6" color="success.main" sx={{fontSize:'1.4rem'}}>
            Vista Previa
          </Typography>
          <Chip 
            label={formData.tipoNomina === 'automatica' ? 'Automático' : 'Manual'} 
            size="small" 
            color={formData.tipoNomina === 'automatica' ? 'primary' : 'warning'}
            sx={{ ml: 'auto' }}
          />
        </Box>

        <Grid container spacing={3}>
          {/* Sueldo Base */}
          <Grid size={{ xs:12, sm:6 }}>
            <Box sx={{ textAlign: 'center', p: 1, backgroundColor: 'white', borderRadius: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Sueldo Base
              </Typography>
              <Typography variant="h5" color="primary.main" fontWeight="bold">
                {formatCurrency(datosCalculados.sueldoBase)}
              </Typography>
              {formData.tipoNomina === 'automatica' && (
                <Typography variant="caption" color="text.secondary">
                  Nivel {formData.nivelSalarial}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Trienios */}
          <Grid size={{ xs:12, sm:6 }}>
            <Box sx={{ textAlign: 'center', p: 1, backgroundColor: 'white', borderRadius: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Trienios
              </Typography>
              <Typography variant="h5" color="secondary.main" fontWeight="bold">
                {formatCurrency(totalTrienios)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {datosCalculados.trienios} × {formatCurrency(datosCalculados.valorTrienio)}
              </Typography>
            </Box>
          </Grid>

          {/* Total Base */}
          <Grid size={{ xs:12}}>
            <Box sx={{ textAlign: 'center', p: 3, backgroundColor: "verde.fondo", borderRadius: 3 }}>
              <Typography variant="body1" color="success.dark">
                Sueldo sin horas extra
              </Typography>
              <Typography variant="h4" color="success.dark" fontWeight="bold">
                {formatCurrency(totalBase)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default VistaPrevia;
