import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		
		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		// Create uploads directory if it doesn't exist
		const uploadsDir = join(process.cwd(), "public", "uploads");
		if (!existsSync(uploadsDir)) {
			await mkdir(uploadsDir, { recursive: true });
		}

		// Generate unique filename
		const timestamp = Date.now();
		const originalName = file.name;
		const extension = originalName.split('.').pop();
		const filename = `${timestamp}-${originalName}`;
		const filepath = join(uploadsDir, filename);

		// Convert file to buffer and save
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		await writeFile(filepath, buffer);

		return NextResponse.json({ 
			filename: filename,
			originalName: originalName,
			url: `/uploads/${filename}`
		});

	} catch (error) {
		console.error("File upload error:", error);
		return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
	}
}
