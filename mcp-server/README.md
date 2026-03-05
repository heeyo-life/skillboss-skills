# SkillBoss MCP Server

Access 100+ AI models and services through the Model Context Protocol (MCP).

## What is SkillBoss MCP Server?

SkillBoss MCP Server provides a unified interface to interact with over 100 AI services including:

- **LLMs**: Claude, GPT-4, Gemini, DeepSeek, and more
- **Image Generation**: DALL-E, Midjourney, Stable Diffusion, Flux
- **Video Generation**: Runway, Luma, Kling AI
- **Audio/Music**: ElevenLabs, Suno, Google Lyria
- **And many more AI capabilities**

All through a single API key and MCP-compatible interface.

## Installation

### For Claude Desktop / MCP Clients

Add to your MCP settings configuration:

```json
{
  "mcpServers": {
    "skillboss": {
      "command": "npx",
      "args": ["-y", "@skillboss/mcp-server"],
      "env": {
        "SKILLBOSS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Using Claude Code CLI

```bash
claude mcp add skillboss -- npx -y @skillboss/mcp-server
```

## Getting Your API Key

1. Visit [skillboss.co](https://skillboss.co)
2. Sign up or log in
3. Go to your [dashboard](https://skillboss.co/dashboard) to get your API key

## Usage

Once installed, the MCP server provides tools to your AI assistant for:

- Generating images, videos, audio, and music
- Accessing various LLM models
- Text-to-speech and speech-to-text
- And more AI capabilities

Simply ask your AI assistant to use these capabilities naturally in conversation.

## Features

- **100+ AI Services** - One API key for dozens of AI providers
- **MCP Native** - Built specifically for the Model Context Protocol
- **Unified Interface** - Consistent API across all services
- **Simple Setup** - Install with npx, configure with one API key
- **Actively Maintained** - Regular updates with new models and features

## Configuration

### Environment Variables

- `SKILLBOSS_API_KEY` (required) - Your SkillBoss API key from [skillboss.co/dashboard](https://skillboss.co/dashboard)

### MCP Server Settings

The server runs using stdio transport and communicates via JSON-RPC with your MCP client.

## Development

### Building from Source

```bash
git clone https://github.com/heeyo-life/skillboss-skills.git
cd skillboss-skills/mcp-server
npm install
npm run build
```

### Running Locally

```bash
npm run dev
```

### Testing the Server

```bash
node dist/index.js
```

The server will start and communicate via stdin/stdout using the MCP protocol.

## Release Process

See [RELEASE.md](./RELEASE.md) for detailed instructions on publishing new versions to npm and the MCP Registry.

## Documentation

- [SkillBoss Documentation](https://skillboss.co/docs)
- [MCP Server Integration Guide](https://skillboss.co/docs/integrations/mcp-server)
- [API Reference](https://skillboss.co/docs/api)
- [Model Context Protocol Spec](https://modelcontextprotocol.io)

## Repository Structure

```
mcp-server/
├── src/           # TypeScript source code
├── dist/          # Compiled JavaScript (generated)
├── package.json   # Package configuration
├── server.json    # MCP Registry configuration
├── tsconfig.json  # TypeScript configuration
├── README.md      # This file
└── RELEASE.md     # Release process documentation
```

## Support

- **Documentation**: [skillboss.co/docs](https://skillboss.co/docs)
- **Email**: support@skillboss.co
- **Discord**: [Join our community](https://discord.gg/U9eM6Vn6g7)
- **Issues**: [GitHub Issues](https://github.com/heeyo-life/skillboss-skills/issues)

## License

MIT License - See [LICENSE](../LICENSE) file for details

## Links

- [npm Package](https://www.npmjs.com/package/@skillboss/mcp-server)
- [GitHub Repository](https://github.com/heeyo-life/skillboss-skills)
- [SkillBoss Website](https://skillboss.co)
- [Model Context Protocol](https://modelcontextprotocol.io)

---

Made with care by the [SkillBoss](https://skillboss.co) team
