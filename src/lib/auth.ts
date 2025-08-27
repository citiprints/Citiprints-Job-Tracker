import { lucia } from "lucia";
import { prisma } from "@/lib/db";
import { prisma as prismaAdapter } from "@lucia-auth/adapter-prisma";
import { cookies } from "next/headers";

export const auth = lucia({
	adapter: prismaAdapter(prisma),
	middleware: {
		async getSession() {
			const cookieStore = await cookies();
			return cookieStore.get("auth_session")?.value ?? null;
		}
	},
	sessionCookie: {
		enabled: true,
		name: "auth_session",
		domain: undefined,
		expires: false
	}
});
