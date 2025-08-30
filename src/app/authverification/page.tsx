"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
	id: string;
	name: string;
	email: string;
	role: string;
	active: boolean;
};

export default function AuthVerificationPage() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	useEffect(() => {
		const checkAuth = async () => {
			console.log('🔍 Auth verification page - checking auth...');
			setLoading(true);
			try {
				const res = await fetch("/api/auth/me");
				console.log('📡 Auth response status:', res.status);
				if (res.ok) {
					const userData = await res.json();
					console.log('✅ User found:', userData.name);
					setUser(userData);
				} else {
					console.log('❌ No user found');
					setUser(null);
					setError("Not authenticated");
				}
			} catch (error) {
				console.error('🚨 Auth check error:', error);
				setUser(null);
				setError("Authentication error");
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
					<p className="text-gray-600">Verifying authentication...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h1 className="text-2xl font-semibold mb-4">Authentication Error</h1>
					<p className="text-gray-600 mb-4">{error}</p>
					<p className="text-sm text-gray-500">Please sign in to continue.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center">
				<h1 className="text-3xl font-bold mb-4">Welcome to Citiprints Job Tracker</h1>
				<p className="text-xl text-gray-600 mb-6">Hello, {user?.name}!</p>
				<p className="text-lg text-gray-500 mb-8">You are successfully authenticated.</p>
				<div className="space-y-4">
					<p className="text-sm text-gray-400">Use the navigation menu above to access your dashboard, tasks, and other features.</p>
				</div>
			</div>
		</div>
	);
}
