"use client";
import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";

type NotificationCounts = {
	tasks: number;
	quotations: number;
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [user, setUser] = useState<any>(null);
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [loading, setLoading] = useState(true);
	const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({ tasks: 0, quotations: 0 });
	const [showInstallPrompt, setShowInstallPrompt] = useState(false);
	const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	useEffect(() => {
		// Check theme from localStorage
		const savedTheme = localStorage.getItem("theme") as "light" | "dark";
		if (savedTheme) {
			setTheme(savedTheme);
			document.documentElement.setAttribute("data-theme", savedTheme);
		}

		// Register service worker for PWA
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				navigator.serviceWorker.register('/sw.js')
					.then((registration) => {
						console.log('SW registered: ', registration);
					})
					.catch((registrationError) => {
						console.log('SW registration failed: ', registrationError);
					});
			});
		}

		// Check if app is already installed
		const checkIfInstalled = () => {
			if (window.matchMedia('(display-mode: standalone)').matches) {
				console.log('App is already installed');
				return;
			}
			
			// Show install prompt for mobile users who haven't dismissed it
			if (window.innerWidth <= 768 && !localStorage.getItem('installPromptDismissed')) {
				console.log('Showing install prompt for mobile user');
				setTimeout(() => {
					setShowInstallPrompt(true);
				}, 2000);
			}
		};

		checkIfInstalled();

		// Check if user is logged in
		async function checkAuth() {
			try {
				const res = await fetch("/api/auth/me");
				if (res.ok) {
					const userData = await res.json();
					setUser(userData);
					// Load notification counts if user is logged in
					loadNotificationCounts();
				} else {
					setUser(null);
					setNotificationCounts({ tasks: 0, quotations: 0 });
				}
			} catch (error) {
				console.error('Auth check error:', error);
				setUser(null);
				setNotificationCounts({ tasks: 0, quotations: 0 });
			} finally {
				setLoading(false);
			}
		}
		checkAuth();

		// Listen for auth state changes (e.g., after login/logout)
		const handleStorageChange = () => {
			checkAuth();
		};

		// Listen for data changes to refresh notification counts
		const handleDataChange = () => {
			if (user) {
				loadNotificationCounts();
			}
		};

		// Handle PWA install prompt
		const handleBeforeInstallPrompt = (e: any) => {
			console.log('beforeinstallprompt event fired');
			// Prevent the mini-infobar from appearing on mobile
			e.preventDefault();
			// Stash the event so it can be triggered later
			setDeferredPrompt(e);
			// Show the install prompt immediately
			setShowInstallPrompt(true);
		};

		// Handle successful installation
		const handleAppInstalled = () => {
			console.log('App was installed successfully');
			setShowInstallPrompt(false);
			setDeferredPrompt(null);
		};

		window.addEventListener('storage', handleStorageChange);
		window.addEventListener('focus', checkAuth);
		window.addEventListener('dataChanged', handleDataChange);
		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		window.addEventListener('appinstalled', handleAppInstalled);
		window.addEventListener('resize', checkIfInstalled);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('focus', checkAuth);
			window.removeEventListener('dataChanged', handleDataChange);
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
			window.removeEventListener('resize', checkIfInstalled);
		};
	}, [user]);

	async function loadNotificationCounts() {
		try {
			const [tasksRes, quotationsRes] = await Promise.all([
				fetch("/api/tasks"),
				fetch("/api/quotations")
			]);

			if (tasksRes.ok) {
				const tasksData = await tasksRes.json();
				const activeTasks = (tasksData.tasks || []).filter((task: any) => {
					const customFields = typeof task.customFields === "string" 
						? JSON.parse(task.customFields) 
						: task.customFields || {};
					return task.status !== "ARCHIVED" && !customFields.isQuotation;
				});
				setNotificationCounts(prev => ({ ...prev, tasks: activeTasks.length }));
			}

			if (quotationsRes.ok) {
				const quotationsData = await quotationsRes.json();
				setNotificationCounts(prev => ({ ...prev, quotations: quotationsData.quotations?.length || 0 }));
			}
		} catch (error) {
			console.error("Failed to load notification counts:", error);
		}
	}

	const toggleTheme = () => {
		const newTheme = theme === "light" ? "dark" : "light";
		setTheme(newTheme);
		localStorage.setItem("theme", newTheme);
		document.documentElement.setAttribute("data-theme", newTheme);
	};

	const handleInstallClick = async () => {
		if (deferredPrompt) {
			try {
				// Show the install prompt
				deferredPrompt.prompt();
				
				// Wait for the user to respond to the prompt
				const { outcome } = await deferredPrompt.userChoice;
				
				if (outcome === 'accepted') {
					console.log('User accepted the install prompt');
				} else {
					console.log('User dismissed the install prompt');
				}
				
				// Clear the deferredPrompt
				setDeferredPrompt(null);
				setShowInstallPrompt(false);
			} catch (error) {
				console.error('Error showing install prompt:', error);
				// Fallback to manual installation instructions
				showManualInstallInstructions();
			}
		} else {
			// No deferred prompt available, show manual instructions
			showManualInstallInstructions();
		}
	};

	const showManualInstallInstructions = () => {
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
		const isAndroid = /Android/.test(navigator.userAgent);
		
		let instructions = '';
		
		if (isIOS) {
			instructions = 'To install: Tap the Share button (📤) in Safari, then tap "Add to Home Screen"';
		} else if (isAndroid) {
			instructions = 'To install: Tap the menu (⋮) in Chrome, then tap "Add to Home Screen"';
		} else {
			instructions = 'To install: Look for the install option in your browser menu';
		}
		
		alert(`Installation Instructions:\n\n${instructions}`);
		setShowInstallPrompt(false);
	};

	const dismissInstallPrompt = () => {
		setShowInstallPrompt(false);
		// Don't show again for this session
		localStorage.setItem('installPromptDismissed', 'true');
	};

	// Debug function to manually show install prompt
	const debugShowInstallPrompt = () => {
		console.log('Debug: Manually showing install prompt');
		console.log('Deferred prompt available:', !!deferredPrompt);
		console.log('User agent:', navigator.userAgent);
		console.log('Screen width:', window.innerWidth);
		setShowInstallPrompt(true);
	};

	// Add debug function to window for testing
	if (typeof window !== 'undefined') {
		(window as any).debugShowInstallPrompt = debugShowInstallPrompt;
	}

	const handleLogout = async () => {
		if (isLoggingOut) return; // Prevent multiple clicks
		
		setIsLoggingOut(true);
		try {
			const res = await fetch('/api/auth/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include', // Include cookies
			});

			// Always clear user state and redirect, regardless of response
			setUser(null);
			setNotificationCounts({ tasks: 0, quotations: 0 });
			
			// Force a hard redirect to clear any cached state
			window.location.replace('/');
			
		} catch (error) {
			console.error('Logout error:', error);
			// Still clear user state and redirect
			setUser(null);
			setNotificationCounts({ tasks: 0, quotations: 0 });
			window.location.replace('/');
		} finally {
			setIsLoggingOut(false);
		}
	};

	return (
		<html lang="en" data-theme={theme}>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="description" content="Task management and job tracking for Citiprints" />
				<meta name="theme-color" content="#000000" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="Citiprints" />
				<link rel="manifest" href="/manifest.json" />
				<link rel="apple-touch-icon" href="/icon-192.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
				<link rel="shortcut icon" href="/favicon.png" />
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								const theme = localStorage.getItem('theme') || 'light';
								document.documentElement.setAttribute('data-theme', theme);
							})();
						`,
					}}
				/>
			</head>
			<body className="min-h-screen bg-gray-50">
				<header className="bg-white shadow-sm border-b">
					<div className="container mx-auto px-4 py-3">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<Link href="/" className="text-xl font-bold">
								Citiprints Job Tracker
							</Link>
							
							<nav className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto text-sm sm:text-base">
								{user ? (
									<>
										<Link href="/dashboard" className="px-2 py-1 rounded border">Dashboard</Link>
										<Link href="/tasks" className="px-2 py-1 rounded border relative">
											Tasks
											{notificationCounts.tasks > 0 && (
												<span className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
													{notificationCounts.tasks > 99 ? '99+' : notificationCounts.tasks}
												</span>
											)}
										</Link>
										<Link href="/archive" className="px-2 py-1 rounded border">Archive</Link>
										<Link href="/quotations" className="px-2 py-1 rounded border relative">
											Quotations
											{notificationCounts.quotations > 0 && (
												<span className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
													{notificationCounts.quotations > 99 ? '99+' : notificationCounts.quotations}
												</span>
											)}
										</Link>
										<Link href="/customers" className="px-2 py-1 rounded border">Customers</Link>
										<Link href="/custom-fields" className="px-2 py-1 rounded border">Custom fields</Link>
										<Link href="/files" className="px-2 py-1 rounded border">Files</Link>
										{user.role === "ADMIN" && (
											<Link href="/users" className="px-2 py-1 rounded border">Users</Link>
										)}
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
										<Link href="/signin" className="px-2 py-1 rounded border">Sign in</Link>
										<Link href="/signup" className="px-2 py-1 rounded border bg-black text-white hover:bg-gray-800">
											Sign up
										</Link>
									</>
								)}
							</nav>
						</div>
					</div>
				</header>

				<main className="container mx-auto px-4 py-8">
					{children}
				</main>

				{/* Install Prompt */}
				{showInstallPrompt && (
					<div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-3">
								<div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
									<span className="text-white text-xl">📱</span>
								</div>
								<div>
									<h3 className="font-semibold text-gray-900">Install App</h3>
									<p className="text-sm text-gray-600">Add to home screen for quick access</p>
									{deferredPrompt && (
										<p className="text-xs text-green-600 mt-1">✓ Browser supports installation</p>
									)}
								</div>
							</div>
							<div className="flex space-x-2">
								<button
									onClick={handleInstallClick}
									className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
								>
									{deferredPrompt ? 'Install' : 'Install'}
								</button>
								<button
									onClick={dismissInstallPrompt}
									className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
								>
									✕
								</button>
							</div>
						</div>
					</div>
				)}
			</body>
		</html>
	);
}
