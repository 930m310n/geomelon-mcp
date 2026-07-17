# geomelon-mcp

MCP server for the [Geomelon](https://rapidapi.com/hom3chuk/api/geomelon) geographic API. Exposes cities, countries, regions, and languages as tools any MCP-compatible AI client can call.

Looking for other ways to integrate? See all official libraries at [geomelon.dev/libraries](https://geomelon.dev/libraries/).

Two transports are included:

| Binary | Transport | Use case |
|---|---|---|
| `geomelon-mcp` | stdio | Claude Desktop, Cursor, Cline, Continue |
| `geomelon-mcp-http` | HTTP (Streamable) | Claude Code, remote / hosted server |

## Requirements

- Node.js 18+
- A [RapidAPI](https://rapidapi.com/hom3chuk/api/geomelon) key with the Geomelon API subscribed — optional, see [keyless demo mode](#keyless-demo-mode) below

---

## Keyless demo mode

No `GEOMELON_API_KEY`? Run the server anyway — it starts up with just the `search_cities_autocomplete` tool, backed by the free [oneshot host](https://geomelon.dev/free-city-autocomplete-api/), no signup required. Every other tool needs a key. This is the fastest way to try the server before subscribing on RapidAPI.

---

## Claude Code (HTTP)

Create a `.env` file in the directory you'll run the server from:

```bash
cp .env.example .env
# then edit .env and set GEOMELON_API_KEY
```

Start the server (dotenv loads `.env` automatically):

```bash
npx geomelon-mcp-http
```

Register it with Claude Code:

```bash
claude mcp add --transport http geomelon http://localhost:3000/mcp
```

Verify it's connected:

```bash
claude mcp list
```

The server must be running whenever you use Claude Code. To use a different port set `PORT=your_port` and update the URL in the `claude mcp add` command accordingly.

---

## Claude Desktop (stdio)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "geomelon": {
      "command": "npx",
      "args": ["-y", "geomelon-mcp"],
      "env": {
        "GEOMELON_API_KEY": "your_rapidapi_key_here"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

---

## Cursor / Windsurf / Cline (stdio)

Add to your editor's MCP config:

```json
{
  "geomelon": {
    "command": "npx",
    "args": ["-y", "geomelon-mcp"],
    "env": {
      "GEOMELON_API_KEY": "your_rapidapi_key_here"
    }
  }
}
```

---

## Remote / hosted HTTP server

Create a `.env` file on your server:

```bash
cp .env.example .env
# set GEOMELON_API_KEY and PORT in .env
```

Start the server:

```bash
npx geomelon-mcp-http
```

Then register with any MCP client using `http://your-host:3000/mcp` as the URL.

The HTTP transport is stateless — each request is independent, no session management needed.

---

## Available tools

### Cities

| Tool | Description |
|---|---|
| `search_cities` | Search by name, country code, region, population range, sort order |
| `get_city` | Full details for a city by UUID |
| `get_city_translations` | All name translations for a city by UUID |
| `get_city_settlement_types` | Settlement-type classifications for a city by UUID |
| `cities_by_coordinates_closest` | Cities nearest to a lat/lon, ordered by distance |
| `cities_by_coordinates_largest` | Largest cities near a lat/lon, ordered by population |
| `cities_distance` | Distance in km between two cities |

### Countries

| Tool | Description |
|---|---|
| `list_countries` | List countries, filter by name prefix or telephone dialing code |
| `get_country` | Full details for a country by UUID (includes translations and regions) |
| `get_country_translations` | Name translations for a country by UUID |
| `get_country_regions` | All administrative regions for a country by UUID |

### Regions

| Tool | Description |
|---|---|
| `list_regions` | List regions, filter by country UUID |
| `get_region` | Full details for a region by UUID |
| `get_region_translations` | Name translations for a region by UUID |

### Languages

| Tool | Description |
|---|---|
| `list_languages` | List all languages in the database |
| `get_language` | Details for a language by UUID |

### Oneshot prefix search (free, no API key)

| Tool | Description |
|---|---|
| `search_cities_autocomplete` | Country-scoped, language-specific city name prefix search backed by pre-built static files. **The only tool available in [keyless demo mode](#keyless-demo-mode).** Works in keyed mode too — it's the fastest search path. |

See [geomelon.dev/free-city-autocomplete-api](https://geomelon.dev/free-city-autocomplete-api/) for supported country/language pairs and the underlying HTTP endpoint.

---

### Compound tools

These tools chain multiple API calls internally to save round-trips.

| Tool | Description |
|---|---|
| `find_cities_near_city` | Given a city UUID, find nearby cities ordered by distance or population |
| `city_context` | Fetch a city together with its full country and region details in one call |
| `country_overview` | Fetch a country (by UUID or name), its regions, and top cities by population |
| `compare_cities` | Fetch two cities and the distance between them in one call |
| `search_cities_in_country` | Search cities using a country name instead of an ISO code |
