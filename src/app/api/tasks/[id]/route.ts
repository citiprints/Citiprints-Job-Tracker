import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;

const s3Client = new S3Client({
	region: "auto",
	endpoint: R2_ENDPOINT,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
	},
});

const UpdateTaskSchema = z.object({
	title: z.string().min(1).optional(),
	description: z.string().optional(),
	status: z.enum(["TODO", "IN_PROGRESS", "DONE", "ARCHIVED", "CLIENT_TO_REVERT", "OTHERS"]).optional(),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
	startAt: z.string().optional(),
	dueAt: z.string().optional(),
	customerId: z.string().optional(),
	assigneeId: z.string().optional(),
	customFields: z.any().optional(),
});

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const task = await prisma.task.findUnique({
			where: { id },
			include: {
				customerRef: true,
				assignments: {
					include: {
						user: true,
					},
				},
				subtasks: true,
			},
		});

		if (!task) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		return NextResponse.json({ task });
	} catch (error) {
		console.error("Error fetching task:", error);
		return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const validatedData = UpdateTaskSchema.parse(body);

		// Handle paymentStatus via customFields
		if (validatedData.customFields?.paymentStatus) {
			validatedData.customFields = {
				...validatedData.customFields,
				paymentStatus: validatedData.customFields.paymentStatus,
			};
		}

		const task = await prisma.task.update({
			where: { id },
			data: validatedData,
			include: {
				customerRef: true,
				assignments: {
					include: {
						user: true,
					},
				},
				subtasks: true,
			},
		});

		return NextResponse.json({ task });
	} catch (error) {
		console.error("Error updating task:", error);
		return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get the task to find associated files
		const task = await prisma.task.findUnique({
			where: { id },
			include: {
				attachments: true,
			},
		});

		if (!task) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		// Delete associated files from R2
		if (task.attachments && task.attachments.length > 0) {
			const deletePromises = task.attachments.map(async (attachment) => {
				try {
					// Extract the key from the URL (assuming URL format: /api/files/key)
					const urlParts = attachment.url.split('/');
					const key = urlParts[urlParts.length - 1];
					
					const deleteCommand = new DeleteObjectCommand({
						Bucket: R2_BUCKET,
						Key: decodeURIComponent(key),
					});
					await s3Client.send(deleteCommand);
				} catch (error) {
					console.error(`Failed to delete file ${attachment.url}:`, error);
				}
			});

			await Promise.all(deletePromises);
		}

		// Delete the task (this will cascade delete attachments due to foreign key)
		await prisma.task.delete({
			where: { id },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting task:", error);
		return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
	}
}
