// components/Nominas/Nominas.jsx
import { useState } from 'react';
import {
  Container, Typography, Box, Tabs, Tab, Paper, Alert, Collapse,
  IconButton, useTheme, useMediaQuery
} from '@mui/material';
import {
  Settings as SettingsIcon, AccessTime as TimeIcon, Calculate as CalculateIcon,
  Add as AddIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { useNominaStore } from '../../stores/nominaStore';
import { useUIStore } from '../../stores/uiStore';
import ConfiguradorNomina from './ConfiguradorNomina';
import SelectorPeriodo from './SelectorPeriodo';
import HorasExtraList from './HorasExtraList';
import CalculadoraNomina from './CalculadoraNomina';

const Nominas = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, setUserProfile, userProfile } = useAuthStore();
  const { nivelesSalariales, saveUserNominaConfig } = useNominaStore(); 
  const { showSuccess, showError } = useUIStore();

  // Estados para la interfaz (mantener el diseño exacto)
  const [tabValue, setTabValue] = useState(0);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);
  const [configExpanded, setConfigExpanded] = useState(false);

  // Función para guardar configuración de nómina
 const handleSaveConfiguracion = async (configuracionData) => {
    try {
      // ✅ Una sola llamada a la store (como createOrder, deleteOrder)
      const configCompleta = await saveUserNominaConfig(user.email, configuracionData);
      
      // ✅ Actualizar authStore
      setUserProfile({
        ...userProfile,
        ...configCompleta
      });
      
      setConfigExpanded(false);
      showSuccess('Configuración guardada correctamente');
    } catch (error) {
      showError('Error al guardar configuración: ' + error.message);
      throw error;
    }
  };


  // Función para manejar cambio de período
  const handlePeriodoChange = (fechaInicio, fechaFin) => {
    setPeriodoSeleccionado({ fechaInicio, fechaFin });
    setTabValue(1); // Cambiar a la pestaña de horas extra
  };

  // Verificar si el usuario tiene configuración de nómina
  const hasNominaConfig = userProfile?.tipoNomina &&
    (userProfile.sueldoBaseFinal > 0 || userProfile.nivelSalarial);

  const tabsConfig = [
    {
      label: 'Configuración',
      icon: <SettingsIcon />,
      value: 0
    },
    {
      label: 'Horas Extra',
      icon: <TimeIcon />,
      value: 1,
      disabled: !hasNominaConfig
    },
    {
      label: 'Calculadora',
      icon: <CalculateIcon />,
      value: 2,
      disabled: !periodoSeleccionado
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <Typography textAlign="center" variant="h4" gutterBottom>
          Gestión de Nóminas
        </Typography>
        <Typography textAlign="center" variant="body1" color="text.secondary">
          Configura tu nómina y calcula tus ingresos
        </Typography>
      </Box>

      {/* Alerta si no hay configuración */}
      {!hasNominaConfig && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Configuración requerida:</strong> Completa tu configuración de nómina
            para poder registrar horas extra y calcular tus ingresos.
          </Typography>
        </Alert>
      )}

      {/* Navegación por pestañas (Desktop) */}
      {!isMobile && (
        <Paper elevation={0} sx={{ mb: 3, borderRadius: 4 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                overflow: 'hidden',
                textTransform: 'none',
                fontSize: '1rem'
              }
            }}
          >
            {tabsConfig.map((tab) => (
              <Tab
                key={tab.value}
                icon={tab.icon}
                label={tab.label}
                disabled={tab.disabled}
              />
            ))}
          </Tabs>
        </Paper>
      )}

      {/* Contenido según pestaña activa */}
      
      {/* Pestaña 0: Configuración */}
      {(!isMobile && tabValue === 0) || (isMobile && true) && (
        <Paper elevation={0} sx={{ mb: 3, borderRadius: 4 }}>
          {isMobile ? (
            // Versión móvil - Configuración colapsable
            <>
              <Box
                onClick={() => setConfigExpanded(!configExpanded)}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  Configuración de Nómina
                </Typography>
                {configExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Box>
              <Collapse in={configExpanded}>
                <ConfiguradorNomina
                  onSave={handleSaveConfiguracion}
                  nivelesSalariales={nivelesSalariales}
                />
              </Collapse>
            </>
          ) : (
            // Versión desktop
            <ConfiguradorNomina
              onSave={handleSaveConfiguracion}
              nivelesSalariales={nivelesSalariales}
            />
          )}
        </Paper>
      )}

      {/* Selector de Período (siempre visible si hay configuración) */}
      {hasNominaConfig && (
        <SelectorPeriodo
          onPeriodoChange={handlePeriodoChange}
          periodoActual={periodoSeleccionado}
        />
      )}

      {/* Pestaña 1: Horas Extra */}
      {((!isMobile && tabValue === 1) || isMobile) && hasNominaConfig && (
        <Box>
          {/* Lista de horas extra */}
          <HorasExtraList
            periodo={periodoSeleccionado}
          />
        </Box>
      )}

      {/* Pestaña 2: Calculadora */}
      {((!isMobile && tabValue === 2) || isMobile) && periodoSeleccionado && (
        <CalculadoraNomina periodo={periodoSeleccionado} />
      )}
    </Container>
  );
};

export default Nominas;
