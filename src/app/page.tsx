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
			<div className="flex items-center justify-center min-h-screen px-4">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
					<p className="text-gray-600">Checking authentication...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="space-y-8 max-w-md w-full text-center">
				<h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
					Welcome to Citiprints Job Tracker
				</h1>
				<p className="text-lg text-gray-600 leading-relaxed">
					Manage your jobs, tasks, and customers efficiently
				</p>
				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<Link 
						href="/signup" 
						className="w-full sm:w-auto px-6 py-3 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition-colors"
					>
						Sign Up
					</Link>
					<Link 
						href="/signin" 
						className="w-full sm:w-auto px-6 py-3 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
					>
						Sign In
					</Link>
				</div>
			</div>
		</div>
	);
}
