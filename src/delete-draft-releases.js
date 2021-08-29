const core = require('@actions/core');
const github = require('@actions/github');

const parse = require('parse-duration');

function checkDuration(releaseDate) {
  if (process.env.INPUT_THRESHOLD) {
    const threshold = process.env.INPUT_THRESHOLD;
    const seconds = parse(threshold, 's'); // duration in seconds
    return new Date(releaseDate) < new Date(Date.now() - seconds * 1000);
  }
  // If not threshold has been specified all drafts will be deleted
  return true;
}

async function run() {
  try {
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = github.context.repo;

    // List all releases
    // API Documentation: https://developer.github.com/v3/repos/releases/#list-releases-for-a-repository
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-list-releases
    // TODO: Pagination support
    const listReleasesResponse = await octokit.rest.repos.listReleases({
      owner,
      repo
    });

    if (listReleasesResponse.status !== 200) {
      throw new Error('Error listing releases');
    }

    const deleteTasks = [];
    listReleasesResponse.data.forEach((release) => {
      if (release.draft) {
        // Check if it meets the threshold
        if (checkDuration(release.created_at)) {
          // API Documentation: https://developer.github.com/v3/repos/releases/#delete-a-release
          // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-delete-release
          deleteTasks.push(octokit.rest.repos.deleteRelease({ owner, repo, release_id: release.id }));
        }
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
