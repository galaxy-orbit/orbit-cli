# MCP & Skills for AI Agents

Orbit ships a built-in **MCP server** + **skill file** so AI coding agents
(Claude, Cursor, Codex...) can work directly with Orbit apps.

## Connect (hosted URL)

Add to your agent's MCP config:

```json
{
  "mcpServers": {
    "orbit": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `orbit_knowledge_topics` | List framework knowledge topics |
| `orbit_knowledge_read` | Read one topic in detail |
| `orbit_scaffold_module` | Generate a full feature module |
| `orbit_scaffold_graphql` | Generate GraphQL resolver + types |
| `orbit_security_review` | Audit security baseline |

## Skills (portable)

Copy `skills/orbit-framework/SKILL.md` into your agent's skills directory —
or use the Smithery-hosted version: `galaxy-stack/orbit-framework`.
