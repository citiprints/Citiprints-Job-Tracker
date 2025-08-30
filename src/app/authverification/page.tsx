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
					// Redirect to signin page after successful auth check
					setTimeout(() => {
						console.log('🔄 Redirecting to /signin...');
						window.location.href = "/signin";
					}, 100);
				} else {
					console.log('❌ No user found');
					setUser(null);
					setError("Not authenticated");
					// Redirect to signin page if not authenticated
					setTimeout(() => {
						console.log('🔄 Redirecting to /signin (not authenticated)...');
						window.location.href = "/signin";
					}, 1000);
				}
			} catch (error) {
				console.error('🚨 Auth check error:', error);
				setUser(null);
				setError("Authentication error");
				// Redirect to signin page on error
				setTimeout(() => {
					console.log('🔄 Redirecting to /signin (error)...');
					window.location.href = "/signin";
				}, 1000);
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
					<p className="text-sm text-gray-500">Redirecting to sign in...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center">
				<h1 className="text-2xl font-semibold mb-4">Authentication Verified</h1>
				<p className="text-gray-600 mb-4">Welcome, {user?.name}!</p>
				<p className="text-sm text-gray-500">Redirecting to sign in...</p>
			</div>
		</div>
	);
}
