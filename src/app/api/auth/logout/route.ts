import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function POST() {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get("auth_session")?.value;
	if (sessionId) {
		await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
		cookieStore.set("auth_session", "", { path: "/", maxAge: 0 });
	}
	return NextResponse.json({ ok: true });
}
