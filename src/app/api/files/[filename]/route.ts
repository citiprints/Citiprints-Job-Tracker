import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_REGION = process.env.R2_REGION || "auto";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;

const s3 = new S3Client({
	endpoint: R2_ENDPOINT,
	region: R2_REGION,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
});

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ filename: string }> }
) {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { filename } = await params;
		const decodedFilename = decodeURIComponent(filename);

		const command = new GetObjectCommand({
			Bucket: R2_BUCKET,
			Key: decodedFilename,
		});

		const response = await s3.send(command);
		
		if (!response.Body) {
			return NextResponse.json({ error: "File not found" }, { status: 404 });
		}

		// Convert the readable stream to a buffer
		const chunks: Uint8Array[] = [];
		for await (const chunk of response.Body as any) {
			chunks.push(chunk);
		}
		const buffer = Buffer.concat(chunks);

		// Determine content type
		const contentType = response.ContentType || "application/octet-stream";
		
		// Create response with proper headers
		return new NextResponse(buffer, {
			headers: {
				"Content-Type": contentType,
				"Content-Length": buffer.length.toString(),
				"Cache-Control": "public, max-age=3600",
			},
		});
	} catch (error) {
		console.error("File download error:", error);
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}
}
