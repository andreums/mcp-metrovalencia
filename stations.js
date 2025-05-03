import fs from 'fs';

// Carga el JSON de estaciones
const rawData = fs.readFileSync('./stations.json');
export const stations = JSON.parse(rawData);

// Mapa id -> nombre (usado para traducción rápida)
export const findStationById = {};
stations.forEach(station => {
  findStationById[station.id] = station.nombre;
});

// Buscar estación por nombre (ignora mayúsculas y acentos simples)
export async function findStationByName(name) {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return stations.find(s =>
    s.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === normalized
  );
}

// Agrupar por línea
export async function getStationsGroupedByLine() {
  const grouped = {};
  stations.forEach(station => {
    station.lineas.forEach(linea => {
      if (!grouped[linea]) {
        grouped[linea] = [];
      }
      if (!grouped[linea].some(s => s.id === station.id)) {
        grouped[linea].push({ id: station.id, nombre: station.nombre });
      }
    });
  });
  return grouped;
}

// Obtener estación por ID
export async function getStationById(id) {
  const station = stations.find(s => s.id === id);
  if (!station) {
    throw new Error(`No se encontró la estación con ID ${id}`);
  }
  return station;
}

// Obtener estaciones por línea
export async function getStationsByLine(line) {
  return stations.filter(station => station.lineas.includes(line));
}
