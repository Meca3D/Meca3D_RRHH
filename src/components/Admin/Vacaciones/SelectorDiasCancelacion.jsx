// components/Admin/Vacaciones/SelectorDiasCancelacion.jsx
import {
  Box, Typography, Chip, Alert, Grid, FormControlLabel, Checkbox
} from '@mui/material';
import { formatearFechaCorta, esFechaPasadaOHoy, ordenarFechas } from '../../../utils/dateUtils';
import { formatearTiempoVacasLargo, formatearTiempoVacas } from '../../../utils/vacacionesUtils';
import { useVacacionesStore } from '../../../stores/vacacionesStore';

const SelectorDiasCancelacion = ({ 
  solicitud,               //  Recibe solicitud completa
  onDiasSeleccionados, 
  diasSeleccionados, 
  esAdmin = false         // Indica si es admin
}) => {

 const { obtenerDiasCancelados, obtenerDiasDisfrutados } = useVacacionesStore();
  
 
  const diasCancelados = obtenerDiasCancelados(solicitud.cancelacionesParciales || []);
  const diasDisfrutados = obtenerDiasDisfrutados(solicitud);
  
  // ✅ NUEVA: Lógica para días disponibles
  const diasDisponiblesParaCancelar = solicitud.fechas.filter(fecha => {
    const yaFueCancelado = diasCancelados.includes(fecha);
    const esFechaPasada = esFechaPasadaOHoy(fecha);
    const estaDisponible = esAdmin ? !yaFueCancelado : (!yaFueCancelado && !esFechaPasada);
    return estaDisponible;
  });

  const handleToggleDia = (fecha) => {
    if (!esAdmin && (esFechaPasadaOHoy(fecha)||diasCancelados.includes(fecha))) return; // No permitir seleccionar días pasados o hoy a users
    const nuevaSeleccion = diasSeleccionados.includes(fecha)
      ? diasSeleccionados.filter(d => d !== fecha)
      : [...diasSeleccionados, fecha];
    
    onDiasSeleccionados(nuevaSeleccion);
  };

  const handleSeleccionarTodos = () => {
    if (diasSeleccionados.length === diasDisponiblesParaCancelar.length) {
      onDiasSeleccionados([]);
    } else {
      onDiasSeleccionados([...diasDisponiblesParaCancelar]);
    }
  };

  if (diasDisponiblesParaCancelar.length === 0) {
    return (
      <Alert severity="warning">
        No hay días disponibles para cancelar en esta solicitud.
      </Alert>
    );
  }

  return (
    <Box >
        <Typography variant="h6" textAlign="center" sx={{fontWeight:'bold' }}>
          Días a cancelar
        </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <FormControlLabel sx={{textAlign:'right'}}
          control={
            <Checkbox 
            indeterminate={diasSeleccionados.length > 0 && diasSeleccionados.length < diasDisponiblesParaCancelar.length}
            checked={diasSeleccionados.length > 0 && diasSeleccionados.length === diasDisponiblesParaCancelar.length}
            onChange={handleSeleccionarTodos}
            />
          }
          label="Todos los Disponibles"
        />
      </Box>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        {ordenarFechas(solicitud.fechas).map((fecha, index) => {
          const estaSeleccionado = diasSeleccionados.includes(fecha);
          const estaCancelado = diasCancelados.includes(fecha);
          const estaDisfrutado = diasDisfrutados.includes(fecha);
          const esSeleccionable = diasDisponiblesParaCancelar.includes(fecha);
          
          let estado = 'disponible';
          if (estaCancelado) estado = 'cancelado';
          else if (estaDisfrutado) estado = 'disfrutado';
          else if (!esSeleccionable) estado = 'noSeleccionable';

          return (
            <Grid size={{ xs: 6, sm: 4 }} key={index}>
              <Box
                onClick={() => handleToggleDia(fecha)}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  height: '2.3rem', // Altura similar a un chip
                  borderRadius: '1.15rem', // Borde redondeado de chip
                  padding: '0 12px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                  // ✅ NUEVOS: Estilos por estado
                  ...(estado === 'cancelado' && {
                    backgroundColor: 'rojo.fondo',
                    color: 'error.main',
                    border: '1px solid',
                    borderColor: 'error.main',
                    textDecoration: 'line-through'
                  }),
                  ...(estado === 'disfrutado' && {
                    backgroundColor: 'verde.fondo',
                    color: 'success.main',
                    border: '1px solid',
                    borderColor: 'success.main',
                    fontStyle: 'italic'
                  }),
                  ...(estado === 'disfrutado' && estaSeleccionado && {
                    backgroundColor: 'azul.fondo',
                    color: 'verde.main',
                    border: '1px solid',
                    borderColor: 'primary.main'
                  }),
                  ...(estado === 'disponible' && estaSeleccionado && {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    border: '1px solid',
                    borderColor: 'primary.main'
                  }),
                  ...(estado === 'disponible' && !estaSeleccionado && {
                    backgroundColor: 'white',
                    color: 'black',
                    border: '1px solid grey'
                  }),
                  ...(estado === 'noSeleccionable' && {
                    backgroundColor: 'grey.200',
                    color: 'text.disabled',
                    border: '1px solid',
                    borderColor: 'grey.300'
                  })
                }}
              >
                {formatearFechaCorta(fecha)}
              </Box>
            </Grid>
          );
        })}
      </Grid>
            {/* Leyenda */}
            
      <Box sx={{ mt: 4, display: 'flex', justifyContent:'center', flexWrap: 'wrap', gap: 1 }}>
        <Chip size="small" label="Disponible" sx={{ bgcolor: 'white', border: '1px solid grey' }} />
        <Chip size="small" label="Cancelado" sx={{ bgcolor: 'rojo.fondo', color: 'error.main' }} />
        <Chip size="small" label="Disfrutado" sx={{ bgcolor: 'verde.fondo', color: 'success.main' }} />
        <Chip size="small" label="Seleccionado" color="primary" />
        {!esAdmin && <Chip size="small" label="No disponible" sx={{ bgcolor: 'grey.200' }} />}
      </Box>
    </Box>
  );
};

export default SelectorDiasCancelacion;
