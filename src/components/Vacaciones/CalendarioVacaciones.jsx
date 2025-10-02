// components/Vacaciones/CalendarioVacaciones.jsx
import React, { useState } from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import { 
  formatYMD, formatearMesAno, obtenerDiasCalendario, navegarMes, esFinDeSemana
} from '../../utils/dateUtils';

const DIAS = ['L','M','X','J','V','S','D'];

const CalendarioVacaciones = ({
  fechasSeleccionadas, onFechasChange,
  tipoSolicitud, esFechaSeleccionable, horasLibres
}) => {
  const [mesActual, setMesActual] = useState(new Date());
  const { esFestivo } = useVacacionesStore();
  const cambiarMes = (direccion) => {
    setMesActual(navegarMes(mesActual, direccion));
  };

const alternarDia = (dia) => {
  const fechaStr = formatYMD(dia);
  
  if (!esFechaSeleccionable(fechaStr)) return;

  if (tipoSolicitud === 'horas') {
    onFechasChange([fechaStr]);
  } else {
    if (fechasSeleccionadas.includes(fechaStr)) {
      onFechasChange(fechasSeleccionadas.filter(f => f !== fechaStr));
    } else {
        const horasTotalesConNuevoDia = (fechasSeleccionadas.length + 1) * 8;
      if (horasTotalesConNuevoDia <= horasLibres) {
        onFechasChange([...fechasSeleccionadas, fechaStr]);
      }
    }
  }
};


  const estiloDia = (dia) => {
    const fechaStr = formatYMD(dia);
    const seleccionado = fechasSeleccionadas.includes(fechaStr);
    const fueraMes = dia.getMonth() !== mesActual.getMonth();
    const seleccionable = esFechaSeleccionable(fechaStr);
    const esFestivoDia = esFestivo(fechaStr);
    const esFinSemana = esFinDeSemana(dia);
    const horasTotalesSiSelecciona = tipoSolicitud === 'dias' 
      ? (fechasSeleccionadas.length + 1) * 8 
      : 0;
    const sePasariaDelLimite = tipoSolicitud === 'dias' && 
      !seleccionado && 
      horasTotalesSiSelecciona > horasLibres;

    const base = { 
      minHeight: 45, 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: (seleccionable && !sePasariaDelLimite) ? 'pointer' : 'default', 
      borderRadius: 1,
      transition: 'all .2s ease',
      fontSize: '0.875rem'
    };

    // Prioridad 1: Seleccionado (siempre azul)
    if (seleccionado) {
      return { 
        ...base, 
        bgcolor: 'primary.main', 
        color: '#fff',
      };
    }

    // Prioridad 2: No seleccionable
     if (!seleccionable || sePasariaDelLimite) {
      let bgColor = '#f8f9fa';
      
      if (sePasariaDelLimite) bgColor = '#fff3e0'; // naranja claro para "límite alcanzado"
      else if (esFestivoDia) bgColor = '#f58898';  // rojo  festivos
      else if (esFinSemana) bgColor = '#e1dfdf';   // gris fin de semana
      
      return { 
        ...base, 
        bgcolor: bgColor, 
        color: 'text.disabled',
        cursor: 'not-allowed' 
      };
    }

    // Prioridad 3: Fuera del mes pero seleccionable
    if (fueraMes) {
      return { 
        ...base, 
        color: 'text.disabled',
        '&:hover': { bgcolor: 'primary.50' }
      };
    }

    // Prioridad 4: Día normal seleccionable
    return { 
      ...base, 
      '&:hover': { bgcolor: 'primary.50' } 
    };
  };

  const dias = obtenerDiasCalendario(mesActual);

  return (
    <Box>
      {/* Cabecera */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2
      }}>
        <IconButton size="small" onClick={() => cambiarMes(-1)}>
          <ChevronLeft sx={{fontSize:'2rem'}}/>
        </IconButton>
        
        <Typography fontWeight={600} sx={{ fontSize:'1.4rem', textTransform: 'capitalize' }}>
          {formatearMesAno(mesActual)}
        </Typography>
        
        <IconButton size="small" onClick={() => cambiarMes(1)}>
          <ChevronRight sx={{fontSize:'2rem'}}/>
        </IconButton>
      </Box>

      {/* Días de la semana */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7,1fr)', 
        mb: 1,
        gap: 0.5
      }}>
        {DIAS.map(d => (
          <Box key={d} sx={{ textAlign: 'center', py: 0.5 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {d}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Cuadrícula de días */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7,1fr)', 
        gap: 0.5
      }}>
        {dias.map((dia, i) => (
          <Paper 
            key={i} 
            onClick={() => alternarDia(dia)} 
            sx={estiloDia(dia)}
            elevation={0}
          >
            <Typography variant="body2" fontWeight={500}>
              {dia.getDate()}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Leyenda */}
      <Box sx={{ 
        mt: 2, 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1.5, 
        justifyContent: 'center' 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: 0.5 }} />
          <Typography variant="subtitle2">Seleccionado</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: '#f58898ff', borderRadius: 0.5 }} />
          <Typography variant="subtitle2">Festivo</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: '#e1dfdfff', borderRadius: 0.5 }} />
          <Typography variant="subtitle2">Fin de semana</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default CalendarioVacaciones;
