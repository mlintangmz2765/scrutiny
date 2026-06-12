/**
 * Application error mapped to the `{error:{code,message}}` envelope by the
 * error-handler plugin (ARCHITECTURE.md §8).
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
