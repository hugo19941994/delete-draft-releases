jest.mock('@actions/core');
jest.mock('@actions/github');

const core = require('@actions/core');
const github = require('@actions/github');
const run = require('../src/delete-draft-releases');

/* eslint-disable no-undef */
describe('Delete Draft Releases', () => {
  let listReleases;
  let deleteRelease;
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  setup = (listMock, deleteMock) => {
    listReleases = jest.fn().mockReturnValue(listMock);
    listReleases.mockClear();

    deleteRelease = jest.fn().mockReturnValue({ status: 204 });
    if (deleteMock) {
      deleteRelease = jest.fn().mockReturnValue(deleteMock);
    }
    deleteRelease.mockClear();

    github.context.repo = {
      owner: 'owner',
      repo: 'repo'
    };

    const octokit = {
      rest: {
        repos: {
          listReleases,
          deleteRelease
        }
      }
    };

    github.getOctokit.mockImplementation(() => octokit);
  };

  test('Delete a single draft release', async () => {
    setup({
      data: [
        {
          id: 'releaseId',
          draft: true
        }
      ],
      status: 200
    });

    core.getInput = jest.fn();

    await run();

    expect(listReleases).toHaveBeenLastCalledWith({
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
    setup({
      data: [
        {
          id: 'releaseId1',
          draft: true
        },
        {
          id: 'releaseId2',
          draft: true
        },
        {
          id: 'releaseId3',
          draft: false
        },
        {
          id: 'releaseId4',
          draft: true
        }
      ],
      status: 200
    });

    core.getInput = jest.fn();

    await run();

    expect(listReleases).toHaveBeenLastCalledWith({
      owner: 'owner',
      repo: 'repo'
    });

    expect(deleteRelease.mock.calls).toEqual([
      [
        {
          owner: 'owner',
          repo: 'repo',
          release_id: 'releaseId1'
        }
      ],
      [
        {
          owner: 'owner',
          repo: 'repo',
          release_id: 'releaseId2'
        }
      ],
      [
        {
          owner: 'owner',
          repo: 'repo',
          release_id: 'releaseId4'
        }
      ]
    ]);
  });

  test('Error listing', async () => {
    setup({
      status: 500
    });

    core.getInput = jest.fn();

    await run();

    expect(listReleases).toHaveBeenLastCalledWith({
      owner: 'owner',
      repo: 'repo'
    });

    expect(deleteRelease).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenLastCalledWith('Error listing releases');
  });

  test('Error deleting', async () => {
    setup(
      {
        data: [
          {
            id: 'releaseId',
            draft: true
          }
        ],
        status: 200
      },
      {
        status: 500
      }
    );

    core.getInput = jest.fn();

    await run();

    expect(listReleases).toHaveBeenLastCalledWith({
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
    setup({
      data: [
        {
          id: 'releaseId1',
          draft: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'releaseId2',
          draft: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'releaseId3',
          draft: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'releaseId4',
          draft: true,
          created_at: new Date().toISOString()
        }
      ],
      status: 200
    });
    process.env.INPUT_THRESHOLD = '1d';

    core.getInput = jest.fn();

    await run();

    expect(listReleases).toHaveBeenLastCalledWith({
      owner: 'owner',
      repo: 'repo'
    });

    expect(deleteRelease.mock.calls).toEqual([]);
  });

  test('Delete drafts that meet threshold', async () => {
    setup({
      data: [
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
      ],
      status: 200
    });
    process.env.INPUT_THRESHOLD = '1s';

    core.getInput = jest.fn();

    await run();

    expect(listReleases).toHaveBeenLastCalledWith({
      owner: 'owner',
      repo: 'repo'
    });

    expect(deleteRelease.mock.calls).toEqual([
      [
        {
          owner: 'owner',
          repo: 'repo',
          release_id: 'releaseId1'
        }
      ],
      [
        {
          owner: 'owner',
          repo: 'repo',
          release_id: 'releaseId2'
        }
      ]
    ]);
  });

  test('Invalid threshold', async () => {
    setup({
      data: [
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
      ],
      status: 200
    });
    process.env.INPUT_THRESHOLD = '-1invalidthreshold';

    core.getInput = jest.fn();

    await run();

    expect(listReleases).toHaveBeenLastCalledWith({
      owner: 'owner',
      repo: 'repo'
    });

    expect(core.setFailed).toHaveBeenLastCalledWith('Error deleting releases');
  });
});
