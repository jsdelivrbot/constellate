const R = require('ramda')
const execa = require('execa')
const { TerminalUtils, AppUtils } = require('constellate-dev-utils')

module.exports = async function exec({ passThroughArgs }) {
  if (passThroughArgs == null || passThroughArgs.length === 0) {
    TerminalUtils.error('You must supply a cmd to exec')
  }

  const appConfig = AppUtils.getConfig()

  const preExecHook = R.path(['commands', 'exec', 'pre'], appConfig)
  if (preExecHook) {
    TerminalUtils.info('Running the pre exec hook')
    await preExecHook()
  }

  const [cmd, ...args] = passThroughArgs
  const fullCmd = passThroughArgs.join(' ')
  TerminalUtils.verbose(`Executing ${cmd} with args: [${args.join(', ')}]`)

  try {
    await execa.shell(fullCmd, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
    })
  } catch (err) {
    TerminalUtils.verbose(err)
  }

  const postExecHook = R.path(['commands', 'exec', 'post'], appConfig)
  if (postExecHook) {
    TerminalUtils.info('Running the post exec hook')
    await postExecHook()
  }
}
