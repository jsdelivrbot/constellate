const TerminalUtils = require('./terminal')
const path = require('path')
const fs = require('fs-extra')

function resolvePackage(resolvedPackageName) {
  const packagePath = path.resolve(process.cwd(), `./node_modules/${resolvedPackageName}`)
  TerminalUtils.verbose(`Trying to resolve package ${packagePath}`)
  let resolvedPackage
  try {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    resolvedPackage = require(packagePath)
  } catch (err) {
    TerminalUtils.verbose(`Failed to resolve package ${packagePath}`)
    TerminalUtils.verbose(err)
    TerminalUtils.verbose(`Trying to resolve package ${packagePath} as a symlink`)
    // EEK! Could be a symlink?
    try {
      fs.lstatSync(packagePath)
      const symLinkPath = fs.readlinkSync(path)
      // eslint-disable-next-line global-require,import/no-dynamic-require
      resolvedPackage = require(symLinkPath)
    } catch (symErr) {
      // DO nothing
    }
  }

  TerminalUtils.verbose(`Resolved package ${packagePath}`)

  return resolvedPackage
}

module.exports = {
  resolvePackage,
}