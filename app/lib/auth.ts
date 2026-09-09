import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "default_super_secret_key_change_in_production");

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, { algorithms: ["HS256"] });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession(req?: NextRequest) {
  let token;
  if (req) {
    token = req.cookies.get("session")?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get("session")?.value;
  }
  
  if (!token) return null;
  return await verifySession(token);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
