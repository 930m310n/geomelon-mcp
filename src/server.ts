import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GeomelonClient } from 'geomelon';
import { z } from 'zod';
import { version } from '../package.json';

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

/** Text content plus structuredContent for clients that read it (Claude, ChatGPT, agent frameworks). */
function toolResult(data: unknown) {
  const structuredContent = Array.isArray(data) ? { results: data } : (data as Record<string, unknown>);
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent,
  };
}

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export function createServer(apiKey?: string): McpServer {
  const client = new GeomelonClient({ apiKey });

  const server = new McpServer({
    name: 'geomelon',
    version,
  });

  // ── Oneshot (always available, works without an API key) ────────────────────

  server.registerTool(
    'search_cities_autocomplete',
    {
      description:
        'Fast country-scoped, language-specific city name prefix search backed by pre-built static files. ' +
        'Works without a Geomelon API key. Returns up to 10 cities sorted by population, with the requested ' +
        'language name and an English fallback.',
      inputSchema: {
        country: z.string().length(2).describe('Lowercase ISO 3166-1 alpha-2 country code (e.g. "es", "jp")'),
        language: z.string().describe('BCP 47 language code to search against (e.g. "es", "ja")'),
        prefix: z.string().min(1).describe('City name prefix as typed by the user'),
      },
      annotations: READ_ONLY,
    },
    async ({ country, language, prefix }) => toolResult(await client.oneshot.search(country, language, prefix)),
  );

  if (!apiKey) {
    // Keyless demo mode: only the free oneshot autocomplete tool is available.
    return server;
  }

  // ── Cities ──────────────────────────────────────────────────────────────────

  server.registerTool(
    'search_cities',
    {
      description: 'Search cities by name, country, population range, and more. Returns matching cities with geographic and translation data.',
      inputSchema: {
        name: z.string().optional().describe('City name prefix to search for'),
        countryCode: z.string().optional().describe('ISO 3166-1 alpha-2 country code (e.g. "US", "DE")'),
        regionId: z.string().optional().describe('Filter by region UUID'),
        minPopulation: z.number().int().optional().describe('Minimum population'),
        maxPopulation: z.number().int().optional().describe('Maximum population'),
        sort: z
          .enum(['population_desc', 'population_asc', 'name_asc', 'name_desc'])
          .optional()
          .describe('Sort order'),
        preferredLanguages: z
          .string()
          .optional()
          .describe('Comma-separated BCP 47 language tags for name translations (e.g. "fr,en")'),
        limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20)'),
        offset: z.number().int().min(0).optional().describe('Pagination offset'),
      },
      annotations: READ_ONLY,
    },
    async (params) => toolResult(await client.cities.search(params)),
  );

  server.registerTool(
    'get_city',
    {
      description: 'Get full details for a single city by its UUID.',
      inputSchema: { id: z.string().describe('City UUID') },
      annotations: READ_ONLY,
    },
    async ({ id }) => toolResult(await client.cities.get(id)),
  );

  server.registerTool(
    'get_city_translations',
    {
      description: 'Get all available name translations for a city by its UUID.',
      inputSchema: { id: z.string().describe('City UUID') },
      annotations: READ_ONLY,
    },
    async ({ id }) => toolResult(await client.cities.translations(id)),
  );

  server.registerTool(
    'get_city_settlement_types',
    {
      description: 'Get settlement-type classifications for a city (e.g. city, town, village) by its UUID.',
      inputSchema: { id: z.string().describe('City UUID') },
      annotations: READ_ONLY,
    },
    async ({ id }) => toolResult(await client.cities.settlementTypes(id)),
  );

  server.registerTool(
    'cities_by_coordinates_closest',
    {
      description: 'Find cities nearest to given coordinates, ordered by distance.',
      inputSchema: {
        lat: z.number().describe('Latitude'),
        lon: z.number().describe('Longitude'),
        preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
      },
      annotations: READ_ONLY,
    },
    async (params) => toolResult(await client.cities.byCoordinatesClosest(params)),
  );

  server.registerTool(
    'cities_by_coordinates_largest',
    {
      description: 'Find the largest cities near given coordinates, ordered by population.',
      inputSchema: {
        lat: z.number().describe('Latitude'),
        lon: z.number().describe('Longitude'),
        preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
      },
      annotations: READ_ONLY,
    },
    async (params) => toolResult(await client.cities.byCoordinatesLargest(params)),
  );

  server.registerTool(
    'cities_distance',
    {
      description: 'Calculate the distance in kilometres between two cities.',
      inputSchema: {
        city1: z.string().describe('First city UUID'),
        city2: z.string().describe('Second city UUID'),
      },
      annotations: READ_ONLY,
    },
    async ({ city1, city2 }) => toolResult(await client.cities.distance(city1, city2)),
  );

  // ── Countries ───────────────────────────────────────────────────────────────

  server.registerTool(
    'list_countries',
    {
      description: 'List countries with optional filtering by name prefix or telephone code. Supports localized names via preferredLanguages.',
      inputSchema: {
        name: z.string().optional().describe('Country name prefix to search for (matches English name and translations in preferredLanguages)'),
        telephoneCode: z.string().optional().describe('Filter by dialing code (e.g. "+1", "+44")'),
        preferredLanguages: z
          .string()
          .optional()
          .describe('Comma-separated BCP 47 language tags; sets localizedName and drives translation name search (e.g. "fr,es,en")'),
        limit: z.number().int().min(1).max(500).optional().describe('Max results'),
        offset: z.number().int().min(0).optional().describe('Pagination offset'),
      },
      annotations: READ_ONLY,
    },
    async (params) => toolResult(await client.countries.list(params)),
  );

  server.registerTool(
    'get_country',
    {
      description: 'Get full details for a single country by its UUID, including translations and regions.',
      inputSchema: { id: z.string().describe('Country UUID') },
      annotations: READ_ONLY,
    },
    async ({ id }) => toolResult(await client.countries.get(id)),
  );

  server.registerTool(
    'get_country_translations',
    {
      description: 'Get name translations for a country by its UUID.',
      inputSchema: {
        id: z.string().describe('Country UUID'),
        preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags (e.g. "fr,es,en")'),
      },
      annotations: READ_ONLY,
    },
    async ({ id, preferredLanguages }) => toolResult(await client.countries.translations(id, { preferredLanguages })),
  );

  server.registerTool(
    'get_country_regions',
    {
      description: 'Get all administrative regions belonging to a country by its UUID.',
      inputSchema: { id: z.string().describe('Country UUID') },
      annotations: READ_ONLY,
    },
    async ({ id }) => toolResult(await client.countries.regions(id)),
  );

  // ── Regions ─────────────────────────────────────────────────────────────────

  server.registerTool(
    'list_regions',
    {
      description: 'List administrative regions, optionally filtered by country.',
      inputSchema: {
        countryId: z.string().optional().describe('Filter by country UUID'),
      },
      annotations: READ_ONLY,
    },
    async (params) => toolResult(await client.regions.list(params)),
  );

  server.registerTool(
    'get_region',
    {
      description: 'Get full details for a single region by its UUID.',
      inputSchema: { id: z.string().describe('Region UUID') },
      annotations: READ_ONLY,
    },
    async ({ id }) => toolResult(await client.regions.get(id)),
  );

  server.registerTool(
    'get_region_translations',
    {
      description: 'Get name translations for a region by its UUID.',
      inputSchema: {
        id: z.string().describe('Region UUID'),
        preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags (e.g. "fr,es,en")'),
      },
      annotations: READ_ONLY,
    },
    async ({ id, preferredLanguages }) => toolResult(await client.regions.translations(id, { preferredLanguages })),
  );

  // ── Compound tools ──────────────────────────────────────────────────────────

  server.registerTool(
    'find_cities_near_city',
    {
      description: 'Find cities near a given city. Resolves the city\'s coordinates and returns nearby cities ordered by distance or population.',
      inputSchema: {
        id: z.string().describe('UUID of the reference city'),
        mode: z
          .enum(['closest', 'largest'])
          .default('closest')
          .describe('"closest" orders by distance, "largest" orders by population'),
        preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
      },
      annotations: READ_ONLY,
    },
    async ({ id, mode, preferredLanguages }) => {
      const city = await client.cities.get(id);
      if (city.latitude == null || city.longitude == null) {
        return textResult(`City "${city.name}" has no coordinates on record.`);
      }
      const params = { lat: city.latitude, lon: city.longitude, preferredLanguages };
      const nearby = mode === 'largest'
        ? await client.cities.byCoordinatesLargest(params)
        : await client.cities.byCoordinatesClosest(params);
      return toolResult({ reference: { id: city.id, name: city.name }, nearby });
    },
  );

  server.registerTool(
    'city_context',
    {
      description: 'Get a city together with its full country and region details in one call.',
      inputSchema: {
        id: z.string().describe('City UUID'),
        preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
      },
      annotations: READ_ONLY,
    },
    async ({ id }) => {
      const city = await client.cities.get(id);
      const [country, region] = await Promise.all([
        client.countries.get(city.countryId),
        city.regionId ? client.regions.get(city.regionId) : Promise.resolve(null),
      ]);
      return toolResult({ city, country, region });
    },
  );

  server.registerTool(
    'country_overview',
    {
      description: 'Get a country\'s details, all its regions, and its most populous cities in one call. Accepts either a country UUID or a name prefix.',
      inputSchema: {
        id: z.string().optional().describe('Country UUID (takes priority over name)'),
        name: z.string().optional().describe('Country name prefix to resolve (e.g. "Germany")'),
        preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
        citiesLimit: z.number().int().min(1).max(50).default(10).describe('Number of top cities to include (default 10)'),
      },
      annotations: READ_ONLY,
    },
    async ({ id, name, preferredLanguages, citiesLimit }) => {
      let countryId = id;
      if (!countryId) {
        if (!name) {
          return textResult('Provide either id or name.');
        }
        const matches = await client.countries.list({ name, limit: 1, preferredLanguages });
        if (!matches.length) {
          return textResult(`No country found matching "${name}".`);
        }
        countryId = matches[0].id;
      }
      const country = await client.countries.get(countryId);
      const topCities = await client.cities.search({
        countryCode: country.isoCode,
        sort: 'population_desc',
        limit: citiesLimit,
        preferredLanguages,
      });
      return toolResult({ country, regions: country.regions, topCities });
    },
  );

  server.registerTool(
    'compare_cities',
    {
      description: 'Fetch full details for two cities and the distance between them in one call.',
      inputSchema: {
        city1: z.string().describe('First city UUID'),
        city2: z.string().describe('Second city UUID'),
        preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
      },
      annotations: READ_ONLY,
    },
    async ({ city1, city2 }) => {
      const [cityA, cityB, dist] = await Promise.all([
        client.cities.get(city1),
        client.cities.get(city2),
        client.cities.distance(city1, city2),
      ]);
      return toolResult({ city1: cityA, city2: cityB, distanceKm: dist.distanceKm });
    },
  );

  server.registerTool(
    'search_cities_in_country',
    {
      description: 'Search cities using a country name instead of an ISO code. Resolves the country first, then searches cities within it.',
      inputSchema: {
        countryName: z.string().describe('Country name prefix (e.g. "France", "United States")'),
        name: z.string().optional().describe('City name prefix to filter by'),
        minPopulation: z.number().int().optional().describe('Minimum population'),
        maxPopulation: z.number().int().optional().describe('Maximum population'),
        sort: z
          .enum(['population_desc', 'population_asc', 'name_asc', 'name_desc'])
          .optional()
          .describe('Sort order'),
        preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
        limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20)'),
        offset: z.number().int().min(0).optional().describe('Pagination offset'),
      },
      annotations: READ_ONLY,
    },
    async ({ countryName, ...cityParams }) => {
      const matches = await client.countries.list({ name: countryName, limit: 1 });
      if (!matches.length) {
        return textResult(`No country found matching "${countryName}".`);
      }
      const country = matches[0];
      const cities = await client.cities.search({ ...cityParams, countryCode: country.isoCode });
      return toolResult({ country: { id: country.id, name: country.name, isoCode: country.isoCode }, cities });
    },
  );

  // ── Languages ────────────────────────────────────────────────────────────────

  server.registerTool(
    'list_languages',
    {
      description: 'List languages available in the Geomelon database.',
      inputSchema: {
        limit: z.number().int().min(1).max(500).optional().describe('Max results'),
        offset: z.number().int().min(0).optional().describe('Pagination offset'),
      },
      annotations: READ_ONLY,
    },
    async (params) => toolResult(await client.languages.list(params)),
  );

  server.registerTool(
    'get_language',
    {
      description: 'Get details for a single language by its UUID.',
      inputSchema: { id: z.string().describe('Language UUID') },
      annotations: READ_ONLY,
    },
    async ({ id }) => toolResult(await client.languages.get(id)),
  );

  return server;
}
