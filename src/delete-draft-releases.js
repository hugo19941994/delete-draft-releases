const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = context.repo;

    // List all releases
    // API Documentation: https://developer.github.com/v3/repos/releases/#list-releases-for-a-repository
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-list-releases
    // TODO: Pagination support
    const listReleasesResponse = await github.repos.listReleases({
      owner,
      repo
    });

    if (listReleasesResponse.status !== 200) {
      throw new Error('Error listing releases');
    }

    const deleteTasks = [];
    listReleasesResponse.data.forEach((release) => {
      if (release.draft) {
        const releaseId = release.id;
        // Delete all draft releases
        // API Documentation: https://developer.github.com/v3/repos/releases/#delete-a-release
        // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-delete-release
        deleteTasks.push(github.repos.deleteRelease({ owner, repo, release_id: releaseId }));
      }
    });
    const results = await Promise.all(deleteTasks);
    results.forEach((result) => {
      if (result.status !== 204) {
        throw new Error('Error deleting releases');
      }
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
