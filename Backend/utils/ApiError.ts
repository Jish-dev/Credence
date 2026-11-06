export default class ApiError extends Error {
  statusCode: number; isOperational = true;
  constructor(statusCode: number, message: string) { super(message); this.statusCode = statusCode; }
}
