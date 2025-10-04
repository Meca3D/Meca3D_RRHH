// components/Admin/ImportVacacionesSeed.jsx
import { useState } from 'react';
import { Button, Stack, Alert, CircularProgress } from '@mui/material';
import { collection, doc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { VACACIONES_SEED_2025 } from '../../../seed/vacacionesSeed2025';

const HORAS_POR_DIA = 8;
const INICIAL_DISPONIBLES_H = 200;
const OBJETIVO_DISPONIBLES_H = 40;

function parseYMD(ymd) { return new Date(ymd); }

export default function SeedVacacionesData() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(null);
  const [err, setErr] = useState(null);

  const handleImport = async () => {
    setLoading(true);
    setOk(null);
    setErr(null);
    try {
      for (const empleado of VACACIONES_SEED_2025) {
        const email = empleado.email;
        const solicitudes = [...empleado.solicitudes].sort((a, b) => {
          const da = a.fechaSolicitud ? parseYMD(a.fechaSolicitud).getTime() : 0;
          const dbb = b.fechaSolicitud ? parseYMD(b.fechaSolicitud).getTime() : 0;
          return da - dbb;
        });

        // Balance por empleado
        let disponibles = INICIAL_DISPONIBLES_H;
        let pendientesHoras = 0;

        for (const s of solicitudes) {
          const vacRef = doc(collection(db, 'VACACIONES'));
          const id = vacRef.id;

          const totalHoras = (s.fechas?.length || 0) * HORAS_POR_DIA;

          let horasConsumidas = 0;
 if (s.estado === 'aprobada' || s.estado === 'cancelado') {
   // 1) Aprobación: restar todo lo solicitado
   horasConsumidas = totalHoras;
 } else if (s.estado === 'pendiente') {
   // Pendiente no altera disponibles
   pendientesHoras += totalHoras;
 }

const horasDisponiblesAntes = disponibles;
 const horasDisponiblesDespues =
   (s.estado === 'aprobada' || s.estado === 'cancelado')
     ? Math.max(0, disponibles - horasConsumidas)
     : disponibles;
 // Avanzar saldo tras la aprobación/cancelación (fase aprobación)
 disponibles = horasDisponiblesDespues;

          // Escritura solicitud principal
          await setDoc(vacRef, {
            ...s,
            solicitante: email,
            horasDisponiblesAntes,
            horasDisponiblesDespues,
            // Para cancelación total, añadimos los campos de tracking en el doc principal
   ...(s.estado === 'cancelado'
     ? {
         horasDisponiblesAntesCancelacion: null, // se rellenará unas líneas abajo al calcular devolución
         horasDisponiblesDespuesCancelacion: null
       }
     : {}),
            createdAt: s.fechaSolicitud ? parseYMD(s.fechaSolicitud) : new Date(),
            updatedAt: s.fechaAprobacionDenegacion ? parseYMD(s.fechaAprobacionDenegacion) : parseYMD(s.fechaSolicitud || '2025-01-02')
          });

          // Subcolección de cancelaciones parciales (si existen)
          if (Array.isArray(s.cancelacionesParciales) && s.cancelacionesParciales.length > 0) {
            for (const p of s.cancelacionesParciales) {
              const cRef = doc(collection(db, 'VACACIONES', id, 'cancelaciones_parciales'));
               // Antes de escribir cada cancelación parcial, calcular devolución y actualizar saldo
 const horasDevueltas = (p.fechasCanceladas?.length || 0) * HORAS_POR_DIA;
 const horasDisponiblesAntesCancelacion = disponibles;
 const horasDisponiblesDespuesCancelacion = disponibles + horasDevueltas;
 disponibles = horasDisponiblesDespuesCancelacion;

              await setDoc(cRef, {
                fechasCanceladas: p.fechasCanceladas || [],
                horasDevueltas,
    motivoCancelacion: p.motivoCancelacion || '',
    fechaCancelacion: p.fechaCancelacion || s.fechaAprobacionDenegacion || s.fechaSolicitud,
    createdAt: p.fechaCancelacion ? parseYMD(p.fechaCancelacion) : new Date(),

                   horasDisponiblesAntesCancelacion,
   horasDisponiblesDespuesCancelacion
              });
            }
          }
        }

        // Ajuste final forzado de saldo visible a 40h y pendientes acumuladas
        const userRef = doc(db, 'USUARIOS', email);
        await runTransaction(db, async (tx) => {
          tx.update(userRef, {
            'vacaciones.disponibles': OBJETIVO_DISPONIBLES_H,
            'vacaciones.pendientes': pendientesHoras,
            updatedAt: new Date()
          });
        });
      }

      setOk('Importación completada');
    } catch (e) {
      console.error(e);
      setErr(e.message || 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      {err && <Alert severity="error">{err}</Alert>}
      {ok && <Alert severity="success">{ok}</Alert>}
      <Button variant="contained" onClick={handleImport} disabled={loading}>
        {loading ? <CircularProgress size={20} /> : 'Importar vacaciones (JSON estático)'}
      </Button>
    </Stack>
  );
}
