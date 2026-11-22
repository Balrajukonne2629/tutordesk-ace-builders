import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'tutordesk_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const JWT_ALGORITHM = 'HS256';
const BCRYPT_ROUNDS = 10;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signs a stateless session JWT whose `sub` is the user id.
 */
export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Verifies a session JWT and returns the user id, or null when the token is
 * missing, malformed, expired, or signed with a different secret.
 */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [JWT_ALGORITHM],
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function parseCookieHeader(header: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) {
      try {
        result[name] = decodeURIComponent(value);
      } catch {
        result[name] = value;
      }
    }
  }
  return result;
}

/**
 * Reads the session token from the request: the Authorization Bearer header
 * first, then the httpOnly session cookie.
 */
export function extractSessionToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  return cookieToken ? cookieToken : null;
}

/**
 * Resolves the signed-in user id for a route handler. Returns null when there
 * is no valid session; callers should respond 401 in that case.
 */
export async function getSessionUserId(request: Request): Promise<string | null> {
  const token = extractSessionToken(request);
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Resolves the signed-in user id inside Server Components and server actions,
 * reading only the httpOnly session cookie.
 */
export async function getServerSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Attaches the session cookie to a response (call on login/register/refresh).
 * The same token should also be returned in the JSON body for Bearer usage.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Expires the session cookie on a response (call on logout).
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}