import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';

let serverProcess: ChildProcess | null = null;

// Resolve paths relative to this file's location to ensure robustness
const utilsDir = __dirname;
const projectRoot = path.resolve(utilsDir, '../../../../../'); // Adjust if depth changes
const serverScriptRelativePath = 'packages/plugin-play/test/e2e/api-plugin/server.ts';
const serverScriptPath = path.join(projectRoot, serverScriptRelativePath);

export function startServer(port: number = 2040, envVars: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (serverProcess && !serverProcess.killed) {
      console.warn('Server process may already be running.');
      // Potentially try to kill existing before starting new, or just resolve if it's responsive.
      // For now, we'll proceed, but this could lead to port conflicts if not handled.
      // A more robust check would ping the port or check PID.
    }

    console.log(`Starting server: tsx ${serverScriptPath} on port ${port}`);
    serverProcess = spawn('tsx', [serverScriptPath], {
      cwd: projectRoot, // Run from project root
      stdio: ['ignore', 'pipe', 'pipe'], // stdin, stdout, stderr
      env: { ...process.env, PORT: String(port), NODE_ENV: 'test', ...envVars },
      detached: false,
    });

    let stdoutData = '';
    let stderrData = '';

    serverProcess.stdout?.on('data', (data) => {
      const chunk = data.toString();
      stdoutData += chunk;
      // console.log(`[Server STDOUT]: ${chunk.trim()}`);
      // TODO: Implement a more robust readiness check.
      // e.g., if (chunk.includes(`Server listening on port ${port}`)) { resolve(); }
    });

    serverProcess.stderr?.on('data', (data) => {
      const chunk = data.toString();
      stderrData += chunk;
      console.error(`[Server STDERR]: ${chunk.trim()}`);
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server process:', err);
      serverProcess = null;
      reject(err);
    });

    serverProcess.on('exit', (code, signal) => {
      // console.log(`Server process exited with code ${code}, signal ${signal}.`);
      // Only reject if it exits prematurely and wasn't killed by stopServer
      // This logic is tricky because resolve() might have already been called by the timeout.
      // And stopServer() will also cause an exit.
      if (code !== 0 && code !== null && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
        // console.error(`Server process exited unexpectedly. Stderr: ${stderrData}`);
      }
      serverProcess = null;
    });

    // Fallback: Resolve after a delay. Replace with stdout parsing for robustness.
    const readyTimeout = setTimeout(() => {
      if (serverProcess && !serverProcess.killed && serverProcess.exitCode === null) {
        console.log(`Server process (PID: ${serverProcess.pid}) started. Assuming ready after delay.`);
        resolve();
      } else {
        const message = `Server process failed to start or exited prematurely. Exit code: ${serverProcess?.exitCode}, Signal: ${serverProcess?.signal}.\nStdout:\n${stdoutData}\nStderr:\n${stderrData}`;
        console.error(message);
        reject(new Error(message));
      }
    }, 7000); // Increased delay, adjust as needed or replace with stdout check

    // Ensure timeout is cleared if process errors out or exits early
    serverProcess.on('error', () => clearTimeout(readyTimeout));
    // serverProcess.on('exit', () => clearTimeout(readyTimeout)); // Careful: this might clear timeout before resolve if exit is normal
  });
}

export function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess || serverProcess.killed) {
      // console.log('Server process not running or already killed.');
      resolve();
      return;
    }

    const pid = serverProcess.pid;
    // console.log(`Attempting to stop server process (PID: ${pid})...`);

    serverProcess.once('exit', () => {
      // console.log(`Server process (PID: ${pid}) has exited.`);
      serverProcess = null;
      resolve();
    });

    const gracefullyStopped = serverProcess.kill('SIGTERM');

    if (!gracefullyStopped) {
        console.error(`Failed to send SIGTERM to server process (PID: ${pid}). It might have already exited.`);
        // If SIGTERM fails to send (e.g. process already dead), try SIGKILL if process object still exists
        if (serverProcess && !serverProcess.killed) {
            serverProcess.kill('SIGKILL'); // Force kill
        }
        resolve(); // Resolve as we've done what we can
        return;
    }

    // Fallback timeout if SIGTERM doesn't lead to exit promptly
    const killTimeout = setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        console.warn(`Server process (PID: ${pid}) did not terminate after SIGTERM. Sending SIGKILL.`);
        serverProcess.kill('SIGKILL');
      }
      // The 'exit' handler should still fire and call resolve.
      // But as a safety, resolve here too if it somehow gets stuck.
      // However, this might lead to resolve being called twice. Better to rely on 'exit'.
      // resolve();
    }, 5000); // 5 seconds for graceful shutdown before SIGKILL

    // Clear the kill timeout if the process exits normally from SIGTERM
    serverProcess.once('exit', () => clearTimeout(killTimeout));
  });
}
