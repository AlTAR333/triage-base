/** An error that carries the HTTP status to return to the client. */
export class HttpError extends Error {
  status: number;
  issues?: string[];
  constructor(status: number, message: string, issues?: string[]) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { error: error.message, issues: error.issues ?? [] },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected error.";
  return Response.json({ error: message, issues: [] }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}
