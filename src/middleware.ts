import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Проверка админ-доступа: Basic Auth (браузер) или Bearer ADMIN_API_SECRET (скрипты/cron).
function isAuthorized(req: NextRequest): boolean {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  const apiSecret = process.env.ADMIN_API_SECRET;

  if (!adminUser || !adminPass) {
    console.error('ADMIN_USER/ADMIN_PASS not configured — protected routes disabled');
    return false;
  }

  // 1. Bearer-токен для программных вызовов (cron, скрипты контент-пайплайна)
  const authHeader = req.headers.get('authorization') || '';
  if (apiSecret && authHeader === `Bearer ${apiSecret}`) {
    return true;
  }

  // 2. Basic Auth для браузера
  if (!authHeader.startsWith('Basic ')) return false;
  const encoded = authHeader.slice(6);
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }
  const colonIdx = decoded.indexOf(':');
  if (colonIdx < 0) return false;
  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);
  return user === adminUser && pass === adminPass;
}

function deny(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }
  return new NextResponse('Invalid credentials', { status: 401 });
}

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;

  // Публичные пути — пропускаем сразу
  if (
    p.startsWith('/api/booking') ||
    p.startsWith('/api/payment/create') ||
    p.startsWith('/api/payment/webhook') ||
    p.startsWith('/api/telegram/webhook')
  ) {
    return NextResponse.next();
  }

  // Защищаемые пути: админка, контент, AI, setup бота, cron
  const needsAuth =
    p.startsWith('/admin') ||
    p.startsWith('/api/content') ||
    p.startsWith('/api/ai') ||
    p.startsWith('/api/telegram/setup') ||
    p.startsWith('/api/cron');

  if (needsAuth && !isAuthorized(req)) {
    return deny(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/content/:path*',
    '/api/ai/:path*',
    '/api/telegram/setup/:path*',
    '/api/telegram/setup-channel/:path*',
    '/api/cron/:path*',
  ],
};
