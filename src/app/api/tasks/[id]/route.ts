import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

const UpdateTaskSchema = z.object({
	title: z.string().min(1).optional(),
	description: z.string().optional(),
	status: z.enum(["TODO","IN_PROGRESS","BLOCKED","DONE","CANCELLED","ARCHIVED"]).optional(),
	priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
	startAt: z.string().nullable().optional(),
	dueAt: z.string().nullable().optional(),
	estimatedHours: z.number().nullable().optional(),
	actualHours: z.number().nullable().optional(),
	customer: z.string().nullable().optional(),
	customerId: z.string().nullable().optional(),
	assigneeId: z.string().nullable().optional(),
	jobNumber: z.string().nullable().optional(),
	customFields: z.any().nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { id } = await params;
	const task = await prisma.task.findUnique({ where: { id }, include: { subtasks: true, assignments: true } });
	if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json({ task });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	try {
		const json = await request.json();
		const data = UpdateTaskSchema.parse(json);
		const { id } = await params;
		
		// Handle assignment updates
		if ("assigneeId" in data) {
			// Delete existing assignments
			await prisma.assignment.deleteMany({
				where: { taskId: id }
			});
			
			// Create new assignment if assigneeId is provided
			if (data.assigneeId) {
				await prisma.assignment.create({
					data: {
						taskId: id,
						userId: data.assigneeId,
						role: "ASSIGNEE"
					}
				});
			}
		}
		
		const task = await prisma.task.update({
			where: { id },
			data: {
				...("title" in data ? { title: data.title! } : {}),
				...("description" in data ? { description: data.description ?? "" } : {}),
				...("status" in data ? { status: data.status as any } : {}),
				...("priority" in data ? { priority: data.priority as any } : {}),
				...("startAt" in data ? { startAt: data.startAt ? new Date(data.startAt) : null } : {}),
				...("dueAt" in data ? { dueAt: data.dueAt ? new Date(data.dueAt) : null } : {}),
				...("estimatedHours" in data ? { estimatedHours: data.estimatedHours ?? null } : {}),
				...("actualHours" in data ? { actualHours: data.actualHours ?? null } : {}),
				...("customer" in data ? { customer: data.customer ?? null } : {}),
				...("customerId" in data ? { customerId: data.customerId ?? null } : {}),
				...("jobNumber" in data ? { jobNumber: data.jobNumber ?? null } : {}),
				...("customFields" in data ? { customFields: data.customFields == null ? null : JSON.stringify(data.customFields) } : {}),
			},
			include: {
				assignments: {
					include: {
						user: true
					}
				},
				customerRef: true
			}
		});
		return NextResponse.json({ task });
	} catch (error) {
		console.error("PATCH /api/tasks/[id] error:", error);
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	try {
		const { id } = await params;
		
		// Delete related records first (due to foreign key constraints)
		await prisma.$transaction([
			// Delete subtasks
			prisma.subtask.deleteMany({
				where: { taskId: id }
			}),
			// Delete assignments
			prisma.assignment.deleteMany({
				where: { taskId: id }
			}),
			// Delete comments
			prisma.comment.deleteMany({
				where: { taskId: id }
			}),
			// Delete attachments
			prisma.attachment.deleteMany({
				where: { taskId: id }
			}),
			// Delete activity logs
			prisma.activityLog.deleteMany({
				where: { taskId: id }
			}),
			// Finally delete the task
			prisma.task.delete({
				where: { id }
			})
		]);
		
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("DELETE /api/tasks/[id] error:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
