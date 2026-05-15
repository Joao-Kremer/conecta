export class DomainException extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundException extends DomainException {
  constructor(code: string, message: string) {
    super(code, message, 404);
  }
}

export class ConflictException extends DomainException {
  constructor(code: string, message: string) {
    super(code, message, 409);
  }
}

export class UnprocessableException extends DomainException {
  constructor(code: string, message: string) {
    super(code, message, 422);
  }
}
