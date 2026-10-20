// Compatibility entry for older deployments; root TanStack build owns hosting output.
import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
run('bun install');
run('bun run build');
