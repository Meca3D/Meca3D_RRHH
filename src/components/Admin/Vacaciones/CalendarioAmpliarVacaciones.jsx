

import { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Paper, Divider } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useVacacionesStore } from '../../../stores/vacacionesStore';
import { capitalizeFirstLetter } from '../../Helpers';
import {
  formatYMD, formatearMesAno, obtenerDiasCalendario, navegarMes, esFinDeSemana, esFechaPasada
} from '../../../utils/dateUtils';

const DIAS = ['L','M','X','J','V','S','D'];

const CalendarioAmpliarVacaciones = ({
  fechasSeleccionadas,
  onFechasChange,
  esAdmin = false, // Permitir editar días pasados solo si es admin
  fechasOriginales = [], // Fechas originales de la solicitud (para bloquear en modo añadir)
  horasDisponibles
}) => {
  const [mesActual, setMesActual] = useState(new Date());
  const { esFestivo, loadFestivos,  } = useVacacionesStore();

  const cambiarMes = (direccion) => {
    setMesActual(navegarMes(mesActual, direccion));
  };

  // Cargar festivos al montar
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
    if (esFestivo(fechaStr) || esFinDeSemana(fechaStr)) return;

    // 🆕 Bloquear si se pasaría del límite de horas (nuevo)
    if (!fechasSeleccionadas.includes(fechaStr)) {
        const horasTotalesSiSelecciona = (fechasSeleccionadas.length + 1) * 8;
        if (horasTotalesSiSelecciona > horasDisponibles) {
        return;
        }
    }

    // Alternar selección
    if (fechasSeleccionadas.includes(fechaStr)) {
      onFechasChange(fechasSeleccionadas.filter(f => f !== fechaStr));
    } else {
      onFechasChange([...fechasSeleccionadas, fechaStr]);
    }
  };

  const estiloDia = (dia) => {
    const fechaStr = formatYMD(dia);
    const hoy = formatYMD(new Date()) === fechaStr;
    const seleccionado = fechasSeleccionadas.includes(fechaStr);
    const fueraMes = dia.getMonth() !== mesActual.getMonth();
    const esFestivoDia = esFestivo(fechaStr);
    const esFinSemana = esFinDeSemana(dia);
    const esFechaOriginal = fechasOriginales.includes(fechaStr);
    const esDiaPasado = !esAdmin && esFechaPasada(fechaStr);
      // Calcular si se pasaría del límite de horas disponibles
    const horasTotalesSiSelecciona = (fechasSeleccionadas.length + 1) * 8;
    const sePasariaDelLimite = !seleccionado && horasTotalesSiSelecciona > horasDisponibles;


    const base = {
      minHeight: 45,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: (!esFechaOriginal && !esFestivoDia && !esFinSemana && !sePasariaDelLimite) ? 'pointer' : 'not-allowed',
      borderRadius: 1,
      transition: 'all .2s ease',
      fontSize: '0.875rem',
      opacity: fueraMes || esDiaPasado ? 0.5 : 1,
      border: hoy ? '2px solid black' : ''
    };

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
        bgcolor: '#e3f2fd', // azul muy claro
        color: 'primary.main',
        border: '2px dashed',
        borderColor: 'primary.main',
        cursor: 'not-allowed',
      };
    }

    // 🆕 Límite alcanzado (nuevo)
    if (sePasariaDelLimite) {
        return {
        ...base,
        bgcolor: '#fff3e0', // naranja claro
        color: 'text.disabled',
        cursor: 'not-allowed'
        };
    }

    // Festivo
    if (esFestivoDia) {
      return {
        ...base,
        bgcolor: '#f44f68ff',
        color: '#fff',
        border: '1px dashed #d32f2f',
      };
    }

    // Día pasado (bloqueado para trabajadores)
    if (esDiaPasado) {
      return {
        ...base,
        bgColor: '#f8f9fa',
        color: 'text.disabled',
        cursor: 'not-allowed',
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
    <Box sx={{ width: '100%', mt: 1 }}>
      {/* Cabecera */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => cambiarMes(-1)}>
          <ChevronLeft sx={{fontSize:'2.5rem'}}/>
        </IconButton>
        <Typography variant="h6" fontWeight='bold'>{capitalizeFirstLetter(formatearMesAno(mesActual))}</Typography>
        <IconButton onClick={() => cambiarMes(1)}>
          <ChevronRight sx={{fontSize:'2.5rem'}}/>
        </IconButton>
      </Box>

      {/* Días de la semana */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 1 }}>
        {DIAS.map(d => (
          <Box key={d} sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.875rem' }}>
            {d}
          </Box>
        ))}
      </Box>

      {/* Cuadrícula de días */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
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

      <Divider sx={{ my: 2 }} />

      {/* Leyenda */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: '0.8rem' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: 'primary.main', borderRadius: 0.5 }} />
          <Typography variant="caption">Seleccionado</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#f44f68ff', borderRadius: 0.5 }} />
          <Typography variant="caption">Festivo</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#e1dfdf', borderRadius: 0.5 }} />
          <Typography variant="caption">Fin de semana</Typography>
        </Box>
        {fechasOriginales.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#e3f2fd', border: '2px dashed', borderColor: 'primary.main', borderRadius: 0.5 }} />
            <Typography variant="caption">Original</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#fff3e0', borderRadius: 0.5 }} />
            <Typography variant="caption">Límite alcanzado</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default CalendarioAmpliarVacaciones;
