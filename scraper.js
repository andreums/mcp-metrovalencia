import axios from 'axios';
import * as cheerio from 'cheerio'; // Usando la sintaxis correcta para importar cheerio
import { findStationById } from './stations.js';

// Mapa de las líneas con su icono correspondiente (en formato SVG)
const lineIcons = {
  "Línea 1": "https://www.metrovalencia.es/wp-content/themes/metrovalencia/images/lineas/icono--linea-1.svg",
  "Línea 2": "https://www.metrovalencia.es/wp-content/themes/metrovalencia/images/lineas/icono--linea-2.svg",
  "Línea 3": "https://www.metrovalencia.es/wp-content/themes/metrovalencia/images/lineas/icono--linea-3.svg",
  "Línea 4": "https://www.metrovalencia.es/wp-content/themes/metrovalencia/images/lineas/icono--linea-4.svg",
  "Línea 5": "https://www.metrovalencia.es/wp-content/themes/metrovalencia/images/lineas/icono--linea-5.svg",
  "Línea 6": "https://www.metrovalencia.es/wp-content/themes/metrovalencia/images/lineas/icono--linea-6.svg",
  "Línea 7": "https://www.metrovalencia.es/wp-content/themes/metrovalencia/images/lineas/icono--linea-7.svg",
  "Línea 8": "https://www.metrovalencia.es/wp-content/themes/metrovalencia/images/lineas/icono--linea-8.svg",
  "Línea 9": "https://www.metrovalencia.es/wp-content/themes/metrovalencia/images/lineas/icono--linea-9.svg",
  "Línea 10": "https://www.metrovalencia.es/wp-content/themes/metrovalencia/images/lineas/icono--linea-10.svg",
};

// Función para obtener los horarios de llegada en una estación específica
export async function getStationScheduleParsed(stationId) {
  const station = findStationById[stationId];
  if (!station) {
    throw new Error(`Estación con ID ${stationId} no encontrada`);
  }

  const url = "https://www.metrovalencia.es/wp-admin/admin-ajax.php";
  const headers = {
    "User-Agent": "Mozilla/5.0",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.metrovalencia.es/ca/consulta-estaciones/",
  };
  const data = {
    action: "formularios_ajax",
    data: `action=info-estacion&id=${stationId}`,
  };

  try {
    const response = await axios.post(url, new URLSearchParams(data), { headers });

    if (response.status !== 200) {
      console.log("❌ Error al acceder a la API de Metrovalencia.");
      return [];
    }

    const html = response.data?.html;
    const $ = cheerio.load(html);  // Usando cheerio correctamente
    const results = [];

    // Extraemos los bloques de información de los trenes
    const bloques = $(".info-estacion");
    bloques.each((_, bloque) => {
      // Línea
      const lineaImg = $(bloque).find(".linea img");
      const linea = lineaImg.attr("alt") || "Desconocida";
      const icono = lineIcons[linea] || null;  // Asignar el icono correspondiente a la línea

      // Destino
      const destinoTag = $(bloque).find(".nombre-estacion");
      let destino = destinoTag.text().trim() || "Desconocido";

      // Limpiar el destino para eliminar saltos de línea y espacios extra
      destino = destino.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

      // Tiempo de espera (minutos)
      const minutosTag = $(bloque).find(".minutos");
      let minutos = minutosTag.text().trim() || "¿?";

      // Separar el destino del tiempo de espera
      const [destinoName, waitTime] = destino.split(" ");
      minutos = waitTime ? `${waitTime} min` : minutos;

      results.push({
        linea,
        destino: destinoName.trim(),  // Nombre del destino
        minutos,
        icono,  // Añadimos el icono correspondiente
      });
    });

    return results;
  } catch (error) {
    console.error("❌ Error en la consulta:", error.message);
    return [];
  }
}