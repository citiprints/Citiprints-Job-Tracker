import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		
		return NextResponse.json({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			active: user.active
		});
	} catch (error) {
		console.error("Auth/me error:", error);
		return NextResponse.json({ 
			error: "Internal Server Error",
			details: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
