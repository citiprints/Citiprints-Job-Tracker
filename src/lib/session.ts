import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function getCurrentSession() {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get("auth_session")?.value;
	if (!sessionId) return null;
	const session = await prisma.session.findUnique({ where: { id: sessionId } });
	if (!session) return null;
	if (session.expiresAt.getTime() < Date.now()) {
		await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
		return null;
	}
	return session;
}

export async function getCurrentUser() {
	const session = await getCurrentSession();
	if (!session) return null;
	return prisma.user.findUnique({ where: { id: session.userId } });
}
