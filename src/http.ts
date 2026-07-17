import 'dotenv/config';
import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

// Public remote MCP clients (browser-based playgrounds, ChatGPT/Claude web
// connectors) call this over CORS, unlike the local stdio/HTTP setup this
// transport originally targeted.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

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
    for (const [key, value] of Object.entries(CORS_HEADERS)) res.setHeader(key, value);

    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          name: 'geomelon-mcp',
          status: 'ok',
          mode: apiKey ? 'full' : 'keyless-demo',
          mcpEndpoint: '/mcp',
          docs: 'https://github.com/930m310n/geomelon-mcp',
        }),
      );
      return;
    }

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
