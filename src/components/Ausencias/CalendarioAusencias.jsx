// components/Ausencias/CalendarioAusencias.jsx

import { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Paper, Divider } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useVacacionesStore } from '../../stores/vacacionesStore';
import {
  formatYMD, formatearMesAno, obtenerDiasCalendario, navegarMes, esFinDeSemana, esFechaPasada
} from '../../utils/dateUtils';

const DIAS = ['L','M','X','J','V','S','D'];

const CalendarioAusencias = ({
    fechasSeleccionadas,
    onFechasChange,
    esAdmin = false, // Permitir editar días pasados solo si es admin
    fechasOriginales = [] // Fechas originales de la ausencia (para bloquear en modo añadir)
  }) => {
  const [mesActual, setMesActual] = useState(new Date());
  const { esFestivo, loadFestivos } = useVacacionesStore();

  const cambiarMes = (direccion) => {
    setMesActual(navegarMes(mesActual, direccion));
  };

    // Cargar festivos y config al montar
    useEffect(() => {
      const unsubFestivos = loadFestivos();
      return () => {
        if (unsubFestivos) unsubFestivos();
      };
    }, [loadFestivos]);

  const alternarDia = (dia) => {
    const fechaStr = formatYMD(dia);
    
    // Bloquear días pasados para trabajadores
    if (!esAdmin && esFechaPasada(fechaStr)) {
      return;
    }
    
    // Bloquear fechas originales (no se pueden deseleccionar al añadir)
    if (fechasOriginales.includes(fechaStr)) {
      return;
    }
    
    if (fechasSeleccionadas.includes(fechaStr)) {
      onFechasChange(fechasSeleccionadas.filter(f => f !== fechaStr));
    } else {
      onFechasChange([...fechasSeleccionadas, fechaStr]);
    }
  };


  const estiloDia = (dia) => {
    const fechaStr = formatYMD(dia);
    const hoy = formatYMD(new Date())===fechaStr
    const seleccionado = fechasSeleccionadas.includes(fechaStr);
    const fueraMes = dia.getMonth() !== mesActual.getMonth();
    const esFestivoDia = esFestivo(fechaStr);
    const esFinSemana = esFinDeSemana(dia);
    const esFechaOriginal = fechasOriginales.includes(fechaStr);
    const esDiaPasado = !esAdmin && esFechaPasada(fechaStr);
    const esSeleccionable=!esDiaPasado && !esFestivoDia ;

  
  
  const base = {
    minHeight: 45,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: 1,
    transition: 'all .2s ease',
    fontSize: '0.875rem',
    opacity: fueraMes||esDiaPasado ? 0.5 : 1,
    border: hoy? '2px solid black' :""
  };

  // Día seleccionado y Festivo
    if (seleccionado && esFestivoDia) {
      return {
        ...base,
        bgcolor: 'primary.main',
        color: '#fff',
        border: '2px solid red'
      };
    }

  // Día seleccionado
  if (seleccionado) {
    return {
      ...base,
      bgcolor: 'primary.main',
      color: '#fff',
    };
  }
  
  // Día original (no se puede deseleccionar)
  if (esFechaOriginal) {
    return {
      ...base,
        bgcolor: '#e3f2fd',  // azul muy claro
        color: 'primary.main',
        border: '2px dashed',
        borderColor: 'primary.main',
        cursor: 'not-allowed',
    };
  }

    // Día pasado (bloqueado para trabajadores)
    if (esDiaPasado) {
      return {
        ...base,
        bgColor : '#f8f9fa',
        color: 'text.disabled',
        cursor: 'not-allowed',
      };
    }

    // Festivo 
    if (esFestivoDia) {
      return {
        ...base,
        bgcolor: '#f44f68ff',
        color: "#fff",
        border: '1px dashed #d32f2f',
      };
    }

    // Fin de semana
    if (esFinSemana) {
      return {
        ...base,
        bgcolor: '#e1dfdf',
        color: 'text.disabled',
      };
    }

    // Fuera del mes
    if (fueraMes) {
      return {
        ...base,
        color: 'text.disabled',
      };
    }
    // Día normal
    return {
      ...base,

    };
  };

  const dias = obtenerDiasCalendario(mesActual);

  return (
    <Box>
      {/* Cabecera */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <IconButton onClick={() => cambiarMes(-1)}>
          <ChevronLeft sx={{fontSize:'2rem'}}/>
        </IconButton>
        <Typography fontWeight={600} sx={{ fontSize:'1.4rem', textTransform: 'capitalize' }}>
          {formatearMesAno(mesActual)}
        </Typography>
        <IconButton onClick={() => cambiarMes(1)}>
          <ChevronRight sx={{fontSize:'2rem'}}/>
        </IconButton>
      </Box>

      {/* Días de la semana */}
      <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5} mb={0}>
        {DIAS.map(d => (
          <Box key={d} textAlign="center" fontWeight={600} fontSize="0.875rem">
            {d}
          </Box>
        ))}
      </Box>
      <Divider sx={{bgcolor:'black', mb:1 }} />
      {/* Cuadrícula de días */}
      <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5}>
        {dias.map((dia, i) => (
          <Paper
            key={i}
            onClick={() => alternarDia(dia)}
            sx={estiloDia(dia)}
            elevation={0}
          >
            {dia.getDate()}
          </Paper>
        ))}
      </Box>

      {/* Leyenda */}
      <Box display="flex" flexWrap="wrap" gap={1} mt={3} justifyContent="center">
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box width={20} height={20} bgcolor="primary.main" borderRadius={0.5} />
          <Typography variant="subtitle1">Seleccionado</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box width={20} height={20} bgcolor="#f44f68ff" borderRadius={0.5} />
          <Typography variant="subtitle1">Festivo</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box width={20} height={20} bgcolor="#e1dfdf" borderRadius={0.5} />
          <Typography variant="subtitle1">Fin de semana</Typography>
        </Box>
        {fechasOriginales.length > 0 &&(
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box width={20} height={20} sx={{ bgcolor: '#e3f2fd', color: 'primary.main', border: '2px dashed', borderColor: 'primary.main',}} borderRadius={0.5} />
          <Typography variant="subtitle1">Original</Typography>
        </Box>)}
      </Box>
    </Box>
  );
};

export default CalendarioAusencias;
