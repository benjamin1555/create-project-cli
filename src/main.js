import fs from 'fs';
import path from 'path'
import { promisify } from 'util';
import chalk from 'chalk';
import ncp from 'ncp';
import execa from 'execa';
import Listr from 'listr';
import { projectInstall } from 'pkg-install';

const access = promisify(fs.access);
const copy = promisify(ncp);

async function copyTemplateFiles(options) {
  return copy(options.templateDirectory, options.targetDirectory, {
    clobber: false
  });
}

async function initGit(options) {
  const result = await execa('git', ['init'], {
    cwd: options.targetDirectory
  });
  if (result.failed) {
    return Promise.reject(new Error('Failed to initialize git'));
  }
  return;
}

export async function createProject(options) {
  options = {
    ...options,
    targetDirectory: options.targetDirectory || process.cwd()
  };

  const currentFileUrl = import.meta.url;
  const templateDir = path.resolve(
    new URL(currentFileUrl).pathname, '../../templates', options.template.toLowerCase()
  );
  options.templateDirectory = templateDir;

  try {
    await access(templateDir, fs.constants.R_OK);
  } catch (err) {
    console.error('%s Invalid template name', chalk.red.bold('ERROR'));
    process.exit(1);
  }

  const tasks = new Listr([
    {
      title: 'Copy project files',
      task() {
       return copyTemplateFiles(options);
      }
    },
    {
      title: 'Initialize git',
      task() {
        return initGit(options);
      },
      enabled() {
        return options.git;
      }
    },
    {
      title: 'Install dependencies',
      task() {
        return projectInstall({
          cwd: options.targetDirectory
        });
      },
      skip() {
        return !options.runInstall ? 'Pass --install to automatically install dependencies' : undefined;
      }
    }
  ]);

  await tasks.run();
  console.log('%s Project ready', chalk.green.bold('DONE'));
  return true;
}
