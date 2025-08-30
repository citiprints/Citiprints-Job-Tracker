import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

const UpdateQuotationSchema = z.object({
	title: z.string().min(1).optional(),
	description: z.string().optional(),
	status: z.enum(["PENDING","APPROVED","REJECTED","EXPIRED"]).optional(),
	priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
	customerId: z.string().optional(),
	customFields: z.any().optional(),
	assigneeId: z.string().optional(),
});

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const { id } = await params;
	
	const quotation = await prisma.quotation.findUnique({
		where: { id },
		include: { 
			assignments: { 
				include: { user: { select: { id: true, name: true } } } 
			}, 
			subtasks: true, 
			customerRef: true 
		}
	});
	
	if (!quotation) {
		return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
	}
	
	return NextResponse.json({ quotation });
}

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const { id } = await params;
	
	try {
		const json = await request.json();
		const data = UpdateQuotationSchema.parse(json);
		
		const quotation = await prisma.quotation.update({
			where: { id },
			data: {
				title: data.title,
				description: data.description,
				status: data.status,
				priority: data.priority,
				customerId: data.customerId,
				customFields: data.customFields ? JSON.stringify(data.customFields) : undefined,
			}
		});

		// Update assignment if assigneeId is provided
		if (data.assigneeId !== undefined) {
			// Delete existing assignments
			await prisma.assignment.deleteMany({
				where: { quotationId: id }
			});
			
			// Create new assignment if assigneeId is provided
			if (data.assigneeId) {
				await prisma.assignment.create({
					data: {
						quotationId: id,
						userId: data.assigneeId,
						role: "assignee"
					}
				});
			}
		}

		return NextResponse.json({ quotation });
	} catch (error) {
		console.error("/api/quotations/[id] PATCH error", error);
		
		if (error instanceof z.ZodError) {
			const errors = error.flatten();
			const errorMessage = Object.values(errors.fieldErrors).flat().join(", ") || "Invalid input";
			return NextResponse.json({ error: errorMessage }, { status: 400 });
		}
		
		const message = (error as any)?.message || "Internal Server Error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const { id } = await params;
	
	try {
		// Delete assignments first
		await prisma.assignment.deleteMany({
			where: { quotationId: id }
		});
		
		// Delete subtasks
		await prisma.subtask.deleteMany({
			where: { quotationId: id }
		});
		
		// Delete the quotation
		await prisma.quotation.delete({
			where: { id }
		});
		
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("/api/quotations/[id] DELETE error", error);
		const message = (error as any)?.message || "Internal Server Error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
