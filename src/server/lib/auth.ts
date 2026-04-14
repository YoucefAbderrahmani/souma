import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { db } from "../db/index"; // your drizzle instance
import * as schema from "@/server/db/schema";
import { fetchUserLastName } from "@/use-cases/user";
import { getUserImageById, getUserPhoneById } from "../data-access/user";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const toTenDigitPhone = (seed: string) => {
  let digits = seed.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  while (digits.length < 10) {
    digits += "0";
  }
  return digits;
};

const splitGoogleName = (profile: Record<string, any>) => {
  const fullName = String(profile.name ?? "").trim();
  const givenName = String(profile.given_name ?? "").trim();
  const familyName = String(profile.family_name ?? "").trim();

  if (givenName || familyName) {
    return {
      firstName: givenName || fullName || "Google",
      lastName: familyName || "User",
    };
  }

  const chunks = fullName.split(/\s+/).filter(Boolean);
  if (chunks.length >= 2) {
    return {
      firstName: chunks[0],
      lastName: chunks.slice(1).join(" "),
    };
  }

  return {
    firstName: fullName || "Google",
    lastName: "User",
  };
};
const normalizeOrigin = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
};

const trustedOrigins = Array.from(
  new Set(
    [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
      "http://127.0.0.1:3003",
      normalizeOrigin(process.env.BETTER_AUTH_URL),
      normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL),
      normalizeOrigin(process.env.VERCEL_URL),
    ].filter((origin): origin is string => Boolean(origin))
  )
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema,
  }),

  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins,
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            mapProfileToUser: (profile) => {
              const { firstName, lastName } = splitGoogleName(profile as Record<string, any>);
              const phoneSeed = String(
                (profile as Record<string, any>).sub ??
                  (profile as Record<string, any>).id ??
                  Date.now()
              );

              return {
                name: firstName,
                lastname: lastName,
                phone: toTenDigitPhone(phoneSeed),
              };
            },
          },
        }
      : undefined,
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // don't allow user to set role
      },
      lastname: {
        type: "string",
        required: true,
      },
      phone: {
        type: "string",
        required: true,
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
  plugins: [
    nextCookies(),
    customSession(async ({ user, session }) => {
      // const roles = findUserRoles(session.session.userId);
      const lastname = await fetchUserLastName(user.id);
      const image = await getUserImageById(user.id);
      const phone = await getUserPhoneById(user.id);
      return {
        user: {
          ...user,
          lastname,
          image,
          phone,
        },
        session,
      };
    }),
  ], // make sure this is the last plugin in the array
});
