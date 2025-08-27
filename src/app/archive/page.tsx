"use client";
import React, { useEffect, useState } from "react";

type Task = {
	id: string;
	title: string;
	description: string;
	status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
	priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
	startAt?: string | null;
	dueAt: string | null;
	createdAt: string;
	customerRef?: { id: string; name: string } | null;
	customFields?: any;
	assignments?: { id: string; user: { id: string; name: string }; role: string }[];
	subtasks?: Subtask[];
	archived?: boolean;
};

type Subtask = {
	id: string;
	title: string;
	status: "TODO" | "IN_PROGRESS" | "DONE";
	assigneeId?: string | null;
	assignee?: { id: string; name: string; email: string } | null;
	dueAt?: string | null;
	estimatedHours?: number | null;
	order: number;
	createdAt: string;
	updatedAt: string;
};

// Loading skeleton component
function ArchiveSkeleton() {
	return (
		<div className="space-y-4">
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={i} className="border border-gray-200 rounded p-3">
					<div className="animate-pulse">
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2">
								<div className="w-5 h-5 bg-gray-200 rounded-full"></div>
								<div className="h-5 bg-gray-200 rounded w-48"></div>
								<div className="h-4 bg-gray-200 rounded w-16"></div>
								<div className="h-4 bg-gray-200 rounded w-20"></div>
							</div>
							<div className="h-6 bg-gray-200 rounded w-20"></div>
						</div>
						<div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
						<div className="flex gap-2">
							<div className="h-8 bg-gray-200 rounded w-16"></div>
							<div className="h-8 bg-gray-200 rounded w-16"></div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

export default function ArchivePage() {
	const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);

	// Get current user
	useEffect(() => {
		async function getCurrentUser() {
			const res = await fetch("/api/auth/me");
			if (res.ok) {
				const user = await res.json();
				setCurrentUser(user);
			}
		}
		getCurrentUser();
	}, []);

	useEffect(() => {
		async function load() {
			setLoading(true);
			try {
				const res = await fetch("/api/tasks?archived=true");
				if (res.ok) {
					const json = await res.json();
					const loaded: Task[] = (json.tasks ?? []).map((t: any) => ({
						...t,
						customFields: typeof t.customFields === "string" ? (() => { try { return JSON.parse(t.customFields); } catch { return {}; } })() : (t.customFields || {})
					}));
					
					// Load subtasks for each task
					const tasksWithSubtasks = await Promise.all(
						loaded.map(async (task) => {
							const resSubtasks = await fetch(`/api/subtasks?taskId=${task.id}`);
							if (resSubtasks.ok) {
								const subtasksData = await resSubtasks.json();
								return { ...task, subtasks: subtasksData.subtasks || [] };
							}
							return { ...task, subtasks: [] };
						})
					);
					
					setTasks(tasksWithSubtasks);
				}
			} catch (error) {
				console.error("Failed to load archived tasks:", error);
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	async function unarchiveTask(taskId: string) {
		try {
			const res = await fetch(`/api/tasks/${taskId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ archived: false })
			});
			if (res.ok) {
				// Remove the task from the list
				setTasks(tasks.filter(t => t.id !== taskId));
			}
		} catch (error) {
			console.error("Failed to unarchive task:", error);
		}
	}

	async function deleteTask(taskId: string) {
		if (!confirm("Are you sure you want to permanently delete this task? This action cannot be undone.")) {
			return;
		}
		
		try {
			const res = await fetch(`/api/tasks/${taskId}`, {
				method: "DELETE"
			});
			if (res.ok) {
				// Remove the task from the list
				setTasks(tasks.filter(t => t.id !== taskId));
			}
		} catch (error) {
			console.error("Failed to delete task:", error);
		}
	}

	// Helper function to check if task is assigned to current user
	function isAssignedToMe(task: Task): boolean {
		if (!currentUser || !task.assignments) return false;
		return task.assignments.some(assignment => assignment.user.id === currentUser.id);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Archived Tasks</h1>
				<div className="text-sm text-gray-500">
					{loading ? "Loading..." : `${tasks.length} archived task${tasks.length !== 1 ? 's' : ''}`}
				</div>
			</div>

			{loading ? (
				<ArchiveSkeleton />
			) : tasks.length === 0 ? (
				<div className="text-center py-12">
					<div className="text-gray-400 text-6xl mb-4">📦</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">No archived tasks</h3>
					<p className="text-gray-500">Completed tasks will appear here once they're archived.</p>
				</div>
			) : (
				<div className="space-y-4">
					{tasks.map((task, index) => (
						<div key={task.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-3">
									<span className="text-sm text-gray-500">#{index + 1}</span>
									<h3 className="text-lg font-medium">{task.title}</h3>
									{task.customFields?.quantity && (
										<span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
											Qty: {task.customFields.quantity}
										</span>
									)}
									{task.customerRef?.name && (
										<span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
											{task.customerRef.name}
										</span>
									)}
									{task.customFields?.category && (
										<span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
											{task.customFields.category}
										</span>
									)}
									{isAssignedToMe(task) && (
										<span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
											Assigned to me
										</span>
									)}
								</div>
								<div className="flex items-center gap-2">
									<span className={`text-xs px-2 py-1 rounded-full ${
										task.status === "DONE" ? "bg-green-100 text-green-800" :
										task.status === "CANCELLED" ? "bg-red-100 text-red-800" :
										"bg-gray-100 text-gray-800"
									}`}>
										{task.status}
									</span>
									<span className={`text-xs px-2 py-1 rounded-full ${
										task.priority === "URGENT" ? "bg-red-100 text-red-800" :
										task.priority === "HIGH" ? "bg-orange-100 text-orange-800" :
										task.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
										"bg-green-100 text-green-800"
									}`}>
										{task.priority}
									</span>
								</div>
							</div>

							{task.description && (
								<p className="text-gray-600 mb-3">{task.description}</p>
							)}

							<div className="flex items-center justify-between text-sm text-gray-500 mb-3">
								<div className="flex items-center gap-4">
									<span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
									{task.dueAt && (
										<span>Due: {new Date(task.dueAt).toLocaleDateString()}</span>
									)}
									{task.assignments && task.assignments.length > 0 && (
										<span>Assigned to: {task.assignments.map(a => a.user.name).join(", ")}</span>
									)}
								</div>
							</div>

							{/* Subtasks */}
							{task.subtasks && task.subtasks.length > 0 && (
								<div className="mb-3">
									<h4 className="text-sm font-medium text-gray-700 mb-2">Subtasks:</h4>
									<div className="space-y-1 ml-4">
										{task.subtasks.map(subtask => (
											<div key={subtask.id} className="flex items-center gap-2 text-sm">
												<span className={`w-2 h-2 rounded-full ${
													subtask.status === "DONE" ? "bg-green-500" : "bg-gray-300"
												}`}></span>
												<span className={subtask.status === "DONE" ? "line-through text-gray-500" : ""}>
													{subtask.title}
												</span>
												{subtask.assignee && (
													<span className="text-xs text-gray-500">({subtask.assignee.name})</span>
												)}
											</div>
										))}
									</div>
								</div>
							)}

							<div className="flex items-center justify-between">
								<div className="text-xs text-gray-500">
									Archived on {new Date(task.updatedAt).toLocaleDateString()}
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => unarchiveTask(task.id)}
										className="px-3 py-1 text-xs rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
									>
										Unarchive
									</button>
									<button
										onClick={() => deleteTask(task.id)}
										className="px-3 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50"
									>
										Delete Permanently
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
