import {describe, it, expect, vi, beforeEach} from 'vitest'
import {addContributor} from '../index.js'
import {add} from '../add.js'
import {prompt} from '../prompt.js'
import {configFile} from '../../util/index.js'
import * as repo from '../../repo/index.js'
import {optionsFixture} from './fixtures/index.js'

vi.mock('../add.js')
vi.mock('../prompt.js')
vi.mock('../../util/index.js')
vi.mock('../../repo/index.js')

describe('addContributor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add a new contributor successfully', async () => {
    const username = 'newuser'
    const contributions = 'code,docs'
    const options = optionsFixture({config: 'mock-config'})
    const mockedUpdatedContributors = [
      ...options.contributors,
      {
        login: 'newuser',
        name: 'New User',
        avatar_url: 'avatar.url',
        profile: 'profile.url',
        contributions: ['code', 'docs'],
      },
    ]

    // Setup mocks
    prompt.mockResolvedValue({
      username: 'newuser',
      contributions: ['code', 'docs'],
    })

    add.mockResolvedValue(mockedUpdatedContributors)

    // Execute fn
    const result = await addContributor(options, username, contributions)

    // Validate behaviour
    expect(prompt).toHaveBeenCalledWith(options, username, contributions)

    expect(add).toHaveBeenCalledWith(
      options,
      'newuser',
      ['code', 'docs'],
      repo.getUserInfo,
    )

    expect(configFile.writeContributors).toHaveBeenCalledWith(
      options.config,
      mockedUpdatedContributors,
    )

    expect(result).toEqual({
      username: 'newuser',
      contributions: ['code', 'docs'],
      contributors: mockedUpdatedContributors,
      newContributor: true,
    })
  })

  it('should update an existing contributor', async () => {
    const username = 'existinguser'
    const contributions = 'code,bug'
    const options = {
      config: 'mock-config',
      contributors: [
        {login: 'existinguser', name: 'Existing User', contributions: ['code']},
        {login: 'anotheruser', name: 'Another User', contributions: ['docs']},
      ],
    }
    const mockedUpdatedContributors = [
      {
        login: 'existinguser',
        name: 'Existing User',
        contributions: ['code', 'bug'],
      },
      {login: 'anotheruser', name: 'Another User', contributions: ['docs']},
    ]

    // Setup mocks
    prompt.mockResolvedValue({
      username: 'existinguser',
      contributions: ['code', 'bug'],
    })

    add.mockResolvedValue(mockedUpdatedContributors)

    // Execute fn
    const result = await addContributor(options, username, contributions)

    // Validate behaviour
    expect(prompt).toHaveBeenCalledWith(options, username, contributions)

    expect(add).toHaveBeenCalledWith(
      options,
      'existinguser',
      ['code', 'bug'],
      repo.getUserInfo,
    )

    expect(configFile.writeContributors).toHaveBeenCalledWith(
      options.config,
      mockedUpdatedContributors,
    )

    expect(result).toEqual({
      username: 'existinguser',
      contributions: ['code', 'bug'],
      contributors: mockedUpdatedContributors,
      newContributor: false,
    })
  })

  it('should handle case-insensitive existing contributor detection', async () => {
    const username = 'EXISTINGUSER'
    const contributions = 'code,docs'
    const options = {
      config: 'mock-config',
      contributors: [
        {login: 'existinguser', name: 'Existing User', contributions: ['code']},
        {login: 'anotheruser', name: 'Another User', contributions: ['docs']},
      ],
    }
    const mockedUpdatedContributors = [
      {
        login: 'existinguser',
        name: 'Existing User',
        contributions: ['code', 'docs'],
      },
      {login: 'anotheruser', name: 'Another User', contributions: ['docs']},
    ]

    // Setup mocks
    prompt.mockResolvedValue({
      username: 'EXISTINGUSER',
      contributions: ['code', 'docs'],
    })

    add.mockResolvedValue(mockedUpdatedContributors)

    // Execute fn
    const result = await addContributor(options, username, contributions)

    // Validate behaviour
    expect(result.newContributor).toBe(false)
    expect(result).toEqual({
      username: 'EXISTINGUSER',
      contributions: ['code', 'docs'],
      contributors: mockedUpdatedContributors,
      newContributor: false,
    })
  })

  it('should handle prompt errors', async () => {
    const username = 'testuser'
    const contributions = 'code'
    const options = optionsFixture({config: 'mock-config'})
    const promptError = new Error('Prompt failed')

    // Setup mocks
    prompt.mockRejectedValue(promptError)

    // Execute fn and validate behaviour
    await expect(addContributor(options, username, contributions)).rejects.toBe(
      promptError,
    )

    expect(add).not.toHaveBeenCalled()
    expect(configFile.writeContributors).not.toHaveBeenCalled()
  })

  it('should handle add function errors', async () => {
    const username = 'testuser'
    const contributions = 'code'
    const options = optionsFixture({config: 'mock-config'})
    const addError = new Error('Add failed')

    // Setup mocks
    prompt.mockResolvedValue({
      username: 'testuser',
      contributions: ['code'],
    })
    add.mockRejectedValue(addError)

    // Execute fn and validate behaviour
    await expect(addContributor(options, username, contributions)).rejects.toBe(
      addError,
    )

    expect(configFile.writeContributors).not.toHaveBeenCalled()
  })

  it('should handle config file write errors', async () => {
    const username = 'testuser'
    const contributions = 'code'
    const options = optionsFixture({config: 'mock-config'})
    const writeError = new Error('Write failed')
    const mockedContributors = []

    // Setup mocks
    prompt.mockResolvedValue({
      username: 'testuser',
      contributions: ['code'],
    })
    add.mockResolvedValue(mockedContributors)
    configFile.writeContributors.mockRejectedValue(writeError)

    // Execute fn and validate behaviour
    await expect(addContributor(options, username, contributions)).rejects.toBe(
      writeError,
    )
  })

  it('should handle contributors without login property', async () => {
    const username = 'testuser'
    const contributions = 'code'
    const options = {
      config: 'mock-config',
      contributors: [
        {name: 'No Login User', contributions: ['code']},
        {login: 'existinguser', name: 'Existing User', contributions: ['docs']},
      ],
    }
    const mockedUpdatedContributors = [
      ...options.contributors,
      {login: 'testuser', name: 'Test User', contributions: ['code']},
    ]

    // Setup mocks
    prompt.mockResolvedValue({
      username: 'testuser',
      contributions: ['code'],
    })

    add.mockResolvedValue(mockedUpdatedContributors)

    // Execute fn
    const result = await addContributor(options, username, contributions)

    // Validate behaviour
    expect(result.newContributor).toBe(true)
    expect(result).toEqual({
      username: 'testuser',
      contributions: ['code'],
      contributors: mockedUpdatedContributors,
      newContributor: true,
    })
  })

  it('should pass correct parameters to all dependencies', async () => {
    const username = 'testuser'
    const contributions = 'code,docs'
    const options = optionsFixture({config: 'mock-config'})
    const mockedContributors = []

    // Setup mocks
    prompt.mockResolvedValue({
      username: 'finaluser',
      contributions: ['code', 'docs', 'bug'],
    })
    add.mockResolvedValue(mockedContributors)

    // Execute fn
    await addContributor(options, username, contributions)

    // Validate behaviour
    expect(prompt).toHaveBeenCalledWith(options, username, contributions)
    expect(add).toHaveBeenCalledWith(
      options,
      'finaluser',
      ['code', 'docs', 'bug'],
      repo.getUserInfo,
    )
    expect(configFile.writeContributors).toHaveBeenCalledWith(
      options.config,
      mockedContributors,
    )
  })

  it('should handle empty contributors list', async () => {
    const username = 'firstuser'
    const contributions = 'code'
    const options = {
      config: 'mock-config',
      contributors: [],
    }
    const mockedUpdatedContributors = [
      {login: 'firstuser', name: 'First User', contributions: ['code']},
    ]

    // Setup mocks
    prompt.mockResolvedValue({
      username: 'firstuser',
      contributions: ['code'],
    })

    add.mockResolvedValue(mockedUpdatedContributors)

    // Execute fn
    const result = await addContributor(options, username, contributions)

    // Validate behaviour
    expect(result.newContributor).toBe(true)
    expect(result).toEqual({
      username: 'firstuser',
      contributions: ['code'],
      contributors: mockedUpdatedContributors,
      newContributor: true,
    })
  })
})
