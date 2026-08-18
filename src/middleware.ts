import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (!adminUser || !adminPass) {
      console.error('ADMIN_USER/ADMIN_PASS not configured — /admin disabled');
      return new NextResponse('Admin unavailable: server misconfiguration', {
        status: 503,
        headers: { 'Retry-After': '3600' },
      });
    }

    const auth = req.headers.get('authorization');
    if (!auth) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
      });
    }

    const [scheme, encoded] = auth.split(' ');
    if (scheme !== 'Basic' || !encoded) {
      return new NextResponse('Invalid auth', { status: 401 });
    }

    const decoded = atob(encoded);
    const [user, pass] = decoded.split(':');

    if (user !== adminUser || pass !== adminPass) {
      return new NextResponse('Invalid credentials', { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
