import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/api/validation-explanation')({
  server: { handlers: { POST: async ({ request }) => {
    const { handleValidationExplanation } = await import('../server/validation.server');
    return handleValidationExplanation(request);
  } } },
});