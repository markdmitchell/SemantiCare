// Installs frontend deps (incl. dev tools), builds, and copies output to root dist/ for deploy.
import { execSync } from 'node:child_process';
import { rmSync, cpSync } from 'node:fs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
run('npm --prefix frontend install --include=dev');
run('npm --prefix frontend run build');
rmSync('dist', { recursive: true, force: true });
cpSync('frontend/dist', 'dist', { recursive: true });
