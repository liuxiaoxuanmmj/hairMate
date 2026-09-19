import { spawn } from 'node:child_process';

export async function startProcess(entry, environment, readyOperation) {
  const child = spawn(process.execPath, [entry], { env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let exited = false;
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => { exited = true; resolve({ code, signal }); });
  });
  // Install the rejection handler immediately, including startup error paths.
  void completion.catch(() => {});
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Process startup timed out.')), 15_000);
      const consume = (data) => {
        output += data.toString();
        if (output.length > 65_536) { reject(new Error('Unexpected process output.')); return; }
        if (output.split('\n').some((line) => {
          try { return JSON.parse(line).operation === readyOperation; } catch { return false; }
        })) { clearTimeout(timer); resolve(undefined); }
      };
      child.stdout.on('data', consume);
      child.stderr.on('data', consume);
      child.once('error', (error) => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Process exited before readiness.')); });
    });
  } catch (error) {
    if (!exited) child.kill('SIGTERM');
    await completion;
    throw error;
  }
  return {
    get output() { return output; },
    async stop() {
      if (!exited) child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 5_000);
      try {
        const result = await completion;
        if (result.code !== 0 || result.signal) throw new Error('Process did not shut down cleanly.');
      } finally { clearTimeout(timer); }
    },
  };
}
