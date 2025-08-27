import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

const CreateTaskSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
	status: z.enum(["TODO","IN_PROGRESS","BLOCKED","DONE","CANCELLED"]).optional(),
	priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
	startAt: z.string().optional(),
	dueAt: z.string().optional(),
	estimatedHours: z.number().optional(),
	customer: z.string().optional(),
	customerId: z.string().optional(),
	jobNumber: z.string().optional(),
	customFields: z.any().optional(),
	assigneeId: z.string().optional(),
});

export async function GET() {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const tasks = await prisma.task.findMany({
		orderBy: { createdAt: "desc" },
		include: { 
			assignments: { 
				include: { user: { select: { id: true, name: true } } } 
			}, 
			subtasks: true, 
			customerRef: true 
		}
	});
	return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	try {
		const json = await request.json();
		console.log("Received JSON:", json);
		
		const data = CreateTaskSchema.parse(json);
		console.log("Parsed data:", data);
		
		const task = await prisma.task.create({
			data: {
				title: data.title,
				description: data.description ?? "",
				status: (data.status as any) ?? "TODO",
				priority: (data.priority as any) ?? "MEDIUM",
				startAt: data.startAt ? new Date(data.startAt) : null,
				dueAt: data.dueAt ? new Date(data.dueAt) : null,
				estimatedHours: data.estimatedHours ?? null,
				customer: data.customer,
				customerId: data.customerId,
				jobNumber: data.jobNumber,
				customFields: data.customFields ? JSON.stringify(data.customFields) : undefined,
				createdById: user.id
			}
		});

		// Create assignment if assigneeId is provided
		if (data.assigneeId) {
			await prisma.assignment.create({
				data: {
					taskId: task.id,
					userId: data.assigneeId,
					role: "assignee"
				}
			});
		}

		return NextResponse.json({ task }, { status: 201 });
	} catch (error) {
		console.error("/api/tasks POST error", error);
		
		if (error instanceof z.ZodError) {
			const errors = error.flatten();
			const errorMessage = Object.values(errors.fieldErrors).flat().join(", ") || "Invalid input";
			return NextResponse.json({ error: errorMessage }, { status: 400 });
		}
		
		const message = (error as any)?.message || "Internal Server Error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
