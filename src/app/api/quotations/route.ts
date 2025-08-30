import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const quotations = await db.task.findMany({
			where: {
				customFields: {
					path: ["isQuotation"],
					equals: true
				}
			},
			include: {
				customerRef: true,
				assignments: {
					include: {
						user: true
					}
				}
			},
			orderBy: {
				createdAt: "desc"
			}
		});

		return NextResponse.json({ quotations });
	} catch (error) {
		console.error("Failed to fetch quotations:", error);
		return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 });
	}
}
