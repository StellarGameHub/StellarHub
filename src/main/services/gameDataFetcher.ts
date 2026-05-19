// src/main/services/wikidataService.ts
import axios, { AxiosInstance } from 'axios';

// Obtén el nombre de la app y la versión de package.json
const appName = 'StellarHub';
const appVersion = '0.1.1';
const userEmail = 'joeldelgadogopar2@gmail.com'; // Tu correo de contacto


// Configuración del cliente con User-Agent personalizado
const wikidataApiClient = axios.create({
    baseURL: 'https://www.wikidata.org/w/api.php',
    headers: {
        'User-Agent': 'StellarHub/' + appVersion + ' (https://github.com/JoelD333/StellarHub; joeldelgadogopar2@gmail.com) axios/1.16.0'
    }
});

// Cliente para el endpoint SPARQL
const sparqlClient = axios.create({
    baseURL: 'https://query.wikidata.org/sparql',
    headers: {
        'User-Agent': 'StellarHub/' + appVersion + ' (https://github.com/JoelD333/StellarHub; joeldelgadogopar2@gmail.com) axios/1.16.0',
        'Accept': 'application/sparql-results+json'
    }
});

export interface WikidataGameData {
    title: string;           // etiqueta (label) del juego
    description?: string;    // descripción corta
    developer?: string;      // nombre del desarrollador
    publisher?: string;      // nombre del editor
    releaseDate?: string;    // fecha ISO (YYYY-MM-DD)
    genres?: string[];       // lista de géneros
    platforms?: string[];    // lista de plataformas    
    wikidataId: string;      // ID Q
}

/**
 * Busca el ID de Wikidata (Q...) a partir del título de un juego.
 */
async function findWikidataIdByTitle(title: string): Promise<string | null> {
    try {
        const response = await wikidataApiClient.get('', {
            params: {
                action: 'wbsearchentities',
                search: title,
                language: 'en',
                format: 'json',
                type: 'item',
                limit: 1
            }
        });
        const results = response.data.search;
        if (results && results.length > 0) {
            return results[0].id; // ej. "Q738190"
        }
        return null;
    } catch (error) {
        console.error('[Wikidata] Error searching entity:', error);
        return null;
    }
}

/**
 * Consulta SPARQL para obtener metadatos de un juego dado su ID Q.
 */
async function fetchGameMetadata(wikidataId: string): Promise<Partial<WikidataGameData>> {
    const query = `
    SELECT ?itemLabel ?description ?developerLabel ?publisherLabel ?releaseDate ?genreLabel ?platformLabel ?image WHERE {
      VALUES ?item { wd:${wikidataId} }
      OPTIONAL { ?item rdfs:label ?itemLabel. FILTER(LANG(?itemLabel) = "en") }
      OPTIONAL { ?item schema:description ?description. FILTER(LANG(?description) = "en") }
      OPTIONAL { ?item wdt:P178 ?developer. ?developer rdfs:label ?developerLabel. FILTER(LANG(?developerLabel) = "en") }
      OPTIONAL { ?item wdt:P123 ?publisher. ?publisher rdfs:label ?publisherLabel. FILTER(LANG(?publisherLabel) = "en") }
      OPTIONAL { ?item wdt:P577 ?releaseDate }
      OPTIONAL { ?item wdt:P136 ?genre. ?genre rdfs:label ?genreLabel. FILTER(LANG(?genreLabel) = "en") }
      OPTIONAL { ?item wdt:P400 ?platform. ?platform rdfs:label ?platformLabel. FILTER(LANG(?platformLabel) = "en") }
      OPTIONAL { ?item wdt:P18 ?image }
    }
    LIMIT 50
  `;

    try {
        const response = await sparqlClient.get('', {
            params: { format: 'json', query }
        });

        const bindings = response.data.results?.bindings || [];
        if (bindings.length === 0) return {};

        // Consolidar múltiples filas (para géneros y plataformas)
        const result: any = {};
        for (const binding of bindings) {
            if (binding.itemLabel && !result.title) result.title = binding.itemLabel.value;
            if (binding.description && !result.description) result.description = binding.description.value;
            if (binding.developerLabel && !result.developer) result.developer = binding.developerLabel.value;
            if (binding.publisherLabel && !result.publisher) result.publisher = binding.publisherLabel.value;
            if (binding.releaseDate && !result.releaseDate) result.releaseDate = binding.releaseDate.value;
            if (binding.genreLabel) {
                result.genres = result.genres || [];
                if (!result.genres.includes(binding.genreLabel.value)) result.genres.push(binding.genreLabel.value);
            }
            if (binding.platformLabel) {
                result.platforms = result.platforms || [];
                if (!result.platforms.includes(binding.platformLabel.value)) result.platforms.push(binding.platformLabel.value);
            }

        }
        return {
            title: result.title,
            description: result.description,
            developer: result.developer,
            publisher: result.publisher,
            releaseDate: result.releaseDate,
            genres: result.genres,
            platforms: result.platforms,
        };
    } catch (error) {
        console.error('[Wikidata] SPARQL query error:', error);
        return {};
    }
}

/**
 * Función pública: obtiene todos los datos de un juego buscando por título.
 */
export async function fetchGameDataFromWikidata(searchTerm: string): Promise<WikidataGameData | null> {
    const wikidataId = await findWikidataIdByTitle(searchTerm);
    if (!wikidataId) {
        console.log(`[Wikidata] No se encontró ID para "${searchTerm}"`);
        return null;
    }
    const metadata = await fetchGameMetadata(wikidataId);
    if (!metadata.title) return null;
    return {
        title: metadata.title || searchTerm,
        description: metadata.description,
        developer: metadata.developer,
        publisher: metadata.publisher,
        releaseDate: metadata.releaseDate,
        genres: metadata.genres,
        platforms: metadata.platforms,
        wikidataId,
    };
}