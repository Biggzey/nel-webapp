import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Colors for different processes
const colors = {
    server: '\x1b[36m', // Cyan
    client: '\x1b[35m', // Magenta
    reset: '\x1b[0m'
};

function startProcess(command, args, name) {
    const proc = spawn(command, args, {
        cwd: rootDir,
        shell: true,
        stdio: 'pipe'
    });

    proc.stdout.on('data', (data) => {
        process.stdout.write(`${colors[name]}[${name}] ${data}${colors.reset}`);
    });

    proc.stderr.on('data', (data) => {
        process.stderr.write(`${colors[name]}[${name}] ${data}${colors.reset}`);
    });

    proc.on('error', (error) => {
        console.error(`${colors[name]}[${name}] Error: ${error.message}${colors.reset}`);
    });

    proc.on('close', (code) => {
        if (code !== 0) {
            console.log(`${colors[name]}[${name}] Process exited with code ${code}${colors.reset}`);
        }
    });

    return proc;
}

console.log('Starting Nel Web Application...');

// Start server
const server = startProcess('npm', ['run', 'server'], 'server');

// Start client
const client = startProcess('npm', ['run', 'client'], 'client');

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.kill();
    client.kill();
    process.exit(0);
}); 