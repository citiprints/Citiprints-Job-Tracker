import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

const CreateQuotationSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
	status: z.enum(["PENDING","APPROVED","REJECTED","EXPIRED"]).optional(),
	priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
	customerId: z.string().optional(),
	customFields: z.any().optional(),
	assigneeId: z.string().optional(),
});

export async function GET() {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const quotations = await prisma.quotation.findMany({
		orderBy: { createdAt: "desc" },
		include: { 
			assignments: { 
				include: { user: { select: { id: true, name: true } } } 
			}, 
			subtasks: true, 
			customerRef: true 
		}
	});
	return NextResponse.json({ quotations });
}

export async function POST(request: Request) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	try {
		const formData = await request.formData();
		const title = formData.get("title") as string;
		const description = formData.get("description") as string;
		const customerId = formData.get("customerId") as string;
		const assigneeId = formData.get("assigneeId") as string;
		const customFields = formData.get("customFields") as string;
		const files = formData.getAll("files") as File[];

		// Parse custom fields
		let parsedCustomFields = {};
		if (customFields) {
			try {
				parsedCustomFields = JSON.parse(customFields);
			} catch (e) {
				console.error("Failed to parse custom fields:", e);
			}
		}

		// Handle file uploads
		const attachments: string[] = [];
		if (files.length > 0) {
			for (const file of files) {
				try {
					const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/upload`, {
						method: "POST",
						body: (() => {
							const fd = new FormData();
							fd.append("file", file);
							return fd;
						})()
					});
					
					if (uploadRes.ok) {
						const { url } = await uploadRes.json();
						attachments.push(url);
					}
				} catch (error) {
					console.error("File upload failed:", error);
				}
			}
		}

		// Add attachments to custom fields
		if (attachments.length > 0) {
			parsedCustomFields = { ...parsedCustomFields, attachments };
		}

		// Set expiration date to 3 days from now
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 3);

		const data = CreateQuotationSchema.parse({
			title,
			description,
			status: "PENDING",
			priority: "MEDIUM",
			customerId,
			customFields: parsedCustomFields,
			assigneeId,
		});

		const quotation = await prisma.quotation.create({
			data: {
				title: data.title,
				description: data.description ?? "",
				status: (data.status as any) ?? "PENDING",
				priority: (data.priority as any) ?? "MEDIUM",
				customerId: data.customerId,
				customFields: data.customFields ? JSON.stringify(data.customFields) : undefined,
				expiresAt,
				createdById: user.id
			}
		});

		// Create assignment if assigneeId is provided
		if (data.assigneeId) {
			await prisma.quotationAssignment.create({
				data: {
					quotationId: quotation.id,
					userId: data.assigneeId,
					role: "assignee"
				}
			});
		}

		return NextResponse.json({ quotation }, { status: 201 });
	} catch (error) {
		console.error("/api/quotations POST error", error);
		
		if (error instanceof z.ZodError) {
			const errors = error.flatten();
			const errorMessage = Object.values(errors.fieldErrors).flat().join(", ") || "Invalid input";
			return NextResponse.json({ error: errorMessage }, { status: 400 });
		}
		
		const message = (error as any)?.message || "Internal Server Error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
