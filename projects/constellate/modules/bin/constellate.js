#!/usr/bin/env node
/* eslint-disable no-case-declarations */
/* eslint-disable global-require */

const program = require('commander')
const TerminalUtils = require('constellate-dev-utils/modules/terminal')
const GitUtils = require('constellate-dev-utils/modules/git')

const packageJson = require('../../package.json')

const loadEnvVars = require('../utils/loadEnvVars')
const configureGracefulExit = require('../utils/configureGracefulExit')
const rollbackRepo = require('../utils/rollbackRepo')

const noop = () => undefined

TerminalUtils.header(`constellate v${packageJson.version || '0.0.0-develop'}`)

// Ensure the project is a git repo.
if (!GitUtils.isInitialized()) {
  throw new Error('Constellate requires that your project is initialised as a Git repository.')
}

program.version(packageJson.version || '0.0.0-develop')

const createAction = ({
  defaultEnv = 'production',
  resolveScript,
  gracefulExit = noop,
  errorMsg,
  preScript,
}) => async (...args) => {
  try {
    configureGracefulExit(gracefulExit)
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = defaultEnv
    }
    loadEnvVars()
    if (preScript) {
      await preScript()
    }
    const script = resolveScript(args)
    await script()
    process.exit(0)
  } catch (err) {
    TerminalUtils.error('Argh! An unexpected error has occurred', err)
    if (errorMsg) {
      TerminalUtils.error(errorMsg)
    }
    gracefulExit()
    process.exit(1)
  }
}

program.command('build').description('Builds the projects').action(
  createAction({
    resolveScript: () => require('../scripts/build'),
  }),
)

program
  .command('clean')
  .description('Deletes the build output and node_modules files for projects')
  .action(
    createAction({
      resolveScript: () => require('../scripts/clean'),
    }),
  )

program.command('deploy').description('Deploys the projects').action(
  createAction({
    resolveScript: () => require('../scripts/deploy'),
    gracefulExit: rollbackRepo,
    errorMsg:
      'Your projects may not have been fully deployed. Please check your expected deployment targets.',
  }),
)

program.command('develop').description('Runs a development environment for the projects').action(
  createAction({
    defaultEnv: 'development',
    preScript: () => {
      TerminalUtils.title('Kickstarting development hyperengine...')
      console.log(`\n${require('../utils/getCarlSaganQuote')()}\n`)
      return new Promise(resolve => setTimeout(resolve, 3000))
    },
    resolveScript: () => require('../scripts/develop'),
  }),
)

program.command('install').description('Installs the dependencies for every project').action(
  createAction({
    // We should not use "production" as a NODE_ENV because then only our
    // production dependencies will get installed, i.e. no devDependencies
    defaultEnv: 'development',
    resolveScript: () => require('../scripts/install'),
  }),
)

program.command('link-projects').description('Links project(s) to a project').action(
  createAction({
    resolveScript: () => require('../scripts/linkProjects'),
  }),
)

program
  .command('publish')
  .description("Creates and publishes a new version of your application and it's projects")
  .action(
    createAction({
      resolveScript: () => require('../scripts/publish'),
      gracefulExit: rollbackRepo,
    }),
  )

program
  .command('test')
  .description('Runs the tests')
  .option('-w, --watch', 'Runs in watch mode')
  .action(
    createAction({
      defaultEnv: 'test',
      resolveScript: (args) => {
        let watch
        let passThroughArgs = []
        if (args.length === 1) {
          const options = args[0]
          watch = options.watch
        } else {
          passThroughArgs = args.slice(0, args.length - 1)
        }
        const test = require('../scripts/test')
        return () => test({ passThroughArgs, watch })
      },
    }),
  )

program
  .command('update')
  .description('Runs an interactive dependency update process for every project')
  .action(
    createAction({
      // We should not use "production" as a NODE_ENV because then only our
      // production dependencies will get installed, i.e. no devDependencies
      defaultEnv: 'development',
      resolveScript: () => require('../scripts/update'),
    }),
  )

// If the user passes no args, or an unknown arg then we will show the help
const showHelp = () => {
  program.outputHelp(x => console.log(x))
  process.exit(0)
}
program.command('*').action(showHelp)
if (!process.argv.slice(2).length) {
  showHelp()
}

program.parse(process.argv)

// Prevent node process from exiting. (until CTRL + C or process.exit is called)
// We do this to allow our scripts to respont to process exit events and do
// cleaning up etc.
const preventScriptExit = () => {
  (function wait() {
    // eslint-disable-next-line no-constant-condition
    if (true) setTimeout(wait, 1000)
  }())
}
preventScriptExit()
