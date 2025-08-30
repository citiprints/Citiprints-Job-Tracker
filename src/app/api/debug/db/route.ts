import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
	try {
		// Test basic connection
		await prisma.$connect();
		
		// Test if User table exists
		const userCount = await prisma.user.count();
		
		// Test if Session table exists
		const sessionCount = await prisma.session.count();
		
		return NextResponse.json({
			status: "connected",
			tables: {
				user: { exists: true, count: userCount },
				session: { exists: true, count: sessionCount }
			},
			env: {
				databaseUrl: process.env.DATABASE_URL ? "set" : "not set",
				nodeEnv: process.env.NODE_ENV
			}
		});
	} catch (error) {
		console.error("Database connection error:", error);
		return NextResponse.json({
			status: "error",
			error: error instanceof Error ? error.message : "Unknown error",
			env: {
				databaseUrl: process.env.DATABASE_URL ? "set" : "not set",
				nodeEnv: process.env.NODE_ENV
			}
		}, { status: 500 });
	} finally {
		await prisma.$disconnect();
	}
}
