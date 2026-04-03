import React from 'react';
import ReactDOM from 'react-dom/client';
import { invoke } from '@tauri-apps/api/core';
import App from './App';

const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
const FUNCTIONS_REGION = (import.meta.env.VITE_FUNCTIONS_REGION as string) || 'asia-northeast1';
const FUNCTIONS_PROJECT_ID = (import.meta.env.VITE_FUNCTIONS_PROJECT_ID as string)
  || import.meta.env.VITE_FIREBASE_PROJECT_ID
  || '';
const CLOUD_FUNCTIONS_BASE_URL = (import.meta.env.VITE_FUNCTIONS_PUBLIC_URL as string)
  || (FUNCTIONS_PROJECT_ID
    ? `https://${FUNCTIONS_REGION}-${FUNCTIONS_PROJECT_ID}.cloudfunctions.net`
    : '');
const DESKTOP_API_PREFIXES = [import.meta.env.VITE_FUNCTIONS_URL, CLOUD_FUNCTIONS_BASE_URL]
  .filter((value): value is string => Boolean(value))
  .map((value) => value.replace(/\/+$/, ''));

type HttpBridgeResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
};

function shouldUseDesktopHttpBridge(url: string): boolean {
  return isTauri && DESKTOP_API_PREFIXES.some((prefix) => url.startsWith(prefix));
}

async function buildBridgeRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}> {
  const request = input instanceof Request ? input : undefined;
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  const method = init?.method ?? request?.method ?? 'GET';
  const headers = new Headers(request?.headers);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));

  let body: string | undefined;
  const rawBody = init?.body;
  if (typeof rawBody === 'string') {
    body = rawBody;
  } else if (rawBody instanceof URLSearchParams) {
    body = rawBody.toString();
  } else if (!rawBody && request && !['GET', 'HEAD'].includes(method.toUpperCase())) {
    const cloned = request.clone();
    const text = await cloned.text();
    if (text) body = text;
  } else if (rawBody != null) {
    throw new Error(`Unsupported fetch body type for desktop bridge: ${Object.prototype.toString.call(rawBody)}`);
  }

  return {
    url,
    method,
    headers: Object.fromEntries(headers.entries()),
    ...(body !== undefined ? { body } : {}),
  };
}

function installDesktopHttpBridge(): void {
  if (!isTauri) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (!shouldUseDesktopHttpBridge(url)) {
      return nativeFetch(input, init);
    }

    const request = await buildBridgeRequest(input, init);
    const response = await invoke<HttpBridgeResponse>('http_request', request);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

installDesktopHttpBridge();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
