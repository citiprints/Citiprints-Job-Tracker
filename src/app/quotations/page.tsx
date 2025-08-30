"use client";
import React, { useEffect, useState, useRef } from "react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

type Quotation = {
	id: string;
	title: string;
	description: string;
	status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
	priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
	createdAt: string;
	customerId?: string | null;
	customerRef?: { id: string; name: string } | null;
	customFields?: any;
	assignments?: { id: string; user: { id: string; name: string }; role: string }[];
	subtasks?: Subtask[];
	expiresAt: string; // 3 days from creation
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

type Field = { id: string; key: string; label: string; type: string; required: boolean; order: number };

// Loading skeleton component
function QuotationsSkeleton() {
	return (
		<div className="space-y-4">
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={i} className="border border-black rounded p-3">
					<div className="animate-pulse">
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2">
								<div className="w-5 h-5 bg-gray-200 rounded-full"></div>
								<div className="h-5 bg-gray-200 rounded w-48"></div>
								<div className="h-4 bg-gray-200 rounded w-16"></div>
								<div className="h-4 bg-gray-200 rounded w-20"></div>
								<div className="h-4 bg-gray-200 rounded w-24"></div>
							</div>
							<div className="h-6 bg-gray-200 rounded w-20"></div>
						</div>
						<div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
						<div className="flex gap-2">
							<div className="h-8 bg-gray-200 rounded w-16"></div>
							<div className="h-8 bg-gray-200 rounded w-16"></div>
							<div className="h-8 bg-gray-200 rounded w-16"></div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

export default function QuotationsPage() {
	const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
	const [quotations, setQuotations] = useState<Quotation[]>([]);
	const [fields, setFields] = useState<Field[]>([]);
	const [loading, setLoading] = useState(true);
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [paymentFilter, setPaymentFilter] = useState<string>("all");
	const [assignedToMeOnly, setAssignedToMeOnly] = useState<boolean>(false);
	const [title, setTitle] = useState("");
	const [desc, setDesc] = useState("");
	const [custom, setCustom] = useState<Record<string, any>>({});
	const [editingId, setEditingId] = useState<string | null>(null);
	const [viewingId, setViewingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDesc, setEditDesc] = useState("");
	const [editStatus, setEditStatus] = useState<Quotation["status"]>("PENDING");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
	const [customerId, setCustomerId] = useState<string>("");
	const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
	const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
	const [newCustomerName, setNewCustomerName] = useState("");
	const [newCustomerEmail, setNewCustomerEmail] = useState("");
	const [newCustomerPhone, setNewCustomerPhone] = useState("");
	const [newCustomerCompany, setNewCustomerCompany] = useState("");
	const [newCustomerAddress, setNewCustomerAddress] = useState("");
	const [assigneeId, setAssigneeId] = useState<string>("");
	const [files, setFiles] = useState<File[]>([]);
	const [dragActive, setDragActive] = useState(false);
	
	// Subtask state
	const [subtaskTitle, setSubtaskTitle] = useState("");
	const [subtaskAssigneeId, setSubtaskAssigneeId] = useState<string>("");
	const [subtaskDueAt, setSubtaskDueAt] = useState<string>("");
	const [subtaskEstimatedHours, setSubtaskEstimatedHours] = useState<number | null>(null);
	const [addingSubtaskToQuotationId, setAddingSubtaskToQuotationId] = useState<string | null>(null);
	
	// Subtask editing state
	const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
	const [editSubtaskTitle, setEditSubtaskTitle] = useState("");
	const [editSubtaskAssigneeId, setEditSubtaskAssigneeId] = useState<string>("");
	const [editSubtaskDueAt, setEditSubtaskDueAt] = useState<string>("");
	const [editSubtaskEstimatedHours, setEditSubtaskEstimatedHours] = useState<number | null>(null);

	// Selection state
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const countdownRef = useRef(120);
	const displayRef = useRef<HTMLSpanElement>(null);

	const AUTO_REFRESH_SECONDS = 120;

	function toggleSelect(id: string) {
		setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
	}

	function isSelected(id: string) {
		return selectedIds.includes(id);
	}

	function clearSelection() {
		setSelectedIds([]);
	}

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

	async function createNewCustomer() {
		if (!newCustomerName.trim()) return;
		
		try {
			const res = await fetch("/api/customers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: newCustomerName,
					email: newCustomerEmail,
					phone: newCustomerPhone,
					company: newCustomerCompany,
					address: newCustomerAddress
				})
			});
			
			if (res.ok) {
				const { customer } = await res.json();
				setCustomers(prev => [...prev, customer]);
				setCustomerId(customer.id);
				setShowNewCustomerForm(false);
				setNewCustomerName("");
				setNewCustomerEmail("");
				setNewCustomerPhone("");
				setNewCustomerCompany("");
				setNewCustomerAddress("");
				setError(null);
			} else {
				const errorData = await res.json();
				if (errorData.error && typeof errorData.error === 'object') {
					const zodError = errorData.error;
					if (zodError.fieldErrors) {
						const fieldErrors = Object.entries(zodError.fieldErrors)
							.map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
							.join('; ');
						setError(fieldErrors || "Validation failed");
					} else if (zodError.formErrors) {
						setError(Array.isArray(zodError.formErrors) ? zodError.formErrors.join('; ') : "Validation failed");
					} else {
						setError("Failed to create customer");
					}
				} else {
					setError(errorData.error || "Failed to create customer");
				}
			}
		} catch (err) {
			setError("Failed to create customer");
		}
	}

	async function load() {
		setLoading(true);
		try {
			const [resQuotations, resFields, resCustomers, resUsers] = await Promise.all([
				fetch("/api/quotations"),
				fetch("/api/custom-fields"),
				fetch("/api/customers"),
				fetch("/api/users")
			]);
			if (resQuotations.ok) {
				const json = await resQuotations.json();
				const loaded: Quotation[] = (json.quotations ?? []).map((q: any) => ({
					...q,
					subtasks: q.subtasks ?? [],
					customFields: typeof q.customFields === "string" ? (() => { try { return JSON.parse(q.customFields); } catch { return {}; } })() : (q.customFields || {})
				}));
				setQuotations(loaded);
			}
			if (resFields.ok) {
				const json = await resFields.json();
				setFields(json.fields ?? []);
			}
			if (resCustomers.ok) {
				const json = await resCustomers.json();
				setCustomers((json.customers ?? []).map((c: any) => ({ id: c.id, name: c.name })));
			}
			if (resUsers.ok) {
				const json = await resUsers.json();
				setUsers((json.users ?? []).map((u: any) => ({ id: u.id, name: u.name })));
			}
		} catch (error) {
			console.error("Failed to load data:", error);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	// Auto refresh with countdown - NO RE-RENDER VERSION
	useEffect(() => {
		const id = setInterval(() => {
			countdownRef.current--;
			
			// Update display directly without state change
			if (displayRef.current) {
				displayRef.current.textContent = `Auto refresh in ${countdownRef.current}s`;
			}
			
			if (countdownRef.current <= 0) {
				// Only refresh if the page is not in a loading state
				if (!loading) {
					load();
				}
				countdownRef.current = AUTO_REFRESH_SECONDS;
			}
		}, 1000);
		
		return () => clearInterval(id);
	}, [loading]);

	// Convert quotation to task
	async function convertToTask(quotation: Quotation) {
		const startDate = prompt("Enter start date (YYYY-MM-DD):");
		const dueDate = prompt("Enter due date (YYYY-MM-DD):");
		
		if (!startDate || !dueDate) {
			alert("Both start and due dates are required to convert to task.");
			return;
		}

		try {
			const taskData = {
				title: quotation.title,
				description: quotation.description || "",
				status: "TODO",
				priority: quotation.priority || "MEDIUM",
				startAt: `${startDate}T00:00`,
				dueAt: `${dueDate}T23:59`,
				customerId: quotation.customerId || undefined,
				customFields: quotation.customFields || {},
				assigneeId: quotation.assignments?.[0]?.user.id || undefined
			};
			
			const res = await fetch("/api/tasks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(taskData)
			});
			
			if (res.ok) {
				// Delete the quotation after successful conversion
				await fetch(`/api/quotations/${quotation.id}`, { method: "DELETE" });
				load(); // Reload to update the list
				setError(null);
			} else {
				const errorData = await res.json();
				setError(errorData.error || "Failed to convert quotation to task");
			}
		} catch (err) {
			setError("Failed to convert quotation to task");
		}
	}

	// Calculate days remaining for countdown
	function getDaysRemaining(expiresAt: string): number {
		const now = new Date();
		const expiry = new Date(expiresAt);
		const diffTime = expiry.getTime() - now.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return Math.max(0, diffDays);
	}

	// Check if quotation is expired
	function isExpired(expiresAt: string): boolean {
		return getDaysRemaining(expiresAt) <= 0;
	}

	return (
		<div className="container mx-auto p-4 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Quotations</h1>
				<div className="flex items-center gap-4">
					<span className="text-xs text-gray-600" ref={displayRef}>Auto refresh in {AUTO_REFRESH_SECONDS}s</span>
					<button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => { countdownRef.current = AUTO_REFRESH_SECONDS; load(); }}>Refresh now</button>
				</div>
			</div>

			{/* Create Quotation Form */}
			<div className="border border-black rounded p-4">
				<h2 className="text-lg font-semibold mb-4">Create New Quotation</h2>
				<form onSubmit={async (e) => {
					e.preventDefault();
					if (!title.trim()) return;
					
					setSubmitting(true);
					try {
						const formData = new FormData();
						formData.append("title", title);
						formData.append("description", desc);
						formData.append("customerId", customerId);
						formData.append("assigneeId", assigneeId);
						formData.append("customFields", JSON.stringify(custom));
						
						files.forEach(file => {
							formData.append("files", file);
						});

						const res = await fetch("/api/quotations", {
							method: "POST",
							body: formData
						});

						if (res.ok) {
							setTitle("");
							setDesc("");
							setCustomerId("");
							setAssigneeId("");
							setCustom({});
							setFiles([]);
							load();
							setError(null);
						} else {
							const errorData = await res.json();
							setError(errorData.error || "Failed to create quotation");
						}
					} catch (err) {
						setError("Failed to create quotation");
					} finally {
						setSubmitting(false);
					}
				}}>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<label className="block text-sm font-medium mb-1">Title *</label>
							<input 
								type="text" 
								className="w-full border rounded px-3 py-2" 
								value={title} 
								onChange={e => setTitle(e.target.value)} 
								required 
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Customer</label>
							<div className="space-y-2">
								<select 
									className="w-full border rounded px-3 py-2" 
									value={customerId} 
									onChange={e => setCustomerId(e.target.value)}
								>
									<option value="">Select customer</option>
									{customers.map(c => (
										<option key={c.id} value={c.id}>{c.name}</option>
									))}
								</select>
								<button 
									type="button" 
									className="text-sm text-blue-600 hover:text-blue-800"
									onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
								>
									{showNewCustomerForm ? "Cancel" : "+ Add new customer"}
								</button>
							</div>
						</div>
					</div>

					{/* New Customer Form */}
					{showNewCustomerForm && (
						<div className="border border-gray-300 rounded p-4 mb-4 bg-gray-50">
							<h3 className="font-medium mb-3">Add New Customer</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium mb-1">Name *</label>
									<input 
										type="text" 
										className="w-full border rounded px-3 py-2" 
										value={newCustomerName} 
										onChange={e => setNewCustomerName(e.target.value)} 
										required 
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">Email</label>
									<input 
										type="email" 
										className="w-full border rounded px-3 py-2" 
										value={newCustomerEmail} 
										onChange={e => setNewCustomerEmail(e.target.value)} 
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">Phone</label>
									<input 
										type="tel" 
										className="w-full border rounded px-3 py-2" 
										value={newCustomerPhone} 
										onChange={e => setNewCustomerPhone(e.target.value)} 
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">Company</label>
									<input 
										type="text" 
										className="w-full border rounded px-3 py-2" 
										value={newCustomerCompany} 
										onChange={e => setNewCustomerCompany(e.target.value)} 
									/>
								</div>
								<div className="md:col-span-2">
									<label className="block text-sm font-medium mb-1">Address</label>
									<textarea 
										className="w-full border rounded px-3 py-2" 
										value={newCustomerAddress} 
										onChange={e => setNewCustomerAddress(e.target.value)} 
									/>
								</div>
							</div>
							<button 
								type="button" 
								className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
								onClick={createNewCustomer}
							>
								Create Customer
							</button>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<label className="block text-sm font-medium mb-1">Description</label>
							<textarea 
								className="w-full border rounded px-3 py-2" 
								value={desc} 
								onChange={e => setDesc(e.target.value)} 
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Assign to</label>
							<select 
								className="w-full border rounded px-3 py-2" 
								value={assigneeId} 
								onChange={e => setAssigneeId(e.target.value)}
							>
								<option value="">Select user</option>
								{users.map(u => (
									<option key={u.id} value={u.id}>{u.name}</option>
								))}
							</select>
						</div>
					</div>

					{/* Custom Fields */}
					{fields.length > 0 && (
						<div className="mb-4">
							<h3 className="font-medium mb-2">Custom Fields</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{fields.map(field => (
									<div key={field.id}>
										<label className="block text-sm font-medium mb-1">
											{field.label}
											{field.required && <span className="text-red-500"> *</span>}
										</label>
										{field.type === "TEXT" && (
											<input 
												type="text" 
												className="w-full border rounded px-3 py-2" 
												value={custom[field.key] || ""} 
												onChange={e => setCustom(prev => ({ ...prev, [field.key]: e.target.value }))}
												required={field.required}
											/>
										)}
										{field.type === "NUMBER" && (
											<input 
												type="number" 
												className="w-full border rounded px-3 py-2" 
												value={custom[field.key] || ""} 
												onChange={e => setCustom(prev => ({ ...prev, [field.key]: e.target.value }))}
												required={field.required}
											/>
										)}
										{field.type === "DATE" && (
											<input 
												type="date" 
												className="w-full border rounded px-3 py-2" 
												value={custom[field.key] || ""} 
												onChange={e => setCustom(prev => ({ ...prev, [field.key]: e.target.value }))}
												required={field.required}
											/>
										)}
										{field.type === "BOOLEAN" && (
											<select 
												className="w-full border rounded px-3 py-2" 
												value={custom[field.key] || ""} 
												onChange={e => setCustom(prev => ({ ...prev, [field.key]: e.target.value }))}
												required={field.required}
											>
												<option value="">Select {field.label}</option>
												<option value="true">Yes</option>
												<option value="false">No</option>
											</select>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{/* File Upload */}
					<div className="mb-4">
						<label className="block text-sm font-medium mb-1">Attachments</label>
						<div 
							className={`border-2 border-dashed rounded p-4 text-center ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
							onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
							onDragLeave={() => setDragActive(false)}
							onDrop={(e) => { 
								e.preventDefault(); 
								setDragActive(false);
								const droppedFiles = Array.from(e.dataTransfer.files);
								setFiles(prev => [...prev, ...droppedFiles]);
							}}
						>
							<input 
								type="file" 
								multiple 
								className="hidden" 
								onChange={(e) => {
									const selectedFiles = Array.from(e.target.files || []);
									setFiles(prev => [...prev, ...selectedFiles]);
								}}
								id="file-upload"
							/>
							<label htmlFor="file-upload" className="cursor-pointer">
								<div className="text-gray-600">
									<p>Drag and drop files here, or click to select files</p>
									<p className="text-sm">Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</p>
								</div>
							</label>
						</div>
						{files.length > 0 && (
							<div className="mt-2">
								<p className="text-sm font-medium mb-1">Selected files:</p>
								<ul className="text-sm text-gray-600">
									{files.map((file, index) => (
										<li key={index} className="flex items-center justify-between">
											<span>{file.name}</span>
											<button 
												type="button" 
												className="text-red-600 hover:text-red-800"
												onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
											>
												Remove
											</button>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>

					{error && (
						<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
							{error}
						</div>
					)}

					<button 
						type="submit" 
						className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
						disabled={submitting}
					>
						{submitting ? "Creating..." : "Create Quotation"}
					</button>
				</form>
			</div>

			{/* Quotations List */}
			{loading ? (
				<QuotationsSkeleton />
			) : (
				<div className="space-y-4">
					{quotations.map(q => (
						<div key={q.id} className="border border-black rounded p-3">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<div className="w-5 h-5 rounded-full bg-gray-300"></div>
									<div className="font-medium">{q.title}</div>
									<span className="text-xs px-2 py-1 rounded" style={{ 
										background: q.status === "PENDING" ? "#fef3c7" : 
													q.status === "APPROVED" ? "#d1fae5" : 
													q.status === "REJECTED" ? "#fee2e2" : "#f3f4f6",
										color: q.status === "PENDING" ? "#92400e" : 
											   q.status === "APPROVED" ? "#065f46" : 
											   q.status === "REJECTED" ? "#991b1b" : "#374151"
									}}>
										{q.status}
									</span>
									<span className="text-xs px-2 py-1 rounded bg-gray-100">
										{q.priority}
									</span>
									{q.customerRef && (
										<span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
											{q.customerRef.name}
										</span>
									)}
									{q.assignments?.length > 0 && (
										<span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
											{q.assignments.map(a => a.user.name).join(", ")}
										</span>
									)}
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
										onClick={() => {
											setEditingId(q.id);
											setEditTitle(q.title);
											setEditDesc(q.description);
											setEditStatus(q.status);
											setCustomerId(q.customerId || "");
											setAssigneeId(q.assignments?.[0]?.user.id || "");
											setCustom(q.customFields || {});
											setFiles([]);
										}}
									>
										Edit
									</button>
									<button
										type="button"
										className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
										onClick={() => setViewingId(q.id)}
									>
										View
									</button>
									<button
										type="button"
										className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
										onClick={() => convertToTask(q)}
									>
										Convert to Task
									</button>
									<button
										type="button"
										className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
										onClick={async () => {
											if (!confirm("Delete this quotation?")) return;
											await fetch(`/api/quotations/${q.id}`, { method: "DELETE" });
											load();
										}}
									>
										Delete
									</button>
								</div>
							</div>
							
							{/* Countdown Display */}
							<div className="mb-2">
								{isExpired(q.expiresAt) ? (
									<span className="text-red-600 text-sm font-medium">EXPIRED</span>
								) : (
									<span className="text-orange-600 text-sm font-medium">
										Expires in {getDaysRemaining(q.expiresAt)} days
									</span>
								)}
							</div>

							{q.description && (
								<p className="text-gray-600 text-sm mb-2">{q.description}</p>
							)}

							{/* Custom Fields Display */}
							{q.customFields && Object.keys(q.customFields).length > 0 && (
								<div className="flex flex-wrap gap-2 mb-2">
									{q.customFields.quantity && (
										<span className="text-xs px-2 py-1 rounded bg-gray-100">
											Qty: {q.customFields.quantity}
										</span>
									)}
									{q.customFields.category && (
										<span className="text-xs px-2 py-1 rounded bg-gray-100">
											{q.customFields.category}
										</span>
									)}
								</div>
							)}

							{/* Attachments */}
							{q.customFields?.attachments && q.customFields.attachments.length > 0 && (
								<div className="flex flex-wrap gap-1 mb-2">
									{q.customFields.attachments.map((attachment: string, index: number) => (
										<a 
											key={index} 
											href={attachment.startsWith('http') ? attachment : attachment.startsWith('/api/files/') ? attachment : `/api/files/${encodeURIComponent(attachment)}`} 
											target="_blank" 
											rel="noopener noreferrer" 
											className="text-xs text-blue-600 hover:text-blue-800"
										>
											📎 {attachment.split('/').pop()}
										</a>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{/* View Modal */}
			{viewingId && (() => {
				const quotation = quotations.find(q => q.id === viewingId);
				if (!quotation) return null;
				
				return (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
						<div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
							<div className="p-6">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-xl font-bold">{quotation.title}</h2>
									<button 
										onClick={() => setViewingId(null)}
										className="text-gray-500 hover:text-gray-700"
									>
										✕
									</button>
								</div>
								
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700">Status</label>
										<span className="inline-block px-2 py-1 text-xs rounded" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>{quotation.status}</span>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">Description</label>
										<p className="text-sm text-gray-900">{quotation.description || "No description"}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">Created</label>
										<p className="text-sm text-gray-900">{new Date(quotation.createdAt).toLocaleString()}</p>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700">Expires</label>
										<p className="text-sm text-gray-900">
											{new Date(quotation.expiresAt).toLocaleDateString()}
											{isExpired(quotation.expiresAt) ? (
												<span className="text-red-600 ml-2">(EXPIRED)</span>
											) : (
												<span className="text-orange-600 ml-2">({getDaysRemaining(quotation.expiresAt)} days remaining)</span>
											)}
										</p>
									</div>
									{(quotation.customerRef || quotation.assignments?.length) && (
										<div>
											<h3 className="font-medium text-gray-900 mb-2">Customer & Assignments</h3>
											<div className="space-y-2">
												{quotation.customerRef && (
													<div>
														<label className="block text-sm font-medium text-gray-700">Customer</label>
														<p className="text-sm text-gray-900">{quotation.customerRef.name}</p>
													</div>
												)}
												{quotation.assignments && quotation.assignments.length > 0 && (
													<div>
														<label className="block text-sm font-medium text-gray-700">Assigned To</label>
														<div className="flex flex-wrap gap-1 mt-1">
															{quotation.assignments.map(a => (
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
									{quotation.customFields && Object.keys(quotation.customFields).length > 0 && (
										<div>
											<h3 className="font-medium text-gray-900 mb-2">Custom Fields</h3>
											<div className="space-y-2 text-sm">
												{quotation.customFields.quantity && (
													<div>
														<label className="block text-xs font-medium text-gray-600">Quantity</label>
														<p>{quotation.customFields.quantity}</p>
													</div>
												)}
												{quotation.customFields.category && (
													<div>
														<label className="block text-xs font-medium text-gray-600">Category</label>
														<p>{quotation.customFields.category}</p>
													</div>
												)}
											</div>
										</div>
									)}
									{/* Attachments */}
									{quotation.customFields?.attachments && quotation.customFields.attachments.length > 0 && (
										<div>
											<h3 className="font-medium text-gray-900 mb-2">Attachments</h3>
											<div className="space-y-1">
												{quotation.customFields.attachments.map((attachment: string, index: number) => (
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
					</div>
				);
			})()}
		</div>
	);
}
