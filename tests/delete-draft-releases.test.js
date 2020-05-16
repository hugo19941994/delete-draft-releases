jest.mock('@actions/core');
jest.mock('@actions/github');

const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const run = require('../src/delete-draft-releases.js');

/* eslint-disable no-undef */
describe('Delete Draft Releases', () => {
  let listReleases;
  let deleteRelease;

  setup = (listMock, deleteMock) => {
    listReleases = jest.fn().mockReturnValue(listMock);
    listReleases.mockClear();

    deleteRelease = jest.fn().mockReturnValue({ status: 204 });
    if (deleteMock) {
      deleteRelease = jest.fn().mockReturnValue(deleteMock);
    }
    deleteRelease.mockClear();

    context.repo = {
      owner: 'owner',
      repo: 'repo'
    };

    const github = {
      repos: {
        listReleases,
        deleteRelease
      }
    };

    GitHub.mockImplementation(() => github);
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
});
