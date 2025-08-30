"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
	const [user, setUser] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		async function checkAuth() {
			try {
				const res = await fetch("/api/auth/me");
				if (res.ok) {
					const userData = await res.json();
					setUser(userData);
					// Redirect to dashboard if user is logged in
					router.push("/dashboard");
				} else {
					setUser(null);
				}
			} catch (error) {
				setUser(null);
			} finally {
				setLoading(false);
			}
		}
		checkAuth();
	}, [router]);

	const logout = useCallback(async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		location.reload();
	}, []);

	if (loading) {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Welcome to Citiprints Job Tracker</h1>
				<div className="animate-pulse">
					<div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
					<div className="h-4 bg-gray-200 rounded w-1/3"></div>
				</div>
			</div>
		);
	}

	if (user) {
		// This should not render as we redirect to dashboard, but just in case
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-semibold">Welcome, {user.name}!</h1>
				<p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
					Redirecting to dashboard...
				</p>
				<Link href="/dashboard" className="btn rounded px-3 py-2 bg-black text-white hover:bg-gray-800">
					Go to Dashboard
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-md mx-auto text-center">
			<h1 className="text-3xl font-bold">Welcome to Citiprints Job Tracker</h1>
			<p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
				Manage your jobs, tasks, and customers efficiently
			</p>
			<div className="flex flex-col sm:flex-row gap-4 justify-center">
				<Link 
					href="/signup" 
					className="btn rounded px-6 py-3 bg-black text-white hover:bg-gray-800"
				>
					Sign Up
				</Link>
				<Link 
					href="/signin" 
					className="btn rounded px-6 py-3 border border-gray-300 hover:bg-gray-50"
				>
					Sign In
				</Link>
			</div>
		</div>
	);
}
