import { Request, Response } from 'express';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';

let processRef: ChildProcessWithoutNullStreams | null = null;
let status = 'idle';
let lastOutput = '';

const scriptPath = process.env.PYTHON_AUTOMATOR_PATH || path.join(__dirname, '../../automation/wordpress_automator.py');

export const startAutomation = (req: Request, res: Response) => {
  if (processRef) {
    return res.status(400).json({ status, message: 'Automation already running' });
  }

  status = 'running';
  lastOutput = '';
  processRef = spawn('python3', [scriptPath]);

  processRef.stdout.on('data', data => {
    lastOutput = data.toString();
    console.log(lastOutput.trim());
  });

  processRef.stderr.on('data', data => {
    lastOutput = data.toString();
    console.error(lastOutput.trim());
  });

  processRef.on('close', code => {
    status = code === 0 ? 'completed' : 'error';
    processRef = null;
  });

  res.json({ status: 'started' });
};

export const getAutomationStatus = (req: Request, res: Response) => {
  res.json({ status, lastOutput });
};
