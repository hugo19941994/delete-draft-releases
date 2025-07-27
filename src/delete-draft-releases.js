import { setFailed } from '@actions/core';
import { getOctokit, context } from '@actions/github';

import parse from 'parse-duration';

function checkDuration(releaseDate) {
  if (process.env.INPUT_THRESHOLD) {
    const threshold = process.env.INPUT_THRESHOLD;
    const seconds = parse(threshold, 's'); // duration in seconds
    return new Date(releaseDate) < new Date(Date.now() - seconds * 1000);
  }
  // If not threshold has been specified all drafts will be deleted
  return true;
}

export default async function run() {
  try {
    const octokit = getOctokit(process.env.GITHUB_TOKEN || '');

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = context.repo;

    // List all releases
    // API Documentation: https://developer.github.com/v3/repos/releases/#list-releases-for-a-repository
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-list-releases
    const listReleasesResponse = await octokit.paginate(octokit.rest.repos.listReleases, {
      owner,
      repo
    });

    if (!listReleasesResponse || !Array.isArray(listReleasesResponse)) {
      throw new Error(`Error listing releases`);
    }

    if (listReleasesResponse.length === 0) {
      console.log('No releases found - make sure your token has `content: write` permissions');
      return;
    }

    console.log(`Found ${listReleasesResponse.length} releases`);

    const deleteTasks = [];
    listReleasesResponse.forEach((release) => {
      if (release.draft) {
        // Check if it meets the threshold
        if (checkDuration(release.created_at)) {
          // API Documentation: https://developer.github.com/v3/repos/releases/#delete-a-release
          // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-delete-release
          console.log(`Deleting draft release ${release.id} created at ${release.created_at}`);
          deleteTasks.push(
            octokit.rest.repos.deleteRelease({
              owner,
              repo,
              release_id: release.id
            })
          );
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
    setFailed(error.message);
  }
}
