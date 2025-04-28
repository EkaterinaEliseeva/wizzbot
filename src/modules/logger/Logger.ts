export class Logger {
  log(message: string): void {
    console.log(message);
  }

  error(error: string): void {
    console.error(error);
  }
}
