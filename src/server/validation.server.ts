import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { failurePaths } from '../../frontend/src/engine/aiValidationContext';
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayResponseHeaders } from './run-id.ts';

export const contextSchema = z.object({
  profile: z.enum(['base', 'us-core']),
  failures: z.array(z.object({ index: z.number().int().min(1).max(10000), path: z.enum(failurePaths), severity: z.enum(['error', 'warning', 'information']) }).strict()).min(1).max(40),
  omitted: z.number().int().min(0).max(10000),
}).strict();

function safeError(body: unknown): string {
  if (body && typeof body === 'object') {
    const obj = body as { message?: unknown; error?: { message?: unknown } };
    const message = obj.error?.message ?? obj.message;
    if (typeof message === 'string') return message;
  }
  return 'The AI service could not complete this request.';
}

export async function handleValidationExplanation(request: Request) {
  // Both secrets are read only inside the request boundary.
  const key = process.env['LOVABLE_API_KEY'];
  const url = process.env['SUPABASE_URL'];
  const storageKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!key || !url || !storageKey) return Response.json({ error: 'AI service configuration is incomplete.' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Request must originate from this app.' }, { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 20000) return Response.json({ error: 'Too many validation issues.' }, { status: 400 });
  let input: z.infer<typeof contextSchema>;
  try { input = contextSchema.parse(await request.json()); }
  catch { return Response.json({ error: 'Only supported, privacy-safe validation categories can be explained.' }, { status: 400 }); }

  // Privileged storage contains service state only, never user or clinical data.
  const stateClient = createClient(url, storageKey, { auth: { persistSession: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (storageKey.startsWith('sb_') && headers.get('Authorization') === `Bearer ${storageKey}`) headers.delete('Authorization');
    headers.set('apikey', storageKey);
    return fetch(input, { ...init, headers });
  } } });
  const { data: paused, error: stateError } = await stateClient.from('ai_service_state').select('status,message').eq('id', 'validation').maybeSingle();
  if (stateError) return Response.json({ error: 'AI access status could not be checked. Please try again later.' }, { status: 503 });
  if (paused) return Response.json({ error: paused.message }, { status: paused.status });

  const gateway = createLovableAiGatewayRunIdFetch();
  let settleHeaders: (result: { status: number; message?: string; headers?: Headers }) => void = () => {};
  const ready = new Promise<{ status: number; message?: string; headers?: Headers }>(resolve => { settleHeaders = resolve; });
  const provider = createOpenAI({
    baseURL: 'https://ai.gateway.lovable.dev/v1', apiKey: key,
    headers: { 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    fetch: async (input, init) => {
      const response = await gateway.fetch(input, init);
      if (!response.ok) {
        let body: unknown;
        try { body = await response.clone().json(); } catch { body = null; }
        const message = safeError(body);
        if (response.status === 402 || response.status === 403) {
          await stateClient.from('ai_service_state').upsert({ id: 'validation', status: response.status, message, updated_at: new Date().toISOString() });
        }
        settleHeaders({ status: response.status, message, headers: response.headers });
      } else settleHeaders({ status: response.status, headers: response.headers });
      return response;
    },
  });
  const result = streamText({
    model: provider.responses('openai/gpt-6-astra'), maxRetries: 0, abortSignal: request.signal,
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', store: false, include: ['reasoning.encrypted_content'] } },
    system: `You assist clinical informaticists investigating HL7 v2 to FHIR R4 validation failures. Input contains only structural failure categories, no patient data. This workbench uses a limited custom rule set, not the official HL7 FHIR validator. Do not describe every application finding as a normative FHIR error: resource id may be optional in some contexts, units depend on the quantity, US Core depends on exact profile/version, and race/ethnicity guidance must be checked against the implementation guide. For each supplied issue number, explain what to inspect, distinguish error from warning, identify relevant HL7 source fields (PID-3, PID-5, PID-8, OBX-2/3/5/6/11, PV1-2 as appropriate), and give concrete manual mapping or FHIR JSON edits and a revalidation step. You cannot see actual values, specimen, timing, or references. Never invent patient values, fabricate clinical units or race/ethnicity, or claim certification. Use concise plain text, numbered sections, no markdown tables, no em dashes. About 600 words maximum. End with a short reminder to review changes clinically and verify against the official validator and exact selected profile. Recommendations only, nothing is applied.`,
    messages: [{ role: 'user', content: JSON.stringify(input) }],
  });
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      let text = '';
      try {
        for await (const part of result.fullStream) {
          if (part.type === 'text-delta') { text += part.text; emit({ type: 'text', text: part.text }); }
          else if (part.type === 'reasoning-delta') emit({ type: 'reasoning', text: part.text });
          else if (part.type === 'error') {
            settleHeaders({ status: request.signal.aborted ? 499 : 502 });
            emit({ type: 'error', message: request.signal.aborted ? 'Request stopped.' : 'The AI request ended unexpectedly. No changes were applied.' });
          }
        }
        if (!text.trim()) emit({ type: 'error', message: 'The AI service returned no explanation or declined the request. No changes were applied.' });
        emit({ type: 'done' });
      } catch {
        settleHeaders({ status: request.signal.aborted ? 499 : 502 });
        emit({ type: 'error', message: request.signal.aborted ? 'Request stopped.' : 'The AI request was interrupted. No changes were applied.' });
      } finally { controller.close(); }
    },
  });
  const upstream = await ready;
  const headers = getLovableAiGatewayResponseHeaders(upstream.headers, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' });
  if (upstream.status >= 400) {
    void body.cancel().catch(() => {});
    return Response.json({ error: upstream.message || 'The AI request could not be completed.' }, { status: upstream.status, headers: getLovableAiGatewayResponseHeaders(upstream.headers, { 'Cache-Control': 'no-store' }) });
  }
  return new Response(body, { headers });
}