import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Jika environment variable supabase belum diset (misal awal setup)
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const pathname = request.nextUrl.pathname;

  // Lewati file statis, public asset, dll
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/avatars") ||
    pathname.includes(".")
  ) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedPath =
    pathname.startsWith("/profil") ||
    pathname.startsWith("/kas") ||
    pathname.startsWith("/admin");

  const isLoginPage = pathname === "/login";
  const isGantiPasswordPage = pathname === "/ganti-password";

  if (!user) {
    // Pengguna belum login
    if (isProtectedPath || isGantiPasswordPage) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // Pengguna sudah login: Ambil data profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nim, full_name, must_change_password, is_active, role")
    .eq("id", user.id)
    .single();

  // Jika akun nonaktif tapi sesi masih ada, paksa logout
  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Akun Anda berstatus nonaktif.");
    return NextResponse.redirect(loginUrl);
  }

  // AC-04: Login pertama MEMAKSA ganti password sebelum halaman lain bisa dibuka
  if (profile?.must_change_password) {
    if (!isGantiPasswordPage && !pathname.startsWith("/api/auth")) {
      const gantiPasswordUrl = new URL("/ganti-password", request.url);
      return NextResponse.redirect(gantiPasswordUrl);
    }
    return response;
  }

  // Jika password sudah diganti tapi membuka halaman /ganti-password atau /login
  if (profile && !profile.must_change_password) {
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/profil", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
