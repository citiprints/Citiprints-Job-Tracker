"use client";
import "./globals.css";
import { useState, useEffect } from "react";
import Link from "next/link";

type User = {
	id: string;
	name: string;
	email: string;
	role: string;
	active: boolean;
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [theme, setTheme] = useState<"light" | "dark">("light");

	// Simple auth check - this is the one that works when you click Sign In
	useEffect(() => {
		console.log('🔄 Layout mounted, checking auth...');
		
		const checkAuth = async () => {
			console.log('🔍 Starting auth check...');
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
				}
			} catch (error) {
				console.error('🚨 Auth check error:', error);
				setUser(null);
			} finally {
				console.log('🏁 Auth check complete, setting loading to false');
				setLoading(false);
			}
		};

		// Add a small delay to ensure the page is fully loaded
		const timer = setTimeout(() => {
			checkAuth();
		}, 100);

		return () => clearTimeout(timer);
	}, []);

	// Simple logout
	const handleLogout = async () => {
		console.log('🚪 Logging out...');
		setLoading(true);
		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include',
			});
			console.log('✅ Logout successful');
		} catch (error) {
			console.error('🚨 Logout error:', error);
		} finally {
			setUser(null);
			window.location.replace('/signin');
		}
	};

	// Toggle theme
	const toggleTheme = () => {
		const newTheme = theme === "light" ? "dark" : "light";
		setTheme(newTheme);
		localStorage.setItem("theme", newTheme);
		document.documentElement.setAttribute("data-theme", newTheme);
	};

	console.log('🎨 Rendering layout - user:', user?.name, 'loading:', loading);

	return (
		<html lang="en" data-theme={theme}>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="description" content="Citiprints Job Tracker" />
				<meta name="theme-color" content="#000000" />
				<link rel="manifest" href="/manifest.json" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
				<link rel="shortcut icon" href="/favicon.png" />
			</head>
			<body className="min-h-screen bg-background text-foreground">
				<div className="flex flex-col min-h-screen">
					{/* Header */}
					<header className="border-b bg-background/95 backdrop-blur">
						<div className="container mx-auto px-4 py-3">
							<div className="flex items-center justify-between">
								{/* Logo */}
								<Link href="/" className="text-xl font-bold">
									Citiprints Job Tracker
								</Link>

								{/* Navigation */}
								{loading ? (
									<div className="flex items-center gap-2 text-sm text-gray-500">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
										<span>Loading...</span>
									</div>
								) : (
									<nav className="flex items-center gap-4 text-sm">
										{user ? (
											<>
												<div className="flex items-center gap-2 text-gray-600">
													<span>Signed in as:</span>
													<span className="font-medium text-gray-800">{user.name}</span>
												</div>
												<Link href="/dashboard" className="px-2 py-1 rounded border">
													Dashboard
												</Link>
												<Link href="/tasks" className="px-2 py-1 rounded border">
													Tasks
												</Link>
												<Link href="/quotations" className="px-2 py-1 rounded border">
													Quotations
												</Link>
												<Link href="/archive" className="px-2 py-1 rounded border">
													Archive
												</Link>
												<Link href="/custom-fields" className="px-2 py-1 rounded border">
													Custom Fields
												</Link>
												<Link href="/files" className="px-2 py-1 rounded border">
													Files
												</Link>
												<button
													onClick={toggleTheme}
													className="px-2 py-1 rounded border"
												>
													{theme === "light" ? "🌙" : "☀️"}
												</button>
												<button
													type="button"
													onClick={handleLogout}
													className="px-2 py-1 rounded border bg-red-50 text-red-700 hover:bg-red-100"
												>
													Logout
												</button>
											</>
										) : (
											<>
												<Link href="/signin" className="px-2 py-1 rounded border">
													Sign In
												</Link>
												<Link href="/signup" className="px-2 py-1 rounded border bg-black text-white hover:bg-gray-800">
													Sign Up
												</Link>
											</>
										)}
									</nav>
								)}
							</div>
						</div>
					</header>

					{/* Main Content */}
					<main className="flex-1 container mx-auto px-4 py-6">
						{children}
					</main>
				</div>
			</body>
		</html>
	);
}
