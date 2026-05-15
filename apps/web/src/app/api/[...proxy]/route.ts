import { type NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const BLOCKED_REQ_HEADERS = new Set(['host', 'connection', 'transfer-encoding']);
const BLOCKED_RES_HEADERS = new Set(['connection', 'transfer-encoding', 'keep-alive']);

async function forwardToApi(req: NextRequest, segments: string[]): Promise<NextResponse> {
  const path = segments.join('/');
  const url = new URL(`/${path}${req.nextUrl.search}`, API_URL);

  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (!BLOCKED_REQ_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  }
  headers.set('x-requested-with', 'conecta-web');

  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(url.toString(), {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  });

  const resHeaders = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    if (!BLOCKED_RES_HEADERS.has(key.toLowerCase())) resHeaders.set(key, value);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }): Promise<NextResponse> {
  return forwardToApi(req, (await params).proxy);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }): Promise<NextResponse> {
  return forwardToApi(req, (await params).proxy);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }): Promise<NextResponse> {
  return forwardToApi(req, (await params).proxy);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }): Promise<NextResponse> {
  return forwardToApi(req, (await params).proxy);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ proxy: string[] }> }): Promise<NextResponse> {
  return forwardToApi(req, (await params).proxy);
}
