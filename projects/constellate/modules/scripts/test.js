const path = require('path')
const pify = require('pify')
const fs = pify(require('fs-extra'))
const R = require('ramda')
const ChildProcessUtils = require('constellate-dev-utils/modules/childProcess')
const TerminalUtils = require('constellate-dev-utils/modules/terminal')
const AppUtils = require('constellate-dev-utils/modules/app')

module.exports = async function test({ watch, passThroughArgs }) {
  TerminalUtils.title('Running test...')

  const jestPath = path.resolve(process.cwd(), './node_modules/.bin/jest')
  const jestExists = await fs.pathExists(jestPath)
  if (!jestExists) {
    throw new Error('Could not find Jest. You may need to reinstall your dependencies.')
  }

  const appConfig = AppUtils.getConfig()
  const preTestHook = R.path(['commands', 'test', 'pre'], appConfig)
  const postTestHook = R.path(['commands', 'test', 'pre'], appConfig)

  if (preTestHook) {
    TerminalUtils.info('Running the pre test hook')
    await preTestHook()
  }

  const args = watch ? ['--watch'] : passThroughArgs

  ChildProcessUtils.execSync(jestPath, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  })

  if (postTestHook) {
    TerminalUtils.info('Running the post test hook')
    await postTestHook()
  }
}