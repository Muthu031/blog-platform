export class AppError extends Error {
  public code?: string;

  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    code?: string
  ) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code?: string) {
    super(400, message, true, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code?: string) {
    super(401, message, true, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code?: string) {
    super(403, message, true, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found', code?: string) {
    super(404, message, true, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code?: string) {
    super(409, message, true, code);
  }
}

export class PreconditionRequiredError extends AppError {
  constructor(message = 'Precondition Required', code?: string) {
    super(428, message, true, code);
  }
}
