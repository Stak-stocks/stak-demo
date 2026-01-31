# Perplexity AI Search - MCP Client Module

## Overview

This module provides a TypeScript interface to the Perplexity AI Search MCP tool. It enables you to perform AI-powered searches using Perplexity's models (sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro) with customizable completion parameters.

## Installation/Import

```typescript
import { request as requestPerplexitySearch } from '@/sdk/mcp-clients/6875e6198345ff1a8579cd8a/PERPLEXITYAI_PERPLEXITY_AI_SEARCH';
```

## Function Signature

```typescript
async function request(params: PerplexitySearchParams): Promise<PerplexitySearchData>
```

## Parameters

### Required Parameters

- **`userContent`** (string): The user's question or input for the search query.
  - Example: `"How many stars are there in our galaxy?"`

### Optional Parameters

- **`model`** (string): Model to use for generation. Options: `"sonar"` (default), `"sonar-pro"`, `"sonar-reasoning"`, `"sonar-reasoning-pro"`
- **`systemContent`** (string): System instructions to guide model behavior. Default: `"You are a helpful assistant that provides accurate and informative responses."`
- **`temperature`** (number | null): Controls randomness (0 = deterministic, <2 = more random). Range: 0 to <2
- **`max_tokens`** (number | null): Maximum tokens to generate. Example: 100, 150, 200
- **`top_p`** (number | null): Nucleus sampling threshold. Range: 0 to 1
- **`top_k`** (number | null): Limits high-probability tokens. Range: 0 to 2048
- **`frequency_penalty`** (number | null): Penalty for token frequency (>0). Mutually exclusive with `presence_penalty`
- **`presence_penalty`** (number | null): Penalty for token presence. Range: -2 to 2. Mutually exclusive with `frequency_penalty`
- **`return_citations`** (boolean | null): Include citations in response (closed beta feature)
- **`return_images`** (boolean | null): Include images in response (closed beta feature)
- **`stream`** (boolean | null): Stream response incrementally using server-sent events

## Return Value

Returns a `Promise<PerplexitySearchData>` containing:

```typescript
{
  id: string;                              // Unique completion identifier
  model: string;                           // Model used
  created: number;                         // Unix timestamp
  object: string;                          // Always "chat.completion"
  choices: Array<{                         // Generated completions
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {                                 // Token usage stats
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    citation_tokens?: number | null;
    reasoning_tokens?: number | null;
    num_search_queries?: number | null;
    search_context_size?: string | null;
  };
  search_results?: Array<{                 // Optional search results
    title: string;
    url?: string | null;
    source?: string | null;
    date?: string | null;
  }> | null;
  videos?: Array<{                         // Optional related videos
    url: string;
    thumbnail_url: string;
    thumbnail_width: number;
    thumbnail_height: number;
    duration: number;
  }> | null;
}
```

## Usage Examples

### Basic Search Query

```typescript
import { request as requestPerplexitySearch } from '@/sdk/mcp-clients/6875e6198345ff1a8579cd8a/PERPLEXITYAI_PERPLEXITY_AI_SEARCH';

async function basicSearch() {
  try {
    const result = await requestPerplexitySearch({
      userContent: "What are the latest developments in quantum computing?"
    });
    
    console.log('Response:', result.choices[0].message.content);
    console.log('Tokens used:', result.usage.total_tokens);
    
    if (result.search_results) {
      console.log('Sources:', result.search_results.map(r => r.url));
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}
```

### Advanced Search with Custom Parameters

```typescript
import { request as requestPerplexitySearch } from '@/sdk/mcp-clients/6875e6198345ff1a8579cd8a/PERPLEXITYAI_PERPLEXITY_AI_SEARCH';

async function advancedSearch() {
  try {
    const result = await requestPerplexitySearch({
      userContent: "Explain the theory of relativity in simple terms",
      model: "sonar-pro",
      systemContent: "Be precise and concise. Use simple language suitable for beginners.",
      temperature: 0.7,
      max_tokens: 500,
      top_p: 0.9,
      return_citations: true
    });
    
    console.log('Answer:', result.choices[0].message.content);
    console.log('Model used:', result.model);
    console.log('Finish reason:', result.choices[0].finish_reason);
    
    if (result.search_results) {
      console.log('Citations:');
      result.search_results.forEach((source, idx) => {
        console.log(`  [${idx + 1}] ${source.title} - ${source.url}`);
      });
    }
  } catch (error) {
    console.error('Advanced search failed:', error);
  }
}
```

### Using Reasoning Models

```typescript
import { request as requestPerplexitySearch } from '@/sdk/mcp-clients/6875e6198345ff1a8579cd8a/PERPLEXITYAI_PERPLEXITY_AI_SEARCH';

async function reasoningSearch() {
  try {
    const result = await requestPerplexitySearch({
      userContent: "What are the ethical implications of artificial general intelligence?",
      model: "sonar-reasoning-pro",
      temperature: 0.5,
      max_tokens: 1000
    });
    
    console.log('Reasoning response:', result.choices[0].message.content);
    
    if (result.usage.reasoning_tokens) {
      console.log('Reasoning tokens used:', result.usage.reasoning_tokens);
    }
  } catch (error) {
    console.error('Reasoning search failed:', error);
  }
}
```

## Error Handling

The module throws errors in the following cases:

1. **Missing Required Parameters**: If `userContent` is not provided
2. **Invalid Parameter Values**: 
   - `frequency_penalty` must be > 0
   - `presence_penalty` must be between -2 and 2
   - `temperature` must be between 0 and <2
   - `top_k` must be between 0 and 2048
   - `top_p` must be between 0 and 1
3. **MCP Response Errors**: Invalid response format or parsing failures
4. **Tool Execution Errors**: When the MCP tool returns `successful: false`

### Error Handling Example

```typescript
import { request as requestPerplexitySearch } from '@/sdk/mcp-clients/6875e6198345ff1a8579cd8a/PERPLEXITYAI_PERPLEXITY_AI_SEARCH';

async function safeSearch() {
  try {
    const result = await requestPerplexitySearch({
      userContent: "What is the meaning of life?",
      temperature: 0.8
    });
    
    return result.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Missing required parameter')) {
        console.error('Configuration error:', error.message);
      } else if (error.message.includes('Invalid MCP response')) {
        console.error('Communication error:', error.message);
      } else {
        console.error('Unexpected error:', error.message);
      }
    }
    throw error;
  }
}
```

## Notes

- **Model Selection**: Choose based on your needs:
  - `sonar`: Fast, general-purpose searches
  - `sonar-pro`: Enhanced quality and depth
  - `sonar-reasoning`: Logical reasoning capabilities
  - `sonar-reasoning-pro`: Advanced reasoning with enhanced quality
- **Citations & Images**: These features are in closed beta and may not be available for all users
- **Token Limits**: Ensure `max_tokens` + prompt tokens don't exceed the model's context window
- **Mutually Exclusive Parameters**: Don't use both `frequency_penalty` and `presence_penalty` together
- **Streaming**: When `stream: true`, the response format may differ (server-sent events)

## Additional Resources

- [Perplexity AI Model Cards](https://docs.perplexity.ai/guides/model-cards)
- [Perplexity API Documentation](https://docs.perplexity.ai/)