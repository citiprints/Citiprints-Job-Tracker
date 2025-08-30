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

	useEffect(() => {
		// Check theme from localStorage
		const savedTheme = localStorage.getItem("theme") as "light" | "dark";
		if (savedTheme) {
			setTheme(savedTheme);
			document.documentElement.setAttribute("data-theme", savedTheme);
		}

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
				}
			} catch (error) {
				setUser(null);
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

		window.addEventListener('storage', handleStorageChange);
		window.addEventListener('focus', checkAuth);
		window.addEventListener('dataChanged', handleDataChange);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('focus', checkAuth);
			window.removeEventListener('dataChanged', handleDataChange);
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

	return (
		<html lang="en" data-theme={theme}>
			<head>
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
			<body className="min-h-screen bg-background text-foreground">
				<header className="border-b">
					<div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
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
											<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
												{notificationCounts.tasks > 99 ? '99+' : notificationCounts.tasks}
											</span>
										)}
									</Link>
									<Link href="/archive" className="px-2 py-1 rounded border">Archive</Link>
									<Link href="/quotations" className="px-2 py-1 rounded border relative">
										Quotations
										{notificationCounts.quotations > 0 && (
											<span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
												{notificationCounts.quotations > 99 ? '99+' : notificationCounts.quotations}
											</span>
										)}
									</Link>
									<Link href="/customers" className="px-2 py-1 rounded border">Customers</Link>
									<Link href="/custom-fields" className="px-2 py-1 rounded border">Custom fields</Link>
									{user.role === "ADMIN" && (
										<Link href="/users" className="px-2 py-1 rounded border">Users</Link>
									)}
									<span className="px-2 py-1 rounded border max-w-[40vw] truncate">{user.name}</span>
									<button
										onClick={toggleTheme}
										className="px-2 py-1 rounded border"
									>
										{theme === "light" ? "🌙" : "☀️"}
									</button>
									<form action="/api/auth/logout" method="post">
										<button type="submit" className="px-2 py-1 rounded border">
											Logout
										</button>
									</form>
								</>
							) : (
								<>
									<Link href="/signin" className="px-2 py-1 rounded border">Sign in</Link>
									<Link href="/signup" className="px-2 py-1 rounded border">Sign up</Link>
									<button
										onClick={toggleTheme}
										className="px-2 py-1 rounded border"
									>
										{theme === "light" ? "🌙" : "☀️"}
									</button>
								</>
							)}
						</nav>
					</div>
				</header>
				<main className="container mx-auto px-4 py-8">
					{children}
				</main>
			</body>
		</html>
	);
}
