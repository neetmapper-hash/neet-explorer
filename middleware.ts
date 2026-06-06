import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that are always public — no auth or guest check needed
const PUBLIC_ROUTES = ['/login', '/register', '/auth'];

// Routes guests can access (unauthenticated but chose "try without registering")
// Guests have a sessionStorage flag — middleware can't read sessionStorage,
// so we open these routes to everyone and let the pages handle guest limits.
const GUEST_ALLOWED_ROUTES = ['/heatmap', '/ancestry', '/quiz'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const hasCode = request.nextUrl.searchParams.has('code');

  // Always allow public routes and OAuth callbacks
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r)) || hasCode) {
    // If logged-in user hits login/register, redirect to heatmap
    if (user && !hasCode && PUBLIC_ROUTES.slice(0, 2).some(r => pathname.startsWith(r))) {
      const url = request.nextUrl.clone();
      url.pathname = '/heatmap';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Guest-allowed routes: let them through — pages handle guest limits internally
  if (GUEST_ALLOWED_ROUTES.some(r => pathname.startsWith(r))) {
    // Check for guest cookie set by login page "Try without registering" button
    const isGuest = request.cookies.get('bv_guest_mode')?.value === '1';
    if (user || isGuest) return supabaseResponse;

    // Neither logged in nor guest — redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // All other routes require auth
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
};
