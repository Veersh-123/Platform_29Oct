import { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare abstract class BaseTool {
    protected tools: Tool[];
    abstract getTools(): Tool[];
    abstract execute(toolName: string, args: Record<string, unknown>): Promise<unknown>;
}
//# sourceMappingURL=base-tool.d.ts.map