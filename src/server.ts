import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GeomelonClient } from 'geomelon';
import { z } from 'zod';
import { version } from '../package.json';

export function createServer(apiKey: string): McpServer {
  const client = new GeomelonClient({ apiKey });

  const server = new McpServer({
    name: 'geomelon',
    version,
  });

  // ── Cities ──────────────────────────────────────────────────────────────────

  server.tool(
    'search_cities',
    'Search cities by name, country, population range, and more. Returns matching cities with geographic and translation data.',
    {
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
    async (params) => {
      const result = await client.cities.search(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_city',
    'Get full details for a single city by its UUID.',
    { id: z.string().describe('City UUID') },
    async ({ id }) => {
      const result = await client.cities.get(id);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_city_translations',
    'Get all available name translations for a city by its UUID.',
    { id: z.string().describe('City UUID') },
    async ({ id }) => {
      const result = await client.cities.translations(id);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_city_settlement_types',
    'Get settlement-type classifications for a city (e.g. city, town, village) by its UUID.',
    { id: z.string().describe('City UUID') },
    async ({ id }) => {
      const result = await client.cities.settlementTypes(id);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'cities_by_coordinates_closest',
    'Find cities nearest to given coordinates, ordered by distance.',
    {
      lat: z.number().describe('Latitude'),
      lon: z.number().describe('Longitude'),
      preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
    },
    async (params) => {
      const result = await client.cities.byCoordinatesClosest(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'cities_by_coordinates_largest',
    'Find the largest cities near given coordinates, ordered by population.',
    {
      lat: z.number().describe('Latitude'),
      lon: z.number().describe('Longitude'),
      preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
    },
    async (params) => {
      const result = await client.cities.byCoordinatesLargest(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'cities_distance',
    'Calculate the distance in kilometres between two cities.',
    {
      city1: z.string().describe('First city UUID'),
      city2: z.string().describe('Second city UUID'),
    },
    async ({ city1, city2 }) => {
      const result = await client.cities.distance(city1, city2);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Countries ───────────────────────────────────────────────────────────────

  server.tool(
    'list_countries',
    'List countries with optional filtering by name prefix or telephone code. Supports localized names via preferredLanguages.',
    {
      name: z.string().optional().describe('Country name prefix to search for (matches English name and translations in preferredLanguages)'),
      telephoneCode: z.string().optional().describe('Filter by dialing code (e.g. "+1", "+44")'),
      preferredLanguages: z
        .string()
        .optional()
        .describe('Comma-separated BCP 47 language tags; sets localizedName and drives translation name search (e.g. "fr,es,en")'),
      limit: z.number().int().min(1).max(500).optional().describe('Max results'),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
    },
    async (params) => {
      const result = await client.countries.list(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_country',
    'Get full details for a single country by its UUID, including translations and regions.',
    { id: z.string().describe('Country UUID') },
    async ({ id }) => {
      const result = await client.countries.get(id);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_country_translations',
    'Get name translations for a country by its UUID.',
    {
      id: z.string().describe('Country UUID'),
      preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags (e.g. "fr,es,en")'),
    },
    async ({ id, preferredLanguages }) => {
      const result = await client.countries.translations(id, { preferredLanguages });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_country_regions',
    'Get all administrative regions belonging to a country by its UUID.',
    { id: z.string().describe('Country UUID') },
    async ({ id }) => {
      const result = await client.countries.regions(id);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Regions ─────────────────────────────────────────────────────────────────

  server.tool(
    'list_regions',
    'List administrative regions, optionally filtered by country.',
    {
      countryId: z.string().optional().describe('Filter by country UUID'),
    },
    async (params) => {
      const result = await client.regions.list(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_region',
    'Get full details for a single region by its UUID.',
    { id: z.string().describe('Region UUID') },
    async ({ id }) => {
      const result = await client.regions.get(id);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_region_translations',
    'Get name translations for a region by its UUID.',
    {
      id: z.string().describe('Region UUID'),
      preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags (e.g. "fr,es,en")'),
    },
    async ({ id, preferredLanguages }) => {
      const result = await client.regions.translations(id, { preferredLanguages });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Compound tools ──────────────────────────────────────────────────────────

  server.tool(
    'find_cities_near_city',
    'Find cities near a given city. Resolves the city\'s coordinates and returns nearby cities ordered by distance or population.',
    {
      id: z.string().describe('UUID of the reference city'),
      mode: z
        .enum(['closest', 'largest'])
        .default('closest')
        .describe('"closest" orders by distance, "largest" orders by population'),
      preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
    },
    async ({ id, mode, preferredLanguages }) => {
      const city = await client.cities.get(id);
      if (city.latitude == null || city.longitude == null) {
        return { content: [{ type: 'text', text: `City "${city.name}" has no coordinates on record.` }] };
      }
      const params = { lat: city.latitude, lon: city.longitude, preferredLanguages };
      const nearby = mode === 'largest'
        ? await client.cities.byCoordinatesLargest(params)
        : await client.cities.byCoordinatesClosest(params);
      const result = { reference: { id: city.id, name: city.name }, nearby };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'city_context',
    'Get a city together with its full country and region details in one call.',
    {
      id: z.string().describe('City UUID'),
      preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
    },
    async ({ id }) => {
      const city = await client.cities.get(id);
      const [country, region] = await Promise.all([
        client.countries.get(city.countryId),
        city.regionId ? client.regions.get(city.regionId) : Promise.resolve(null),
      ]);
      const result = { city, country, region };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'country_overview',
    'Get a country\'s details, all its regions, and its most populous cities in one call. Accepts either a country UUID or a name prefix.',
    {
      id: z.string().optional().describe('Country UUID (takes priority over name)'),
      name: z.string().optional().describe('Country name prefix to resolve (e.g. "Germany")'),
      preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
      citiesLimit: z.number().int().min(1).max(50).default(10).describe('Number of top cities to include (default 10)'),
    },
    async ({ id, name, preferredLanguages, citiesLimit }) => {
      let countryId = id;
      if (!countryId) {
        if (!name) {
          return { content: [{ type: 'text', text: 'Provide either id or name.' }] };
        }
        const matches = await client.countries.list({ name, limit: 1, preferredLanguages });
        if (!matches.length) {
          return { content: [{ type: 'text', text: `No country found matching "${name}".` }] };
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
      const result = { country, regions: country.regions, topCities };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'compare_cities',
    'Fetch full details for two cities and the distance between them in one call.',
    {
      city1: z.string().describe('First city UUID'),
      city2: z.string().describe('Second city UUID'),
      preferredLanguages: z.string().optional().describe('Comma-separated BCP 47 language tags'),
    },
    async ({ city1, city2 }) => {
      const [cityA, cityB, dist] = await Promise.all([
        client.cities.get(city1),
        client.cities.get(city2),
        client.cities.distance(city1, city2),
      ]);
      const result = { city1: cityA, city2: cityB, distanceKm: dist.distanceKm };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'search_cities_in_country',
    'Search cities using a country name instead of an ISO code. Resolves the country first, then searches cities within it.',
    {
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
    async ({ countryName, ...cityParams }) => {
      const matches = await client.countries.list({ name: countryName, limit: 1 });
      if (!matches.length) {
        return { content: [{ type: 'text', text: `No country found matching "${countryName}".` }] };
      }
      const country = matches[0];
      const cities = await client.cities.search({ ...cityParams, countryCode: country.isoCode });
      const result = { country: { id: country.id, name: country.name, isoCode: country.isoCode }, cities };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── Languages ────────────────────────────────────────────────────────────────

  server.tool(
    'list_languages',
    'List languages available in the Geomelon database.',
    {
      limit: z.number().int().min(1).max(500).optional().describe('Max results'),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
    },
    async (params) => {
      const result = await client.languages.list(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_language',
    'Get details for a single language by its UUID.',
    { id: z.string().describe('Language UUID') },
    async ({ id }) => {
      const result = await client.languages.get(id);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}
