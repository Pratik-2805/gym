import { cookies } from "next/headers";

/**
 * Server-side helper to fetch data from the Express backend, forwarding authentication cookies.
 */
export async function fetchBackend(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const headers = new Headers(options.headers);

  // Forward cookies server-side (e.g. auth_token HttpOnly cookie)
  try {
    const cookieStore = await cookies();
    const cookieString = cookieStore.toString();

    if (cookieString) {
      headers.set("Cookie", cookieString);
    }

    // Also set Bearer token for backends that check Authorization header
    const token = cookieStore.get("auth_token")?.value;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch {
    // Running client-side or cookie store unavailable — skip forwarding
  }

  // Ensure JSON content type by default for body payloads
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...options,
    headers,
  });

  return response;
}
