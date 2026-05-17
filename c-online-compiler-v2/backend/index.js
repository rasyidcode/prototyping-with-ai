const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const TEMP_DIR = path.join(__dirname, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

app.post('/run', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    const jobId = uuidv4();
    const jobDir = path.join(TEMP_DIR, jobId);
    fs.mkdirSync(jobDir);

    const sourceFile = path.join(jobDir, 'main.c');
    fs.writeFileSync(sourceFile, code);

    // Compilation Command
    const compileCmd = `docker run --rm -v "${jobDir}":/app gcc-sandbox gcc /app/main.c -o /app/main`;

    exec(compileCmd, (compileErr, compileStdout, compileStderr) => {
        if (compileErr) {
            cleanup(jobDir);
            return res.json({
                success: false,
                error: 'Compilation Error',
                details: compileStderr || compileStdout
            });
        }

        // Execution Command with limits
        // --memory 50m: limit memory to 50MB
        // --cpus 0.5: limit CPU usage
        // --net none: disable network access
        // --pids-limit 10: prevent fork bombs
        const runCmd = `docker run --rm -v "${jobDir}":/app --memory 50m --cpus 0.5 --net none --pids-limit 10 gcc-sandbox /app/main`;

        const startTime = Date.now();
        const timeout = 5000; // 5 seconds timeout

        const child = exec(runCmd, { timeout }, (runErr, runStdout, runStderr) => {
            const duration = Date.now() - startTime;
            cleanup(jobDir);

            if (runErr) {
                if (runErr.killed) {
                    return res.json({
                        success: false,
                        error: 'Time Limit Exceeded',
                        duration
                    });
                }
                return res.json({
                    success: false,
                    error: 'Execution Error',
                    details: runStderr || runStdout,
                    duration
                });
            }

            res.json({
                success: true,
                output: runStdout,
                stderr: runStderr,
                duration
            });
        });
    });
});

function cleanup(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch (err) {
        console.error(`Error cleaning up directory ${dir}:`, err);
    }
}

app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
});
