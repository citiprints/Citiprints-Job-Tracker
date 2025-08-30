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

type NotificationCounts = {
	tasks: number;
	quotations: number;
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({ tasks: 0, quotations: 0 });
	const [showInstallPrompt, setShowInstallPrompt] = useState(false);
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	// Simple auth check function
	const checkAuth = async () => {
		console.log('🔍 Checking auth...');
		try {
			const res = await fetch("/api/auth/me");
			console.log('📡 Auth response status:', res.status);
			if (res.ok) {
				const userData = await res.json();
				console.log('✅ User found:', userData.name);
				setUser(userData);
				// Load notification counts after setting user
				loadNotificationCounts(userData);
			} else {
				console.log('❌ No user found');
				setUser(null);
				setNotificationCounts({ tasks: 0, quotations: 0 });
			}
		} catch (error) {
			console.error('🚨 Auth check error:', error);
			setUser(null);
			setNotificationCounts({ tasks: 0, quotations: 0 });
		} finally {
			console.log('🏁 Auth check complete, setting loading to false');
			setLoading(false);
		}
	};

	// Load notification counts
	const loadNotificationCounts = async (currentUser?: User) => {
		const userToCheck = currentUser || user;
		if (!userToCheck) return;
		
		console.log('📊 Loading notification counts...');
		try {
			const [tasksRes, quotationsRes] = await Promise.all([
				fetch('/api/tasks?limit=1&includeArchived=false&includeQuotations=false'),
				fetch('/api/quotations')
			]);
			
			console.log('📡 Tasks response status:', tasksRes.status);
			console.log('📡 Quotations response status:', quotationsRes.status);
			
			if (tasksRes.ok) {
				const tasksData = await tasksRes.json();
				const taskCount = tasksData.totalCount || 0;
				console.log('📋 Task count:', taskCount);
				setNotificationCounts(prev => ({ ...prev, tasks: taskCount }));
			}
			
			if (quotationsRes.ok) {
				const quotationsData = await quotationsRes.json();
				const quotationCount = quotationsData.length || 0;
				console.log('📄 Quotation count:', quotationCount);
				setNotificationCounts(prev => ({ ...prev, quotations: quotationCount }));
			}
		} catch (error) {
			console.error('🚨 Failed to load notification counts:', error);
		}
	};

	// Handle logout
	const handleLogout = async () => {
		if (isLoggingOut) return;
		
		setIsLoggingOut(true);
		try {
			console.log('🚪 Logging out...');
			const res = await fetch('/api/auth/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
			});
			console.log('📡 Logout response status:', res.status);
		} catch (error) {
			console.error('🚨 Logout error:', error);
		} finally {
			console.log('🏁 Logout complete, redirecting...');
			// Always clear state and redirect
			setUser(null);
			setNotificationCounts({ tasks: 0, quotations: 0 });
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

	// PWA functions
	const dismissInstallPrompt = () => {
		setShowInstallPrompt(false);
		localStorage.setItem('installPromptDismissed', 'true');
	};

	const handleInstallClick = async () => {
		if (deferredPrompt) {
			try {
				await deferredPrompt.prompt();
			} catch (error) {
				console.error('Install prompt failed:', error);
				alert('To install this app, look for the "Add to Home Screen" option in your browser menu.');
			}
		} else {
			alert('To install this app, look for the "Add to Home Screen" option in your browser menu.');
		}
	};

	// Initialize on mount - SIMPLE AND RELIABLE
	useEffect(() => {
		// Check auth immediately
		checkAuth();

		// Initialize theme
		const savedTheme = localStorage.getItem("theme") as "light" | "dark";
		if (savedTheme) {
			setTheme(savedTheme);
			document.documentElement.setAttribute("data-theme", savedTheme);
		}

		// PWA install prompt
		const checkIfInstalled = () => {
			if (window.matchMedia('(display-mode: standalone)').matches) {
				setShowInstallPrompt(false);
				return;
			}
			
			const dismissed = localStorage.getItem('installPromptDismissed');
			if (dismissed) {
				setShowInstallPrompt(false);
				return;
			}
			
			if (window.innerWidth <= 768) {
				setTimeout(() => {
					setShowInstallPrompt(true);
				}, 2000);
			}
		};

		checkIfInstalled();

		// Event listeners
		const handleBeforeInstallPrompt = (e: any) => {
			e.preventDefault();
			setDeferredPrompt(e);
			setShowInstallPrompt(true);
		};

		const handleAppInstalled = () => {
			setShowInstallPrompt(false);
			setDeferredPrompt(null);
		};

		// Register service worker
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch(console.error);
		}

		// Add event listeners
		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		window.addEventListener('appinstalled', handleAppInstalled);

		// Cleanup
		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
		};
	}, []);

	// Simple data change listener
	useEffect(() => {
		const handleDataChange = () => {
			if (user) {
				loadNotificationCounts();
			}
		};

		window.addEventListener('dataChanged', handleDataChange);
		return () => window.removeEventListener('dataChanged', handleDataChange);
	}, [user]);

	return (
		<html lang="en" data-theme={theme}>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="description" content="Citiprints Job Tracker - Manage your jobs, tasks, and customers efficiently" />
				<meta name="theme-color" content="#000000" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="Citiprints Job Tracker" />
				<link rel="manifest" href="/manifest.json" />
				<link rel="apple-touch-icon" href="/icon-192.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
				<link rel="shortcut icon" href="/favicon.png" />
			</head>
			<body className="min-h-screen bg-background text-foreground">
				<div className="flex flex-col min-h-screen">
					{/* Header */}
					<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
												<Link href="/tasks" className="px-2 py-1 rounded border relative">
													Tasks
													{notificationCounts.tasks > 0 && (
														<span className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
															{notificationCounts.tasks > 99 ? '99+' : notificationCounts.tasks}
														</span>
													)}
												</Link>
												<Link href="/quotations" className="px-2 py-1 rounded border relative">
													Quotations
													{notificationCounts.quotations > 0 && (
														<span className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
															{notificationCounts.quotations > 99 ? '99+' : notificationCounts.quotations}
														</span>
													)}
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
													onClick={handleLogout}
													className="px-2 py-1 rounded border bg-red-50 text-red-700 hover:bg-red-100"
												>
													{isLoggingOut ? 'Logging out...' : 'Logout'}
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

					{/* PWA Install Prompt */}
					{showInstallPrompt && (
						<div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
										<span className="text-white text-lg">📱</span>
									</div>
									<div>
										<h3 className="font-semibold">Install Citiprints Job Tracker</h3>
										<p className="text-sm text-gray-600">Add to home screen for quick access</p>
									</div>
								</div>
								<div className="flex gap-2">
									<button
										onClick={dismissInstallPrompt}
										className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
									>
										Not now
									</button>
									<button
										onClick={handleInstallClick}
										className="px-3 py-1 text-sm bg-black text-white rounded hover:bg-gray-800"
									>
										Install
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</body>
		</html>
	);
}
