import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const apiKey = process.env.GEOMELON_API_KEY;
  if (!apiKey) {
    console.error(
      'GEOMELON_API_KEY not set — running in keyless demo mode: only search_cities_autocomplete is available. ' +
        'Get a key at https://rapidapi.com/hom3chuk/api/geomelon for full access.',
    );
  }

  const server = createServer(apiKey);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
