import { spawn } from 'child_process';
import { cwd } from 'process';

const child = spawn('node', [
  'C:\\Users\\USER\\certiforge\\apps\\web\\node_modules\\next\\dist\\bin\\next',
  'dev', '--port', '3000', '--hostname', '0.0.0.0'
], {
  cwd: 'C:\\Users\\USER\\certiforge\\apps\\web',
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: 'postgresql://certiforge:certiforge123@localhost:5432/certiforge',
    SESSION_SECRET: 'secret123',
  }
});

child.on('error', (err) => {
  console.error('Failed to start:', err);
});
