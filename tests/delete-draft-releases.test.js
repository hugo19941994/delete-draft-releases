import { describe, test, beforeEach, afterAll, vi, expect } from 'vitest';
import * as core from '@actions/core';
import * as github from '@actions/github';
import run from '../src/delete-draft-releases';

vi.mock('@actions/core');
vi.mock('@actions/github');

describe('Delete Draft Releases', () => {
  let paginate;
  let listReleases;
  let deleteRelease;
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
    process.env.GITHUB_TOKEN = 'fake-token';
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const setup = (listMock, deleteMock) => {
    listReleases = vi.fn().mockReturnValue(listMock);
    listReleases.mockClear();

    deleteRelease = vi.fn().mockReturnValue({ status: 204 });
    if (deleteMock) {
      deleteRelease = vi.fn().mockReturnValue(deleteMock);
    }
    deleteRelease.mockClear();

    // Mock paginate to return the data directly
    paginate = vi.fn().mockResolvedValue(listMock);
    paginate.mockClear();

    Object.defineProperty(github, 'context', {
      value: {
        repo: {
          owner: 'owner',
          repo: 'repo'
        }
      }
    });

    const octokit = {
      paginate,
      rest: {
        repos: {
          listReleases,
          deleteRelease
        }
      }
    };

    vi.spyOn(github, 'getOctokit').mockImplementation(() => octokit);
  };

  test('Delete a single draft release', async () => {
    setup([
      {
        id: 'releaseId',
        draft: true
      }
    ]);

    await run();

    expect(paginate).toHaveBeenLastCalledWith(listReleases, {
      owner: 'owner',
      repo: 'repo'
    });

    expect(deleteRelease).toHaveBeenLastCalledWith({
      owner: 'owner',
      repo: 'repo',
      release_id: 'releaseId'
    });
  });

  test('Delete multiple draft releases', async () => {
    setup([
      { id: 'releaseId1', draft: true },
      { id: 'releaseId2', draft: true },
      { id: 'releaseId3', draft: false },
      { id: 'releaseId4', draft: true }
    ]);

    await run();

    expect(paginate).toHaveBeenLastCalledWith(listReleases, {
      owner: 'owner',
      repo: 'repo'
    });

    expect(deleteRelease.mock.calls).toEqual([
      [{ owner: 'owner', repo: 'repo', release_id: 'releaseId1' }],
      [{ owner: 'owner', repo: 'repo', release_id: 'releaseId2' }],
      [{ owner: 'owner', repo: 'repo', release_id: 'releaseId4' }]
    ]);
  });

  test('Error listing', async () => {
    setup(null); // Return null to trigger the error

    await run();

    expect(paginate).toHaveBeenLastCalledWith(listReleases, {
      owner: 'owner',
      repo: 'repo'
    });

    expect(deleteRelease).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenLastCalledWith('Error listing releases');
  });

  test('Error deleting', async () => {
    setup([{ id: 'releaseId', draft: true }], { status: 500 });

    await run();

    expect(paginate).toHaveBeenLastCalledWith(listReleases, {
      owner: 'owner',
      repo: 'repo'
    });

    expect(deleteRelease).toHaveBeenLastCalledWith({
      owner: 'owner',
      repo: 'repo',
      release_id: 'releaseId'
    });

    expect(core.setFailed).toHaveBeenLastCalledWith('Error deleting releases');
  });

  test('No drafts meet threshold', async () => {
    setup([
      { id: 'releaseId1', draft: true, created_at: new Date().toISOString() },
      { id: 'releaseId2', draft: true, created_at: new Date().toISOString() },
      {
        id: 'releaseId3',
        draft: false,
        created_at: new Date().toISOString()
      },
      { id: 'releaseId4', draft: true, created_at: new Date().toISOString() }
    ]);
    process.env.INPUT_THRESHOLD = '1d';

    await run();

    expect(paginate).toHaveBeenLastCalledWith(listReleases, {
      owner: 'owner',
      repo: 'repo'
    });

    expect(deleteRelease.mock.calls).toEqual([]);
  });

  test('Delete drafts that meet threshold', async () => {
    setup([
      {
        id: 'releaseId1',
        draft: true,
        created_at: new Date(Date.now() - 5000).toISOString()
      },
      {
        id: 'releaseId2',
        draft: true,
        created_at: new Date(Date.now() - 5000).toISOString()
      },
      {
        id: 'releaseId3',
        draft: false,
        created_at: new Date(Date.now() - 5000).toISOString()
      },
      {
        id: 'releaseId4',
        draft: true,
        created_at: new Date(Date.now()).toISOString()
      }
    ]);
    process.env.INPUT_THRESHOLD = '1s';

    await run();

    expect(paginate).toHaveBeenLastCalledWith(listReleases, {
      owner: 'owner',
      repo: 'repo'
    });

    expect(deleteRelease.mock.calls).toEqual([
      [{ owner: 'owner', repo: 'repo', release_id: 'releaseId1' }],
      [{ owner: 'owner', repo: 'repo', release_id: 'releaseId2' }]
    ]);
  });

  test('Invalid threshold', async () => {
    setup([
      {
        id: 'releaseId1',
        draft: true,
        created_at: new Date(Date.now() - 5000).toISOString()
      },
      {
        id: 'releaseId2',
        draft: true,
        created_at: new Date(Date.now() - 5000).toISOString()
      },
      {
        id: 'releaseId3',
        draft: false,
        created_at: new Date(Date.now() - 5000).toISOString()
      },
      {
        id: 'releaseId4',
        draft: true,
        created_at: new Date(Date.now()).toISOString()
      }
    ]);
    process.env.INPUT_THRESHOLD = '-1invalidthreshold';

    await run();

    expect(paginate).toHaveBeenLastCalledWith(listReleases, {
      owner: 'owner',
      repo: 'repo'
    });

    expect(core.setFailed).toHaveBeenLastCalledWith('Error deleting releases');
  });
});
