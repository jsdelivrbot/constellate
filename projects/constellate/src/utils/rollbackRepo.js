const R = require('ramda')
const dedent = require('dedent')
const chalk = require('chalk')
const { TerminalUtils, AppUtils, GitUtils, PackageUtils } = require('constellate-dev-utils')

const defaultOptions = { quiet: false }

module.exports = function rollbackRepo(options = defaultOptions) {
  const { quiet } = Object.assign({}, defaultOptions, options)
  TerminalUtils[quiet ? 'verbose' : 'info']('Rolling repo back to current...')
  const appConfig = AppUtils.getConfig()
  const targetBranch = R.path(['publishing', 'gitBranchName'], appConfig)
  try {
    const allPackages = PackageUtils.getAllPackages()
    const allPackagesArray = R.values(allPackages)
    GitUtils.resetHead()
    GitUtils.checkout('.')
    GitUtils.checkout(targetBranch)
    allPackagesArray.forEach(PackageUtils.installDeps)
    GitUtils.checkout('.')
  } catch (err) {
    TerminalUtils.error(
      dedent(`
      Ah, snap :( we failed to roll your repo back.  You may be operating on a disconnected HEAD now.  You may need to manually reset your repo back to current.

        ${chalk.blue('git status')}
        ${chalk.blue('git reset HEAD')}
        ${chalk.blue('git checkout .')}
        ${chalk.blue(`git checkout ${targetBranch}`)}

      Please report this issue so that we can try help prevent it happenning in the future.
    `),
    )
  }
}
