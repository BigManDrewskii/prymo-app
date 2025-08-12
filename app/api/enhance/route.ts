import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

function sys(){
  return [
    'You are an expert prompt engineer.',
    'Rewrite user prompts to be clearer, more complete, and directly usable.',
    'Return ONLY the enhanced prompt in a fenced ```markdown code block.',
    'Use sections: Goal, Context, Constraints, Output format, Steps, Style, Variables.',
    'Reflect tone/length/audience/platform if provided; never invent facts; use {{VARIABLE}} when missing.'
  ].join(' ')
}

function usr(prompt: string, o: any){
  return `User prompt to enhance:\n\n${prompt}\n\nOptions:\nTone: ${o?.tone||'default'}\nLength: ${o?.length||'concise'}\nAudience: ${o?.audience||'general'}\nPlatform: ${o?.platform||'any'}${o?.extra?('\nNotes: '+o.extra):''}`
}

export async function POST(req: NextRequest){
  try {
    // Extract request data safely with validation
    let prompt, options, apiKey;
    try {
      const body = await req.json();
      ({ prompt, options, apiKey } = body);
      
      // Validate required fields
      if (!prompt || typeof prompt !== 'string') {
        return new Response(JSON.stringify({ error: 'Valid prompt text is required' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      // Validate API key
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
        return new Response(JSON.stringify({ error: 'Valid API key is required' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      // Normalize options to prevent downstream errors
      options = options || {};
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid request format' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Create client instance with user-provided API key
    const client = new Groq({ apiKey });
    
    try {
      // Set a timeout for the Groq API request
      const timeoutMs = 30000; // 30 seconds timeout
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
      
      const completion = await client.chat.completions.create({
        model: 'moonshotai/kimi-k2-instruct',
        messages: [
          { role: 'system', content: sys() },
          { role: 'user', content: usr(prompt, options) }
        ],
        temperature: options?.temperature ?? 0.6,
        top_p: 1,
        max_tokens: 4096,
        stream: true,
      });

      // Clear timeout if the request completes successfully
      clearTimeout(timeoutId);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              controller.enqueue(new TextEncoder().encode(chunk.choices[0]?.delta?.content || ''));
            }
            controller.close();
          } catch (streamError) {
            console.error('Error in stream processing:', streamError);
            controller.error(streamError);
          }
        }
      });

      return new Response(stream, { 
        headers: { 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive'
        } 
      });
    } catch (apiError: any) {
      console.error('Groq API error:', apiError);
      
      // Handle specific error types
      if (apiError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ 
            error: 'Request timed out. The enhancement process took too long to complete.', 
            code: 'TIMEOUT_ERROR' 
          }),
          { status: 504, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle API key validation errors
      if (apiError.status === 401 || apiError.status === 403 || apiError.message?.includes('auth') || apiError.message?.includes('Access denied')) {
        console.error('Auth error details:', apiError);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid API key or authorization error. Please check your Groq API key and try again.', 
            code: 'AUTH_ERROR',
            message: apiError.message || 'Authentication failed'
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle rate limiting
      if (apiError.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again later.', 
            code: 'RATE_LIMIT_ERROR' 
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Generic API error
      return new Response(
        JSON.stringify({ 
          error: 'Failed to enhance prompt. Please try again later.', 
          code: 'API_ERROR',
          message: apiError.message || 'Unknown error' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (serverError) {
    // Catch any unhandled server errors
    console.error('Unhandled server error:', serverError);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred on the server.', 
        code: 'SERVER_ERROR' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
