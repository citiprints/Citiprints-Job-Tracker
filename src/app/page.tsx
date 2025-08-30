"use client";
import Link from "next/link";

export default function Home() {
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
