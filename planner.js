import axios from 'axios';
import { findStationById } from './stations.js';

function pad(n) {
  return n < 10 ? '0' + n : n;
}

function sumSeconds(hora, segundosExtra) {
  const [h, m, s] = hora.split(':').map(Number);
  const total = h * 3600 + m * 60 + s + segundosExtra;
  const hh = pad(Math.floor(total / 3600));
  const mm = pad(Math.floor((total % 3600) / 60));
  const ss = pad(total % 60);
  return `${hh}:${mm}:${ss}`;
}

function toSeconds(hora) {
  const [h, m, s] = hora.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

export async function getPlanner(fromId, toId, inputDate, inputTime = '00:00') {
  const date = inputDate || new Date().toISOString().split('T')[0];
  const time = inputTime.length === 5 ? inputTime + ':00' : inputTime;

  const form = new URLSearchParams();
  form.append('action', 'formularios_ajax');
  form.append(
    'data',
    `action=horarios-ruta&origen=${fromId}&destino=${toId}&dia=${date}&horaDesde=00%3A00&horaHasta=23%3A59`
  );

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0',
    'X-Requested-With': 'XMLHttpRequest',
    Referer: 'https://www.metrovalencia.es/ca/consulta-horaris-i-planificador/',
  };

  const response = await axios.post(
    'https://www.metrovalencia.es/wp-content/themes/metrovalencia/functions/ajax-no-wp.php',
    form,
    { headers }
  );

  const data = response.data;
  if (!data.horarios || data.horarios.length === 0) return null;

  const horarios = data.horarios;
  const transbordo = horarios.length > 1;
  const pasos = horarios.map((h) => h.horas).filter(Boolean);
  const trenes = horarios.map((h) => h.trenes).filter(Boolean).flat();

  const combinaciones = [];
  const minTime = toSeconds(time);

  if (!transbordo) {
    const origenNombre = findStationById[fromId];
    const destinoNombre = findStationById[toId];
    for (let i = 0; i < pasos[0].length; i++) {
      const [hora, tren] = pasos[0][i];
      if (toSeconds(hora) < minTime) continue;
      const t = trenes.find((t) => t.id === tren);
      if (!t) continue;
      combinaciones.push({
        salida: hora,
        trayecto: [
          {
            hora,
            tren,
            linea: `Línea ${t.linea}`,
            destino: t.destino,
            desde: origenNombre,
            hasta: destinoNombre,
            duracion: horarios[0].duracion,
            llegada: sumSeconds(hora, horarios[0].duracion),
          },
        ],
      });
    }
  } else {
    const pasos1 = pasos[0];
    const pasos2 = pasos[1];
    const trenes1 = horarios[0].trenes;
    const trenes2 = horarios[1].trenes;

    for (const [hora1, tren1] of pasos1) {
      if (toSeconds(hora1) < minTime) continue;
      const tren1info = trenes1.find((t) => t.id === tren1);
      if (!tren1info) continue;

      const llegadaEmpalme = sumSeconds(hora1, horarios[0].duracion);

      for (const [hora2, tren2] of pasos2) {
        if (hora2 >= llegadaEmpalme) {
          const tren2info = trenes2.find((t) => t.id === tren2);
          if (!tren2info) continue;
          const llegadaFinal = sumSeconds(hora2, horarios[1].duracion);
          combinaciones.push({
            salida: hora1,
            trayecto: [
              {
                hora: hora1,
                tren: tren1,
                linea: `Línea ${tren1info.linea}`,
                destino: tren1info.destino,
                desde: findStationById[fromId],
                hasta: 'Empalme',
                duracion: horarios[0].duracion,
              },
              {
                hora: hora2,
                tren: tren2,
                linea: `Línea ${tren2info.linea}`,
                destino: tren2info.destino,
                desde: 'Empalme',
                hasta: findStationById[toId],
                duracion: horarios[1].duracion,
                llegada: llegadaFinal,
              },
            ],
          });
          break;
        }
      }
    }
  }

  return {
    origen: findStationById[fromId],
    destino: findStationById[toId],
    total: combinaciones.length,
    transbordo,
    combinaciones,
  };
}
