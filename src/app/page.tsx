"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const res = await fetch("/api/auth/me");
				if (res.ok) {
					// User is authenticated, redirect to auth verification
					window.location.href = "/authverification";
					return;
				}
			} catch (error) {
				console.error('Auth check error:', error);
			} finally {
				setLoading(false);
			}
		};

		checkAuth();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
					<p className="text-gray-600">Checking authentication...</p>
				</div>
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
