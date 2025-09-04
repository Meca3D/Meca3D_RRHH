// components/Admin/Vacaciones/SelectorDiasCancelacion.jsx
import React, { useState } from 'react';
import {
  Box, Typography, Chip, Alert, Grid, FormControlLabel, Checkbox
} from '@mui/material';
import { formatearFechaCorta, esFechaPasadaOHoy } from '../../../utils/dateUtils';

const SelectorDiasCancelacion = ({ fechasDisponibles, onDiasSeleccionados, diasSeleccionados, diasYaCancelados = [] }) => {
  
  // Filtrar solo días futuros (no se pueden cancelar días ya pasados)
  const diasCancelables = fechasDisponibles.filter(fecha => !esFechaPasadaOHoy(fecha) && !diasYaCancelados.includes(fecha));
  
  const handleToggleDia = (fecha) => {
    if (esFechaPasadaOHoy(fecha)||diasYaCancelados.includes(fecha)) return; // No permitir seleccionar días pasados o hoy
    const nuevaSeleccion = diasSeleccionados.includes(fecha)
      ? diasSeleccionados.filter(d => d !== fecha)
      : [...diasSeleccionados, fecha];
    
    onDiasSeleccionados(nuevaSeleccion);
  };

  const handleSeleccionarTodos = () => {
    if (diasSeleccionados.length === diasCancelables.length) {
      onDiasSeleccionados([]);
    } else {
      onDiasSeleccionados([...diasCancelables]);
    }
  };

  if (diasCancelables.length === 0) {
    return (
      <Alert severity="warning">
        No hay días disponibles para cancelar en esta solicitud.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2 }}>
        <Typography variant="subtitle1" sx={{width: '45%'}}>
          Selecciona los días a cancelar:
        </Typography>

        <FormControlLabel sx={{textAlign:'right'}}
          control={
            <Checkbox 
              checked={diasSeleccionados.length === diasCancelables.length}
              indeterminate={diasSeleccionados.length > 0 && diasSeleccionados.length < diasCancelables.length}
              onChange={handleSeleccionarTodos}
            />
          }
          label="Todos"
        />
      </Box>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        {fechasDisponibles.map((fecha, index) => {
          const estaSeleccionado = diasSeleccionados.includes(fecha);
          const esNoSeleccionable = esFechaPasadaOHoy(fecha)||diasYaCancelados.includes(fecha);
          
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
                  // Estilos para días no seleccionables (gris)
                  ...(esNoSeleccionable && {
                    backgroundColor: 'lightgrey',
                    color: 'black',
                    border: '1px solid lightgrey',
                    cursor: 'not-allowed',
                    textDecoration: 'line-through',
                  }),
                  // Estilos para días seleccionados (azul)
                  ...(estaSeleccionado && {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    border: '1px solid primary.main',
                    cursor: 'pointer',
                  }),
                  // Estilos para días seleccionables y no seleccionados (blanco)
                  ...(!estaSeleccionado && !esNoSeleccionable && {
                    backgroundColor: 'white',
                    color: 'black',
                    border: '1px solid grey',
                    cursor: 'pointer',
                    
                  }),
                }}
              >
                {formatearFechaCorta(fecha)}
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {diasSeleccionados.length > 0 && (
        <Alert severity="info">
          
          <Typography variant="body1">
            <strong>{diasSeleccionados.length} {`día${diasSeleccionados.length==1?"":"s"} seleccionados`}</strong>
          </Typography>
          <Typography variant="body2">
            Se devolvera{diasSeleccionados.length==1?"":"n"} a tu saldo
          </Typography>
          
        </Alert>
      )}
    </Box>
  );
};

export default SelectorDiasCancelacion;
