import axios from 'axios';
const tools = [
    {
        name: 'fetch',
        description: 'Fetch content from a URL',
        inputSchema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'The URL to fetch',
                },
                method: {
                    type: 'string',
                    description: 'HTTP method (GET, POST, etc.)',
                    default: 'GET',
                },
                headers: {
                    type: 'object',
                    description: 'HTTP headers',
                },
                body: {
                    type: 'string',
                    description: 'Request body',
                },
            },
            required: ['url'],
        },
    },
];
async function handleInitialize() {
    return {
        protocolVersion: '2024-11-05',
        capabilities: {
            tools: {},
        },
        serverInfo: {
            name: 'fetch-mcp-server',
            version: '1.0.0',
        },
    };
}
async function handleListTools() {
    return { tools };
}
async function handleCallTool(name, args) {
    if (name !== 'fetch') {
        throw new Error(`Unknown tool: ${name}`);
    }
    const url = args.url;
    const method = args.method || 'GET';
    const headers = args.headers || {};
    const body = args.body;
    try {
        const response = await axios({
            url,
            method,
            headers,
            data: body,
            timeout: 30000,
            maxRedirects: 5,
        });
        return [
            {
                type: 'text',
                text: JSON.stringify({
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data,
                }, null, 2),
            },
        ];
    }
    catch (error) {
        const axiosError = error;
        throw new Error(`Fetch failed: ${axiosError.message}${axiosError.response ? ` (${axiosError.response.status})` : ''}`);
    }
}
async function processRequest(request) {
    try {
        let result;
        switch (request.method) {
            case 'initialize':
                result = await handleInitialize();
                break;
            case 'tools/list':
                result = await handleListTools();
                break;
            case 'tools/call':
                result = {
                    content: await handleCallTool(request.params?.name || '', request.params?.arguments || {}),
                };
                break;
            default:
                throw new Error(`Unknown method: ${request.method}`);
        }
        return {
            jsonrpc: '2.0',
            id: request.id,
            result,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
                code: -32603,
                message: errorMessage,
            },
        };
    }
}
let buffer = '';
process.stdin.on('data', async (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
        if (!line.trim())
            continue;
        try {
            const request = JSON.parse(line);
            const response = await processRequest(request);
            process.stdout.write(JSON.stringify(response) + '\n');
        }
        catch (error) {
            process.stderr.write(`Error: ${error}\n`);
        }
    }
});
process.stdin.on('end', () => {
    process.exit(0);
});
//# sourceMappingURL=index.js.map