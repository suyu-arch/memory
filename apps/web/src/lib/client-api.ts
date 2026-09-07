import { getSupabase } from './supabase';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1';

export async function clientApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = (await getSupabase()?.auth.getSession())?.data.session;
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');
  if (session?.access_token) headers.set('authorization', `Bearer ${session.access_token}`);
  else if (process.env.NODE_ENV !== 'production') {
    headers.set('x-user-id', 'demo-user');
    headers.set('x-user-email', 'demo@example.test');
    headers.set('x-user-name', '小满');
  }
  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export function appPath(path: string) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
}
