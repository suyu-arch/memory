const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json');
  if (__DEV__) {
    headers.set('x-user-id', 'demo-user');
    headers.set('x-user-email', 'demo@example.test');
    headers.set('x-user-name', '小满');
  }
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}
