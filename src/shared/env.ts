export function getRequiredEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`${name} is required`);
	}
	return value;
}

export function getOptionalEnv(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value ? value : undefined;
}

export function getIntegerEnv(name: string, fallback: number): number {
	const raw = getOptionalEnv(name);
	if (!raw) return fallback;

	const value = Number.parseInt(raw, 10);
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`${name} must be a positive integer`);
	}

	return value;
}
