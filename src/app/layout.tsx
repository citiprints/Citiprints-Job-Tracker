"use client";
import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [user, setUser] = useState<any>(null);
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [loading, setLoading] = useState(true);

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

		window.addEventListener('storage', handleStorageChange);
		window.addEventListener('focus', checkAuth);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('focus', checkAuth);
		};
	}, []);

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
					<div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
						<Link href="/" className="text-xl font-bold">
							Citiprints Job Tracker
						</Link>
						<nav className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto text-sm sm:text-base">
							{user ? (
								<>
									<Link href="/dashboard" className="px-2 py-1 rounded border">Dashboard</Link>
									<Link href="/tasks" className="px-2 py-1 rounded border">Tasks</Link>
									<Link href="/quotations" className="px-2 py-1 rounded border">Quotations</Link>
									<Link href="/archive" className="px-2 py-1 rounded border">Archive</Link>
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
