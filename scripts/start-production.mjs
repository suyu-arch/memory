import { spawn } from 'node:child_process';

let stopping = false;
let worker;

function run(packageName) {
  return spawn('pnpm', ['--filter', packageName, 'start'], {
    env: process.env,
    stdio: 'inherit',
  });
}

function startWorker() {
  worker = run('@togetherly/worker');
  worker.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(`Worker exited (${signal ?? code ?? 'unknown'}); restarting in 5 seconds`);
    setTimeout(startWorker, 5_000);
  });
}

const api = run('@togetherly/api');
startWorker();

api.on('exit', (code, signal) => {
  stopping = true;
  worker?.kill('SIGTERM');
  console.error(`API exited (${signal ?? code ?? 'unknown'})`);
  process.exit(code ?? 1);
});

function shutdown(signal) {
  stopping = true;
  api.kill(signal);
  worker?.kill(signal);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
