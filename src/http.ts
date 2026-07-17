import 'dotenv/config';
import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

async function main() {
  const apiKey = process.env.GEOMELON_API_KEY;
  if (!apiKey) {
    console.error(
      'GEOMELON_API_KEY not set — running in keyless demo mode: only search_cities_autocomplete is available. ' +
        'Get a key at https://rapidapi.com/hom3chuk/api/geomelon for full access.',
    );
  }

  const PORT = parseInt(process.env.PORT ?? '3000', 10);

  const httpServer = http.createServer(async (req, res) => {
    if (req.url !== '/mcp') {
      res.writeHead(404).end('Not found');
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks).toString();

    const server = createServer(apiKey);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
  });

  httpServer.listen(PORT, () => {
    console.error(`Geomelon MCP HTTP server listening on port ${PORT}`);
  });
}

main();
