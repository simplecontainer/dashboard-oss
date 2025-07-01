import {error, type Handle, redirect} from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as os from 'node:os';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);


export const clusters: Handle = async ({ event, resolve }) => {
  try {
    let contextsDir = `${os.homedir()}/.smrctl/contexts`
    const files = await readdir(contextsDir);

    let contexts = []

    for (const file of files) {
      const fullPath = path.join(contextsDir, file);
      const fileStat = await stat(fullPath);

      if (file.startsWith('.')) continue;

      if (fileStat.isFile()) {
        const content = await readFile(fullPath, 'utf-8');
        contexts.push(JSON.parse(content))
      }
    }

    event.locals.clusters = contexts
  } catch (err) {
    console.error('Error reading directory:', err);
  }

  return resolve(event)
}

export const handle: Handle = sequence(clusters)

