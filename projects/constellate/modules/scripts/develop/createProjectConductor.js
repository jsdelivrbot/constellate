const spawn = require('cross-spawn')
const getPort = require('get-port')
const TerminalUtils = require('constellate-dev-utils/modules/terminal')
const WebpackUtils = require('../../utils/webpack')
const ProjectUtils = require('../../utils/projects')

module.exports = function createProjectConductor(project, watcher) {
  let runningServer

  // :: Project -> Promise
  function ensureNodeServerRunning() {
    return new Promise((resolve) => {
      const projectProcess = spawn(
        // Spawn a node process
        'node',
        // That runs the build entry file
        [project.paths.buildModulesEntry],
        // Ensure that output supports color etc
        // We use pipe for the error so that we can log a header for ther error.
        {
          stdio: [process.stdin, process.stdout, 'pipe'],
          cwd: project.paths.root,
        },
      )
      projectProcess.stderr.on('data', (data) => {
        TerminalUtils.error(`Error running ${project.name}`, data.toString())
      })
      projectProcess.on('close', (code) => {
        TerminalUtils.verbose(`Server process ${project.name} stopped (${code})`)
        runningServer = null
      })
      runningServer = {
        process: projectProcess,
        kill: () =>
          new Promise((killResolve) => {
            if (runningServer) {
              TerminalUtils.verbose(`Killing ${project.name}`)
              projectProcess.on('close', () => {
                TerminalUtils.verbose(`Killed ${project.name}`)
                killResolve()
              })
              projectProcess.kill('SIGTERM')
            } else {
              TerminalUtils.verbose(`No process to kill for ${project.name}`)
              killResolve()
            }
          }),
      }
      resolve()
    }).catch((err) => {
      TerminalUtils.error(`Error starting ${project.name}`, err)
    })
  }

  function ensureWebDevServerRunning() {
    return getPort()
      .then((port) => {
        TerminalUtils.verbose(`Found free port ${port} for webpack dev server`)
        return WebpackUtils.startDevServer(project, { port })
          .then((webpackDevServer) => {
            // No need for the watcher now as webpack-dev-server has an inbuilt
            // watcher.
            watcher.stop()
            return webpackDevServer
          })
          .catch((err) => {
            // Ensure we fire up a watcher so that we can track when the issue
            // is fixed.
            watcher.start()
            // Throw the error along
            throw err
          })
      })
      .then((webpackDevServer) => {
        runningServer = {
          process: webpackDevServer,
          kill: () =>
            new Promise((killResolve) => {
              if (webpackDevServer) {
                webpackDevServer.close(() => killResolve())
              } else {
                killResolve()
              }
            }),
        }
      })
  }

  function kill() {
    return runningServer ? runningServer.kill() : Promise.resolve()
  }

  return {
    // :: void -> Promise
    build: () => {
      if (project.config.role === 'client') {
        if (runningServer) {
          // We only need one running instance.
          return Promise.resolve()
        }
        TerminalUtils.verbose(`Starting a webpack-dev-server for ${project.name}`)
        return ensureWebDevServerRunning()
      }

      // else is targetting node

      return ProjectUtils.buildProject(project).then(() =>
        kill().then(() => {
          if (project.config.role === 'server') {
            return ensureNodeServerRunning()
          }
          return undefined
        }),
      )
    },
    // :: void -> Promise
    kill,
  }
}