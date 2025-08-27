"use client";
import React, { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";

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

export default function DashboardPage() {
	const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
	const [monthCursor, setMonthCursor] = useState(() => new Date());
	const [viewingId, setViewingId] = useState<string | null>(null);
	const [onlyMine, setOnlyMine] = useState(false);

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
				const res = await fetch("/api/tasks");
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
				console.error("Failed to load tasks:", error);
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	// Helper function to check if task is assigned to current user
	function isAssignedToMe(task: Task): boolean {
		if (!currentUser || !task.assignments) return false;
		return task.assignments.some(assignment => assignment.user.id === currentUser.id);
	}

	// Helper function to check if subtask is assigned to current user
	function isSubtaskAssignedToMe(subtask: Subtask): boolean {
		if (!currentUser || !subtask.assigneeId) return false;
		return subtask.assigneeId === currentUser.id;
	}

	// Consider a task "mine" if either the task or any of its subtasks is assigned to me
	function isTaskOrAnySubtaskAssignedToMe(task: Task): boolean {
		if (isAssignedToMe(task)) return true;
		if (task.subtasks && task.subtasks.length > 0) {
			return task.subtasks.some(st => isSubtaskAssignedToMe(st));
		}
		return false;
	}

	const todoTasks = tasks.filter(t => t.status === "TODO");
	const inProgressTasks = tasks.filter(t => t.status === "IN_PROGRESS");
	const doneTasks = tasks.filter(t => t.status === "DONE");
	const blockedTasks = tasks.filter(t => t.status === "BLOCKED");

	const now = new Date();
	
	// Get tasks with due dates and their subtasks
	const tasksWithDeadlines = tasks
		.filter(t => (onlyMine ? isTaskOrAnySubtaskAssignedToMe(t) : true))
		.filter(t => t.dueAt && t.status !== "DONE" && t.status !== "CANCELLED")
		.sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
		.slice(0, 5); // Show top 5 tasks with their subtasks

	// Calendar helpers
	const firstOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
	const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
	const startWeekday = firstOfMonth.getDay();
	function formatYmd(d: Date) {
		const y = d.getFullYear();
		const m = `${d.getMonth()+1}`.padStart(2, "0");
		const day = `${d.getDate()}`.padStart(2, "0");
		return `${y}-${m}-${day}`;
	}
	const tasksByDate = new Map<string, Task[]>();
	tasks.forEach(t => {
		if (!t.dueAt) return;
		const key = formatYmd(new Date(t.dueAt));
		const arr = tasksByDate.get(key) || [];
		arr.push(t);
		tasksByDate.set(key, arr);
	});

	if (loading) {
		return (
			<div className="space-y-6">
				<h1 className="text-2xl font-semibold">Dashboard</h1>
				<LoadingSkeleton />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			
			<div className="grid gap-4 md:grid-cols-4">
				<div className="card border rounded p-4">
					<div className="text-2xl font-bold">{todoTasks.length}</div>
					<div className="text-sm text-gray-600">To Do</div>
				</div>
				<div className="card border rounded p-4">
					<div className="text-2xl font-bold">{inProgressTasks.length}</div>
					<div className="text-sm text-gray-600">In Progress</div>
				</div>
				<div className="card border rounded p-4">
					<div className="text-2xl font-bold">{blockedTasks.length}</div>
					<div className="text-sm text-gray-600">Blocked</div>
				</div>
				<div className="card border rounded p-4">
					<div className="text-2xl font-bold">{doneTasks.length}</div>
					<div className="text-sm text-gray-600">Done</div>
				</div>
			</div>

			<div className="card border rounded p-4">
				<div className="flex flex-wrap items-center justify-between gap-2 mb-4">
					<h2 className="text-lg font-medium">Upcoming Deadlines</h2>
					<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
						<button
							type="button"
							className={`px-3 py-1 rounded border ${viewMode === "list" ? "bg-black text-white" : "bg-white"}`}
							onClick={() => setViewMode("list")}
						>
							List
						</button>
						<button
							type="button"
							className={`px-3 py-1 rounded border ${viewMode === "calendar" ? "bg-black text-white" : "bg-white"}`}
							onClick={() => setViewMode("calendar")}
						>
							Calendar
						</button>
						<label className="sm:ml-3 inline-flex items-center gap-2 text-sm">
							<input type="checkbox" className="rounded" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} />
							<span>Assigned to me</span>
						</label>
					</div>
				</div>

				{viewMode === "list" ? (
					<div className="space-y-4">
						{tasksWithDeadlines.map((task, index) => {
							const dueDate = new Date(task.dueAt!);
							const timeLeft = dueDate.getTime() - now.getTime();
							const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
							
							// Get subtasks with due dates for this task
							const taskSubtasks = task.subtasks?.filter(subtask => 
								subtask.dueAt && subtask.status !== "DONE"
							).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()) || [];
							
							return (
								<div key={task.id} className="border border-black rounded p-3">
									{/* Main Task */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="text-[10px] w-5 h-5 inline-flex items-center justify-center rounded-full bg-black text-white">{index + 1}</span>
											<button type="button" className="font-medium hover:underline" onClick={() => setViewingId(task.id)}>{task.title}</button>
											{task.customFields?.quantity && (
												<span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Qty: {task.customFields.quantity}</span>
											)}
											{task.customerRef?.name && (
												<span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>{task.customerRef.name}</span>
											)}
											{task.customFields?.category && (
												<span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>{task.customFields.category}</span>
											)}
											{isAssignedToMe(task) && (
												<span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Assigned to me</span>
											)}
										</div>
										<div className="flex flex-col items-end gap-1">
											<span className={`text-sm ${daysLeft < 0 ? 'text-red-600' : daysLeft <= 3 ? 'text-orange-600' : 'text-gray-600'}`}>
												{daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft} days left`}
											</span>
											<span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>{task.status}</span>
										</div>
									</div>
									
									{/* Subtasks */}
									{taskSubtasks.length > 0 && (
										<div className="mt-2 pt-2 border-t border-gray-200 ml-6 space-y-1">
											{taskSubtasks.map(subtask => {
												const subtaskDueDate = new Date(subtask.dueAt!);
												const subtaskTimeLeft = subtaskDueDate.getTime() - now.getTime();
												const subtaskDaysLeft = Math.ceil(subtaskTimeLeft / (1000 * 60 * 60 * 24));
												
												return (
													<div key={subtask.id} className="flex items-center justify-between text-sm">
														<div className="flex items-center gap-2">
															<span className="text-gray-600">• {subtask.title}</span>
															{isSubtaskAssignedToMe(subtask) && (
																<span className="text-[10px] px-1 py-0.5 rounded-full bg-blue-100 text-blue-800">Assigned to me</span>
															)}
														</div>
														<div className="flex flex-col items-end gap-1">
															<span className={`text-xs ${subtaskDaysLeft < 0 ? 'text-red-600' : subtaskDaysLeft <= 3 ? 'text-orange-600' : 'text-gray-500'}`}>
																{subtaskDaysLeft < 0 ? `${Math.abs(subtaskDaysLeft)} days overdue` : subtaskDaysLeft === 0 ? 'Due today' : `${subtaskDaysLeft} days left`}
									</span>
															<span className="text-[10px] px-1 py-0.5 rounded-full bg-green-100 text-green-800">{subtask.status}</span>
														</div>
													</div>
												);
											})}
										</div>
									)}
									
								</div>
							);
						})}
					</div>
				) : (
					<div>
						<div className="flex items-center justify-between mb-3">
							<div className="text-sm font-medium">{monthCursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
							<div className="flex items-center gap-2">
								<button type="button" className="px-2 py-1 rounded border" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>{"<"}</button>
								<button type="button" className="px-2 py-1 rounded border" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>{">"}</button>
							</div>
						</div>
						<div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-600 mb-1">
							<div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
						</div>
						<div className="grid grid-cols-7 gap-2">
							{Array.from({ length: startWeekday }).map((_, i) => (
								<div key={`blank-${i}`} />
							))}
							{Array.from({ length: daysInMonth }).map((_, dIdx) => {
								const day = dIdx + 1;
								const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
								const key = formatYmd(date);
								const dayTasks = tasks
									.filter(t => (onlyMine ? isTaskOrAnySubtaskAssignedToMe(t) : true))
									.filter(t => {
										if (!t.dueAt) return false;
										const d = new Date(t.dueAt);
										return (
											d.getFullYear() === monthCursor.getFullYear() &&
											d.getMonth() === monthCursor.getMonth() &&
											d.getDate() === day
										);
									});
								return (
									<div key={key} className="border rounded p-2 text-left min-h-20">
										<div className="text-xs font-medium mb-1">{day}</div>
										<div className="space-y-1">
											{dayTasks.slice(0,3).map(t => (
												<button type="button" key={t.id} onClick={() => setViewingId(t.id)} className="w-full text-left text-[10px] px-1 py-0.5 rounded bg-blue-50 text-blue-800 truncate hover:underline">{t.title}</button>
											))}
											{dayTasks.length > 3 && (
												<div className="text-[10px] text-gray-500">+{dayTasks.length - 3} more</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* View Task Modal */}
			{viewingId && (() => {
				const task = tasks.find(t => t.id === viewingId);
				if (!task) return null;
				return (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold">Task Details</h2>
								<button type="button" className="text-gray-500 hover:text-gray-700" onClick={() => setViewingId(null)}>✕</button>
							</div>
							<div className="space-y-4">
								<div>
									<h3 className="font-medium text-gray-900 mb-2">Basic Information</h3>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700">Title</label>
											<p className="text-sm text-gray-900">{task.title}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700">Status</label>
											<span className="inline-block px-2 py-1 text-xs rounded" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>{task.status}</span>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700">Description</label>
											<p className="text-sm text-gray-900">{task.description || "No description"}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700">Created</label>
											<p className="text-sm text-gray-900">{new Date(task.createdAt).toLocaleString()}</p>
										</div>
									</div>
								</div>
								{(task.startAt || task.dueAt) && (
									<div>
										<h3 className="font-medium text-gray-900 mb-2">Dates</h3>
										<div className="grid grid-cols-2 gap-4">
											{task.startAt && (
												<div>
													<label className="block text-sm font-medium text-gray-700">Start Date</label>
													<p className="text-sm text-gray-900">{new Date(task.startAt).toLocaleString()}</p>
												</div>
											)}
											{task.dueAt && (
												<div>
													<label className="block text-sm font-medium text-gray-700">Due Date</label>
													<p className="text-sm text-gray-900">{new Date(task.dueAt).toLocaleString()}</p>
												</div>
											)}
										</div>
									</div>
								)}
								{(task.customerRef || task.assignments?.length) && (
									<div>
										<h3 className="font-medium text-gray-900 mb-2">Customer & Assignments</h3>
										<div className="space-y-2">
											{task.customerRef && (
												<div>
													<label className="block text-sm font-medium text-gray-700">Customer</label>
													<p className="text-sm text-gray-900">{task.customerRef.name}</p>
												</div>
											)}
											{task.assignments && task.assignments.length > 0 && (
												<div>
													<label className="block text-sm font-medium text-gray-700">Assigned To</label>
													<div className="flex flex-wrap gap-1 mt-1">
														{task.assignments.map(a => (
															<span key={a.id} className="text-xs px-2 py-1 rounded" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
																{a.user.name}
															</span>
														))}
													</div>
												</div>
											)}
										</div>
									</div>
								)}
								{task.customFields && Object.keys(task.customFields).length > 0 && (
									<div>
										<h3 className="font-medium text-gray-900 mb-2">Custom Fields</h3>
										<div className="space-y-2 text-sm">
											{task.customFields.quantity && (
												<div>
													<label className="block text-xs font-medium text-gray-600">Quantity</label>
													<p>{task.customFields.quantity}</p>
												</div>
											)}
											{task.customFields.category && (
												<div>
													<label className="block text-xs font-medium text-gray-600">Category</label>
													<p>{task.customFields.category}</p>
												</div>
											)}
										</div>
									</div>
								)}
								{/* Rigid Box specific fields */}
								{task.customFields?.category === "Rigid Boxes" && (
									<div className="border rounded p-3 bg-gray-50">
										<h4 className="font-medium text-sm mb-2">Rigid Box Specifications</h4>
										<div className="grid grid-cols-2 gap-3 text-sm">
											{task.customFields.boxType && (
												<div>
													<label className="block text-xs font-medium text-gray-600">Box Type</label>
													<p className="text-gray-900">{task.customFields.boxType}</p>
												</div>
											)}
											{task.customFields.size && (
												<div>
													<label className="block text-xs font-medium text-gray-600">Size</label>
													<p className="text-gray-900">
														{task.customFields.size}
														{task.customFields.existingSize && " (Existing size)"}
													</p>
												</div>
											)}
											{task.customFields.topOuter && (
												<div>
													<label className="block text-xs font-medium text-gray-600">Top Outer</label>
													<p className="text-gray-900">{task.customFields.topOuter}</p>
												</div>
											)}
											{task.customFields.topInner && (
												<div>
													<label className="block text-xs font-medium text-gray-600">Top Inner</label>
													<p className="text-gray-900">{task.customFields.topInner}</p>
												</div>
											)}
											{task.customFields.bottomOuter && (
												<div>
													<label className="block text-xs font-medium text-gray-600">Bottom Outer</label>
													<p className="text-gray-900">{task.customFields.bottomOuter}</p>
												</div>
											)}
											{task.customFields.bottomInner && (
												<div>
													<label className="block text-xs font-medium text-gray-600">Bottom Inner</label>
													<p className="text-gray-900">{task.customFields.bottomInner}</p>
												</div>
											)}
											{task.customFields.hasPartition && (
												<div className="col-span-2">
													<label className="block text-xs font-medium text-gray-600">Partition</label>
													<p className="text-gray-900">
														Yes{task.customFields.partitionDescription && ` - ${task.customFields.partitionDescription}`}
													</p>
												</div>
											)}
										</div>
									</div>
								)}

								{/* Attachments */}
								{task.customFields?.attachments && task.customFields.attachments.length > 0 && (
									<div>
										<h3 className="font-medium text-gray-900 mb-2">Attachments</h3>
										<div className="space-y-1">
											{task.customFields.attachments.map((attachment: string, index: number) => (
												<div key={index} className="flex items-center gap-2">
													<a href={attachment.startsWith('http') ? attachment : attachment.startsWith('/api/files/') ? attachment : `/api/files/${encodeURIComponent(attachment)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">📎 {attachment}</a>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				);
			})()}
		</div>
	);
}
