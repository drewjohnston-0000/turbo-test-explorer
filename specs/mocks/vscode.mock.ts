/**
 * Mock implementation of VS Code Uri class
 */
export class Uri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;

  constructor(scheme: string, authority: string, path: string, query: string, fragment: string) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
  }

  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  get fsPath(): string {
    return this.path;
  }

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}`;
  }
}

/**
 * Mock implementation of VS Code Position class
 */
export class Position {
  constructor(public readonly line: number, public readonly character: number) { }
}

/**
 * Mock implementation of VS Code Range class
 */
export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position
  ) { }
}

/**
 * Mock implementation of VS Code Location class
 */
export class Location {
  constructor(
    public readonly uri: Uri,
    public readonly range: Range | Position
  ) { }
}