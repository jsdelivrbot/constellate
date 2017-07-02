const pSeries = require('p-series')
const ChildProcessUtils = require('constellate-dev-utils/modules/childProcess')
const TerminalUtils = require('constellate-dev-utils/modules/terminal')
const ProjectUtils = require('constellate-dev-utils/modules/projects')

module.exports = function update(projects) {
  // Unlink projects first as this messes with the package resolving.
  ProjectUtils.unlinkAllProjects()

  // Then run update for each the projects
  return (
    pSeries(
      projects.map(project => () => {
        TerminalUtils.info(`Checking for updates on ${project.name}'s dependencies`)
        ChildProcessUtils.execSync('npm-check', ['-u'], {
          cwd: project.paths.root,
          stdio: 'inherit',
        })
      }),
    )
      // Link the projects again
      .then(() => ProjectUtils.linkAllProjects())
  )
}
