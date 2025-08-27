"use client";
import { useCallback } from "react";

export default function Home() {
	const logout = useCallback(async () => {
		await fetch("/api/auth/logout", { method: "POST" });
		location.reload();
	}, []);

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Home</h1>
			<p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Use Sign up, then Sign in to start.</p>
			<button onClick={logout} className="btn rounded px-3 py-2">Logout</button>
		</div>
	);
}
