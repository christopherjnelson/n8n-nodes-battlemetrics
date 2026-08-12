import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: { enabled: false },
		include: [
			'nodes/**/__tests__/**/*.test.ts',
			'nodes/**/__tests__/**/*.node.ts',
			'scripts/**/__tests__/**/*.test.mjs',
		],
	},
});
