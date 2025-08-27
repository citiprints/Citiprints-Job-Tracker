export function LoadingSkeleton() {
	return (
		<div className="space-y-4 animate-pulse">
			{/* Header skeleton */}
			<div className="flex items-center justify-between">
				<div className="h-8 bg-gray-200 rounded w-1/3"></div>
				<div className="h-8 bg-gray-200 rounded w-24"></div>
			</div>
			
			{/* Content skeletons */}
			{[...Array(5)].map((_, i) => (
				<div key={i} className="border border-gray-200 rounded p-4">
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<div className="w-5 h-5 bg-gray-200 rounded-full"></div>
							<div className="h-5 bg-gray-200 rounded w-48"></div>
							<div className="h-4 bg-gray-200 rounded w-16"></div>
							<div className="h-4 bg-gray-200 rounded w-20"></div>
						</div>
						<div className="h-4 bg-gray-200 rounded w-20"></div>
					</div>
					<div className="h-4 bg-gray-200 rounded w-32"></div>
				</div>
			))}
		</div>
	);
}

export function TaskLoadingSkeleton() {
	return (
		<div className="space-y-4 animate-pulse">
			{/* Task creation form skeleton */}
			<div className="border border-gray-200 rounded p-4 mb-6">
				<div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
				<div className="space-y-3">
					<div className="h-10 bg-gray-200 rounded"></div>
					<div className="h-10 bg-gray-200 rounded"></div>
					<div className="grid grid-cols-2 gap-3">
						<div className="h-10 bg-gray-200 rounded"></div>
						<div className="h-10 bg-gray-200 rounded"></div>
					</div>
					<div className="h-10 bg-gray-200 rounded"></div>
				</div>
			</div>
			
			{/* Tasks list skeleton */}
			{[...Array(3)].map((_, i) => (
				<div key={i} className="border border-black rounded p-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-5 h-5 bg-gray-200 rounded-full"></div>
							<div className="h-5 bg-gray-200 rounded w-48"></div>
							<div className="h-4 bg-gray-200 rounded w-16"></div>
							<div className="h-4 bg-gray-200 rounded w-20"></div>
						</div>
						<div className="h-4 bg-gray-200 rounded w-20"></div>
					</div>
					<div className="h-4 bg-gray-200 rounded w-32 mt-2"></div>
				</div>
			))}
		</div>
	);
}

export function CustomerLoadingSkeleton() {
	return (
		<div className="space-y-4 animate-pulse">
			{/* Customer creation form skeleton */}
			<div className="border border-gray-200 rounded p-4 mb-6">
				<div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
				<div className="grid grid-cols-2 gap-3">
					<div className="h-10 bg-gray-200 rounded"></div>
					<div className="h-10 bg-gray-200 rounded"></div>
					<div className="h-10 bg-gray-200 rounded"></div>
					<div className="h-10 bg-gray-200 rounded"></div>
					<div className="h-10 bg-gray-200 rounded col-span-2"></div>
					<div className="h-10 bg-gray-200 rounded col-span-2"></div>
				</div>
			</div>
			
			{/* Customers list skeleton */}
			{[...Array(4)].map((_, i) => (
				<div key={i} className="border border-gray-200 rounded p-4">
					<div className="flex items-center justify-between mb-2">
						<div className="h-5 bg-gray-200 rounded w-32"></div>
						<div className="flex gap-2">
							<div className="h-8 bg-gray-200 rounded w-16"></div>
							<div className="h-8 bg-gray-200 rounded w-16"></div>
						</div>
					</div>
					<div className="space-y-1">
						<div className="h-4 bg-gray-200 rounded w-48"></div>
						<div className="h-4 bg-gray-200 rounded w-32"></div>
						<div className="h-4 bg-gray-200 rounded w-40"></div>
					</div>
				</div>
			))}
		</div>
	);
}
