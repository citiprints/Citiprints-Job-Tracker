"use client";
import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

type Quotation = {
	id: string;
	title: string;
	description: string;
	status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED" | "ARCHIVED" | "CLIENT_TO_REVERT";
	priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
	createdAt: string;
	customerId?: string | null;
	customerRef?: { id: string; name: string } | null;
	customFields?: any;
	assignments?: { id: string; user: { id: string; name: string }; role: string }[];
};

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
						</div>
						<div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
					</div>
				</div>
			))}
		</div>
	);
}

export default function QuotationsPage() {
	const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
	const [quotations, setQuotations] = useState<Quotation[]>([]);
	const [loading, setLoading] = useState(true);
	const [viewingId, setViewingId] = useState<string | null>(null);

	// Get current user
	useEffect(() => {
		async function getCurrentUser() {
			const res = await fetch("/api/auth/me");
			if (res.ok) {
				const user = await res.json();
				setCurrentUser(user);
			} else {
				redirect("/signin");
			}
		}
		getCurrentUser();
	}, []);

	async function load() {
		setLoading(true);
		try {
			const res = await fetch("/api/quotations");
			if (res.ok) {
				const json = await res.json();
				const loaded: Quotation[] = (json.quotations ?? []).map((q: any) => ({
					...q,
					customFields: typeof q.customFields === "string" ? (() => { try { return JSON.parse(q.customFields); } catch { return {}; } })() : (q.customFields || {})
				}));
				setQuotations(loaded);
			}
		} catch (error) {
			console.error("Failed to load quotations:", error);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	if (!currentUser) {
		return <QuotationsSkeleton />;
	}

	return (
		<div className="container mx-auto p-4">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Quotations</h1>
				<div className="flex items-center gap-4">
					<span className="text-sm text-gray-600">
						{quotations.length} quotation{quotations.length !== 1 ? 's' : ''}
					</span>
				</div>
			</div>

			{loading ? (
				<QuotationsSkeleton />
			) : quotations.length === 0 ? (
				<div className="text-center py-8">
					<p className="text-gray-500">No quotations found.</p>
				</div>
			) : (
				<div className="space-y-4">
					{quotations.map((q) => (
						<div key={q.id} className="border border-black rounded p-3">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-blue-500"></div>
									<h3 className="font-medium">{q.title}</h3>
									<span className={`text-xs px-2 py-1 rounded ${
										q.status === "DONE" ? "bg-green-100 text-green-800" :
										q.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
										q.status === "BLOCKED" ? "bg-red-100 text-red-800" :
										"bg-gray-100 text-gray-800"
									}`}>
										{q.status.replace("_", " ")}
									</span>
									<span className={`text-xs px-2 py-1 rounded ${
										q.priority === "URGENT" ? "bg-red-100 text-red-800" :
										q.priority === "HIGH" ? "bg-orange-100 text-orange-800" :
										q.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
										"bg-green-100 text-green-800"
									}`}>
										{q.priority}
									</span>
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
										onClick={() => setViewingId(viewingId === q.id ? null : q.id)}
									>
										{viewingId === q.id ? "Hide" : "View"}
									</button>
								</div>
							</div>

							{/* Badges below title */}
							<div className="flex flex-wrap gap-2 mb-2 text-xs text-gray-600">
								{q.customFields?.quantity && (
									<span>Qty: {q.customFields.quantity}</span>
								)}
								{q.customerRef && (
									<span>Customer: {q.customerRef.name}</span>
								)}
								{q.customFields?.category && (
									<span>Category: {q.customFields.category}</span>
								)}
								{q.assignments && q.assignments.length > 0 && (
									<span>Assigned to: {q.assignments.map(a => a.user.name).join(", ")}</span>
								)}
								{q.assignments?.some(a => a.user.id === currentUser.id) && (
									<span className="text-blue-600">Assigned to me</span>
								)}
							</div>

							{/* Description */}
							{q.description && (
								<p className="text-sm text-gray-600 mb-2">{q.description}</p>
							)}

							{/* Detailed view */}
							{viewingId === q.id && (
								<div className="mt-4 p-3 border border-gray-200 rounded bg-gray-50">
									<h4 className="font-medium text-sm mb-2">Quotation Details</h4>
									
									{/* Category-specific fields */}
									{q.customFields?.category === "Rigid Boxes" && (
										<div className="space-y-2 text-sm">
											{q.customFields?.boxType && <div><strong>Box Type:</strong> {q.customFields.boxType}</div>}
											{q.customFields?.size && <div><strong>Size:</strong> {q.customFields.size}</div>}
											{q.customFields?.topOuter && <div><strong>Top Outer:</strong> {q.customFields.topOuter}</div>}
											{q.customFields?.topInner && <div><strong>Top Inner:</strong> {q.customFields.topInner}</div>}
											{q.customFields?.bottomOuter && <div><strong>Bottom Outer:</strong> {q.customFields.bottomOuter}</div>}
											{q.customFields?.bottomInner && <div><strong>Bottom Inner:</strong> {q.customFields.bottomInner}</div>}
											{q.customFields?.hasPartition && <div><strong>Partition:</strong> {q.customFields.partitionDescription || "Yes"}</div>}
										</div>
									)}

									{q.customFields?.category === "Cake Boxes" && (
										<div className="space-y-2 text-sm">
											{q.customFields?.size && <div><strong>Size:</strong> {q.customFields.size}</div>}
											{q.customFields?.hasWindow && <div><strong>Window:</strong> {q.customFields.windowDetails || "Yes"}</div>}
											{q.customFields?.innerPrinting && <div><strong>Inner Printing:</strong> {q.customFields.innerPrintingDetails || "Yes"}</div>}
										</div>
									)}

									{q.customFields?.category === "Paper Bags" && (
										<div className="space-y-2 text-sm">
											{q.customFields?.size && <div><strong>Size:</strong> {q.customFields.size}</div>}
											{q.customFields?.innerPrinting && <div><strong>Inner Printing:</strong> {q.customFields.innerPrintingDetails || "Yes"}</div>}
											{q.customFields?.rope && <div><strong>Rope:</strong> {q.customFields.rope}</div>}
										</div>
									)}

									{q.customFields?.category === "Stickers" && (
										<div className="space-y-2 text-sm">
											{q.customFields?.size && <div><strong>Size:</strong> {q.customFields.size}</div>}
											{q.customFields?.shape && <div><strong>Shape:</strong> {q.customFields.shape}</div>}
											{q.customFields?.material && <div><strong>Material:</strong> {q.customFields.material}</div>}
										</div>
									)}

									{q.customFields?.category === "Cards" && (
										<div className="space-y-2 text-sm">
											{q.customFields?.size && <div><strong>Size:</strong> {q.customFields.size}</div>}
											{q.customFields?.sides && <div><strong>Sides:</strong> {q.customFields.sides === "single" ? "Single side" : "Double side"}</div>}
											{q.customFields?.material && <div><strong>Material:</strong> {q.customFields.material}</div>}
										</div>
									)}

									{q.customFields?.category === "Invitation" && (
										<div className="space-y-2 text-sm">
											{q.customFields?.size && <div><strong>Size:</strong> {q.customFields.size}</div>}
											{q.customFields?.material && <div><strong>Material:</strong> {q.customFields.material}</div>}
											{q.customFields?.envelope && <div><strong>Envelope:</strong> {q.customFields.envelope}</div>}
										</div>
									)}

									{/* Attachments */}
									{q.customFields?.attachments && q.customFields.attachments.length > 0 && (
										<div className="mt-3">
											<strong className="text-sm">Attachments:</strong>
											<div className="mt-1 space-y-1">
												{q.customFields.attachments.map((attachment: string, index: number) => (
													<div key={index} className="text-sm">
														<a 
															href={attachment} 
															target="_blank" 
															rel="noopener noreferrer"
															className="text-blue-600 hover:underline"
														>
															{attachment.split('/').pop()}
														</a>
													</div>
												))}
											</div>
										</div>
									)}

									{/* Created date */}
									<div className="mt-3 text-sm text-gray-500">
										Created: {new Date(q.createdAt).toLocaleDateString()}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
