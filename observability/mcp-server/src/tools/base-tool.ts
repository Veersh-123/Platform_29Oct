import { Tool } from '@modelcontextprotocol/sdk/types.js';

export abstract class BaseTool {
  protected tools: Tool[] = [];

  abstract getTools(): Tool[];
  abstract execute(toolName: string, args: Record<string, unknown>): Promise<unknown>;
}
