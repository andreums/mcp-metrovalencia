import express from 'express';
import cors from 'cors';
import { getStationScheduleParsed } from './scraper.js';
import { getStationsGroupedByLine, findStationById, findStationByName } from './stations.js';
import { getPlanner } from './planner.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares generales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Headers CORS + MCP
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('MCP', '1'); // Header del Model Context Protocol
  next();
});

// Endpoints

// Endpoint para obtener los horarios de llegada de una estación
app.get('/arrival', async (req, res) => {
  let stationId = parseInt(req.query.stationId);
  const name = req.query.name;

  if (!stationId && name) {
    const station = await findStationByName(name);
    if (!station) {
      return res.status(404).json({ error: `No se encontró la estación "${name}"` });
    }
    stationId = station.id;
  }

  if (!stationId) {
    return res.status(400).json({ error: 'Debe proporcionar stationId o name' });
  }

  try {
    const schedule = await getStationScheduleParsed(stationId);
    return res.json(schedule);
  } catch (err) {
    console.error('❌ Error obteniendo horarios de llegada:', err.message);
    res.status(500).json({ error: 'Error obteniendo horarios de llegada', detalle: err.message });
  }
});

// Endpoint para obtener las estaciones agrupadas por línea
app.get('/lines', async (req, res) => {
  try {
    const grouped = await getStationsGroupedByLine();
    res.json(grouped);
  } catch (err) {
    console.error('❌ Error agrupando estaciones por línea:', err.message);
    res.status(500).json({ error: 'Error agrupando estaciones por línea', detalle: err.message });
  }
});

// Endpoint para buscar estación por nombre
app.get('/station', async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'Falta el parámetro name' });

  try {
    const station = await findStationByName(name);
    if (!station) return res.status(404).json({ error: 'Estación no encontrada' });

    res.json(station);
  } catch (err) {
    console.error('❌ Error buscando estación por nombre:', err.message);
    res.status(500).json({ error: 'Error buscando estación por nombre', detalle: err.message });
  }
});

// Endpoint para buscar estación por ID
app.get('/station/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Falta el parámetro id (número)' });

  // Aquí se corrige el acceso a findStationById, ya que es un objeto, no una función
  const stationName = findStationById[id];
  if (!stationName) return res.status(404).json({ error: 'Estación no encontrada' });

  res.json({ id, name: stationName });
});

// Endpoint para consultar rutas
app.get('/route', async (req, res) => {
  const from = parseInt(req.query.from);
  const to = parseInt(req.query.to);
  const date = req.query.date;
  const time = req.query.time;

  if (!from || !to) {
    return res.status(400).json({ error: 'Parámetros "from" y "to" son obligatorios (IDs)' });
  }

  try {
    const result = await getPlanner(from, to, date, time);
    if (!result) {
      return res.status(404).json({ error: 'No se encontraron rutas para la consulta indicada' });
    }
    res.json(result);
  } catch (err) {
    console.error('❌ Error consultando Metrovalencia:', err.message);
    res.status(500).json({ error: 'Error consultando Metrovalencia', detalle: err.message });
  }
});

// Endpoint para enviar eventos SSE (Server-Sent Events)
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Envía los encabezados de respuesta inmediatamente

  // Simula el envío de eventos SSE con un intervalo
  const intervalId = setInterval(() => {
    const message = {
      time: new Date().toISOString(),
      data: 'Nuevo evento de tren',
      linea: "Línea 1",
      destino: "València Sud",
      minutos: "5 min"
    };

    res.write(`data: ${JSON.stringify(message)}\n\n`);
  }, 5000); // Envía un evento cada 5 segundos

  // Cerrar la conexión cuando el cliente se desconecte
  req.on('close', () => {
    clearInterval(intervalId);
    console.log('Conexión SSE cerrada');
  });
});


// Página raíz
app.get('/', (req, res) => {
  res.send(`
    <h1>🚇 API de Metrovalencia (compatible MCP)</h1>
    <p>Endpoints disponibles:</p>
    <ul>
      <li><code>/arrival?stationId=1</code> – Horarios en una estación</li>
      <li><code>/station?name=Empalme</code> – Buscar estación por nombre</li>
      <li><code>/station/:id</code> – Buscar estación por ID</li>
      <li><code>/lines</code> – Estaciones agrupadas por línea</li>
      <li><code>/route?from=20&to=112&date=2025-05-04&time=20:30</code> – Rutas planificadas entre estaciones</li>
    </ul>
    <p><strong>Este servidor responde con <code>MCP: 1</code> en cabecera.</strong></p>
  `);
});

// Fallbacks
app.use((req, res) => {
  res.status(404).send('❌ Endpoint no encontrado');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('💥 Error interno del servidor');
});

// Arranque del servidor
app.listen(PORT, () => {
  console.log(`✅ MCP Server activo en http://localhost:${PORT}`);
});
