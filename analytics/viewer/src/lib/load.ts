import type {Baseline} from './baseline.ts';
import type {Report} from './analytics.ts';
import {storageToken} from './auth.ts';

export interface Loaded {
  report: Report;
  baseline: Baseline | null;
}

export class LoadError extends Error {}

/**
 * Loads reports from the private Blob container, or from the Vite dev server
 * when VITE_DATA_URL is a local path.
 */
export async function loadReports(): Promise<Loaded> {
  const base = (import.meta.env.VITE_DATA_URL || '/data').replace(/\/$/, '');
  const local = base.startsWith('/');
  const headers: Record<string, string> = local ? {} : {
    Authorization: `Bearer ${await storageToken()}`,
    'x-ms-version': '2023-11-03',
  };
  async function get<T>(name: string, optional: boolean): Promise<T | null> {
    const response = await fetch(`${base}/${name}`, {headers, cache: 'no-store'});
    if (response.status === 404 && optional) return null;
    if (response.status === 403) throw new LoadError('This account cannot read the reports container. It needs the Storage Blob Data Reader role.');
    if (!response.ok) throw new LoadError(`Loading ${name} returned HTTP ${response.status}.`);
    return response.json() as Promise<T>;
  }
  const [report, baseline] = await Promise.all([get<Report>('umami.json', false), get<Baseline>('ga4-baseline.json', true)]);
  return {report: report!, baseline};
}
