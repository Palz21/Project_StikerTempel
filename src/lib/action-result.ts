export type ActionResult<T = undefined> =
  | {
      success: true;
      data?: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export function ok<T = undefined>(data?: T, message?: string): ActionResult<T> {
  return { success: true, data, message };
}

export function fail<T = undefined>(
  error: string,
  fieldErrors?: Record<string, string[]>
): ActionResult<T> {
  return { success: false, error, fieldErrors };
}
