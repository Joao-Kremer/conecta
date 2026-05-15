export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static async from(res: Response): Promise<ApiError> {
    try {
      const body = (await res.json()) as { code?: string; message?: string; details?: unknown };
      return new ApiError(res.status, body.code ?? 'UNKNOWN', body.message ?? res.statusText, body.details);
    } catch {
      return new ApiError(res.status, 'PARSE_ERROR', res.statusText);
    }
  }
}

export class UnauthorizedError extends ApiError {
  constructor() {
    super(401, 'UNAUTHORIZED', 'Sessão expirada. Faça login novamente.');
  }
}
