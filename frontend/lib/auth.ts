"use client";

export type UserRole = "farmer" | "lender" | "government";

export type DemoUser = {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  organization: string;
};

export const DEMO_USERS: DemoUser[] = [
  {
    email: "farmer@terrascore.in",
    password: "farmer123",
    role: "farmer",
    name: "Rajesh Kumar",
    organization: "TerraScore Farmer Portal",
  },
  {
    email: "lender@terrascore.in",
    password: "lender123",
    role: "lender",
    name: "Ananya Sharma",
    organization: "TerraScore Lending Partner",
  },
  {
    email: "govt@terrascore.in",
    password: "govt123",
    role: "government",
    name: "Government Officer",
    organization: "Government Climate Risk Portal",
  },
];

const SESSION_KEY = "terrascore-session";

export type AuthSession = {
  email: string;
  role: UserRole;
  name: string;
  organization: string;
};

export function login(email: string, password: string): AuthSession | null {
  const user = DEMO_USERS.find(
    (item) =>
      item.email.toLowerCase() === email.trim().toLowerCase() &&
      item.password === password
  );

  if (!user) return null;

  const session: AuthSession = {
    email: user.email,
    role: user.role,
    name: user.name,
    organization: user.organization,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("ts-mode");
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function getRoleRedirect(role: UserRole): string {
  if (role === "farmer") return "/farmer";
  if (role === "lender") return "/lender";
  return "/government";
}
