import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const nextBin = 'C:\\Users\\USER\\certiforge\\apps\\web\\node_modules\\next\\dist\\bin\\next.js';
const cwd = 'C:\\Users\\USER\\certiforge\\apps\\web';

const env = { ...process.env, DATABASE_URL: 'postgresql://certiforge:certiforge123@localhost:5432/certiforge', SESSION_SECRET: 'secret123' };

console.log('Starting Next.js dev server...');
console.log('Next bin:', nextBin);
console.log('CWD:', cwd);

const child = spawn(process.execPath, [nextBin, 'dev', '--port', '3000', '--hostname', '0.0.0.0'], {
  cwd: cwd,
  env: env,
  stdio: 'inherit'
});

child.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});
