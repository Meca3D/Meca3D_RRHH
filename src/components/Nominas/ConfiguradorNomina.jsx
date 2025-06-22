// components/Nominas/ConfiguradorNomina.jsx
import { useState} from 'react';
import {
  Card, CardHeader, CardContent, FormControl, FormControlLabel, RadioGroup, Radio,
  Typography, Box, Button, Alert, CircularProgress
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useNominaStore } from '../../stores/nominaStore'; // ✅ Corregido import
import ModoAutomatico from './ModoAutomatico';
import ModoManual from './ModoManual';
import VistaPrevia from './VistaPrevia';
import { useAuthStore } from '../../stores/authStore';

const ConfiguradorNomina = ({ usuario: usuarioProp, onSave, nivelesSalariales, isAdmin = false }) => {
  const { loading, error, calcularDatosNomina } = useNominaStore(); // ✅ Consumo directo
  const { userProfile, setUserProfile } = useAuthStore();
  const usuario = usuarioProp || userProfile;

  const getInitialFormData = () => {
    const tarifasDefault = nivelesSalariales?.tarifasHorasExtraBase || {
      normal: 15.50,
      nocturna: 18.75,
      festiva: 20.25,
      festivaNocturna: 23.80
    };

    return {
      tipoNomina: usuario?.tipoNomina || 'automatica',
      nivelSalarial: usuario?.nivel || usuario?.nivelSalarial || 1,
      trieniosAutomaticos: usuario?.trieniosAutomaticos ?? true,
      trieniosManual: usuario?.trieniosManual || 0,
      sueldoBaseManual: usuario?.sueldoBaseManual || 0,
      valorTrienioManual: usuario?.valorTrienioManual || 0,
      tarifasHorasExtra: usuario?.tarifasHorasExtra || tarifasDefault
    };
  };

  const [formData, setFormData] = useState(() => getInitialFormData());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const datosCalculados = calcularDatosNomina(formData, nivelesSalariales);
      const dataToSave = {
        ...formData,
        sueldoBaseFinal: datosCalculados.sueldoBase,
        trieniosFinal: datosCalculados.trienios,
        valorTrienioFinal: datosCalculados.valorTrienio
      };

      if (onSave) {
        await onSave(dataToSave);
      }

      setUserProfile({
        ...userProfile,
        ...dataToSave
      });
    } catch (error) {
      console.error('Error saving configuración nómina:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" p={4}>
        <CircularProgress />
        <Typography>Cargando configuración...</Typography>
      </Box>
    );
  }

  return (
    <>
      <CardContent sx={{ p: 3 }}>
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Tipo de Configuración
          </Typography>
          <RadioGroup
            value={formData.tipoNomina}
            onChange={(e) => setFormData({ ...formData, tipoNomina: e.target.value })}
          >
            <FormControlLabel 
              value="automatica" 
              control={<Radio />} 
              label="Usar niveles salariales automáticos" 
            />
            <FormControlLabel 
              value="manual" 
              control={<Radio />} 
              label="Introducir datos manualmente" 
            />
          </RadioGroup>
        </FormControl>

        {formData.tipoNomina === "automatica" ? (
          <ModoAutomatico 
            formData={formData} 
            setFormData={setFormData} 
          />
        ) : (
          <ModoManual 
            formData={formData} 
            setFormData={setFormData} 
          />
        )}

        <VistaPrevia 
          formData={formData} 
          nivelesSalariales={nivelesSalariales} 
        />

        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          fullWidth
          sx={{
            mt:2,
            borderRadius: 3,
            padding: 2,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            }
          }}
        >
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </CardContent>
    </>
  );
};

export default ConfiguradorNomina;
