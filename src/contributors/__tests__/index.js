import {describe, it, expect, vi, beforeEach} from 'vitest'
import {addContributor} from '../index.js'
import * as add from '../add.js'
import * as prompt from '../prompt.js'
import * as util from '../../util/index.js'
import * as repo from '../../repo/index.js'
import { optionsFixture } from './fixtures/index.js'

// Mock all dependencies
vi.mock('../add.js')
vi.mock('../prompt.js')
vi.mock('../../util/index.js')
vi.mock('../../repo/index.js')

describe('addContributor', () => {
  let mockOptions
  let mockAdd
  let mockPrompt
  let mockWriteContributors

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockOptions = optionsFixture({
      config: 'mock-config-path',
      contributors: [
        {login: 'existinguser', name: 'Existing User', contributions: ['code']},
        {login: 'anotheruser', name: 'Another User', contributions: ['docs']},
      ],
    })

    // Mock the add function
    mockAdd = vi.fn()
    vi.mocked(add.add).mockImplementation(mockAdd)

    // Mock the prompt function
    mockPrompt = vi.fn()
    vi.mocked(prompt.prompt).mockImplementation(mockPrompt)

    // Mock util.configFile.writeContributors
    mockWriteContributors = vi.fn().mockResolvedValue(undefined)
    vi.mocked(util.configFile).mockReturnValue({
      writeContributors: mockWriteContributors,
    })

    // Mock repo.getUserInfo
    vi.mocked(repo.getUserInfo).mockResolvedValue({
      login: 'testuser',
      name: 'Test User',
      avatar_url: 'avatar.url',
      profile: 'profile.url',
    })
  })

  it('should add a new contributor successfully', async () => {
    const username = 'newuser'
    const contributions = 'code,docs'
    
    // Mock prompt response
    mockPrompt.mockResolvedValue({
      username: 'newuser',
      contributions: ['code', 'docs'],
    })

    // Mock add function to return updated contributors list
    const updatedContributors = [
      ...mockOptions.contributors,
      {
        login: 'newuser',
        name: 'New User',
        avatar_url: 'avatar.url',
        profile: 'profile.url',
        contributions: ['code', 'docs'],
      },
    ]
    mockAdd.mockResolvedValue(updatedContributors)

    const result = await addContributor(mockOptions, username, contributions)

    expect(mockPrompt).toHaveBeenCalledWith(mockOptions, username, contributions)
    expect(mockAdd).toHaveBeenCalledWith(
      mockOptions,
      'newuser',
      ['code', 'docs'],
      repo.getUserInfo,
    )
    expect(mockWriteContributors).toHaveBeenCalledWith(
      mockOptions.config,
      updatedContributors,
    )
    
    expect(result).toEqual({
      username: 'newuser',
      contributions: ['code', 'docs'],
      contributors: updatedContributors,
      newContributor: true,
    })
  })

  it('should update an existing contributor', async () => {
    const username = 'existinguser'
    const contributions = 'code,bug'
    
    // Mock prompt response
    mockPrompt.mockResolvedValue({
      username: 'existinguser',
      contributions: ['code', 'bug'],
    })

    // Mock add function to return updated contributors list
    const updatedContributors = [
      {login: 'existinguser', name: 'Existing User', contributions: ['code', 'bug']},
      {login: 'anotheruser', name: 'Another User', contributions: ['docs']},
    ]
    mockAdd.mockResolvedValue(updatedContributors)

    const result = await addContributor(mockOptions, username, contributions)

    expect(mockPrompt).toHaveBeenCalledWith(mockOptions, username, contributions)
    expect(mockAdd).toHaveBeenCalledWith(
      mockOptions,
      'existinguser',
      ['code', 'bug'],
      repo.getUserInfo,
    )
    expect(mockWriteContributors).toHaveBeenCalledWith(
      mockOptions.config,
      updatedContributors,
    )
    
    expect(result).toEqual({
      username: 'existinguser',
      contributions: ['code', 'bug'],
      contributors: updatedContributors,
      newContributor: false,
    })
  })

  it('should handle case-insensitive existing contributor detection', async () => {
    const username = 'EXISTINGUSER'
    const contributions = 'code,docs'
    
    mockPrompt.mockResolvedValue({
      username: 'EXISTINGUSER',
      contributions: ['code', 'docs'],
    })

    const updatedContributors = [
      {login: 'existinguser', name: 'Existing User', contributions: ['code', 'docs']},
      {login: 'anotheruser', name: 'Another User', contributions: ['docs']},
    ]
    mockAdd.mockResolvedValue(updatedContributors)

    const result = await addContributor(mockOptions, username, contributions)

    expect(result.newContributor).toBe(false)
  })

  it('should handle prompt errors', async () => {
    const username = 'testuser'
    const contributions = 'code'
    const promptError = new Error('Prompt failed')
    
    mockPrompt.mockRejectedValue(promptError)

    await expect(addContributor(mockOptions, username, contributions)).rejects.toBe(promptError)
    
    expect(mockAdd).not.toHaveBeenCalled()
    expect(mockWriteContributors).not.toHaveBeenCalled()
  })

  it('should handle add function errors', async () => {
    const username = 'testuser'
    const contributions = 'code'
    const addError = new Error('Add failed')
    
    mockPrompt.mockResolvedValue({
      username: 'testuser',
      contributions: ['code'],
    })
    mockAdd.mockRejectedValue(addError)

    await expect(addContributor(mockOptions, username, contributions)).rejects.toBe(addError)
    
    expect(mockWriteContributors).not.toHaveBeenCalled()
  })

  it('should handle config file write errors', async () => {
    const username = 'testuser'
    const contributions = 'code'
    const writeError = new Error('Write failed')
    
    mockPrompt.mockResolvedValue({
      username: 'testuser',
      contributions: ['code'],
    })
    mockAdd.mockResolvedValue([])
    mockWriteContributors.mockRejectedValue(writeError)

    await expect(addContributor(mockOptions, username, contributions)).rejects.toBe(writeError)
  })

  it('should handle contributors without login property', async () => {
    const username = 'testuser'
    const contributions = 'code'
    
    // Options with contributor without login
    const optionsWithoutLogin = {
      ...mockOptions,
      contributors: [
        {name: 'No Login User', contributions: ['code']},
        {login: 'existinguser', name: 'Existing User', contributions: ['docs']},
      ],
    }
    
    mockPrompt.mockResolvedValue({
      username: 'testuser',
      contributions: ['code'],
    })
    
    const updatedContributors = [
      ...optionsWithoutLogin.contributors,
      {login: 'testuser', name: 'Test User', contributions: ['code']},
    ]
    mockAdd.mockResolvedValue(updatedContributors)

    const result = await addContributor(optionsWithoutLogin, username, contributions)

    expect(result.newContributor).toBe(true)
  })

  it('should pass correct parameters to all dependencies', async () => {
    const username = 'testuser'
    const contributions = 'code,docs'
    
    mockPrompt.mockResolvedValue({
      username: 'finaluser',
      contributions: ['code', 'docs', 'bug'],
    })
    mockAdd.mockResolvedValue([])

    await addContributor(mockOptions, username, contributions)

    // Verify prompt was called with original parameters
    expect(mockPrompt).toHaveBeenCalledWith(mockOptions, username, contributions)
    
    // Verify add was called with prompt results
    expect(mockAdd).toHaveBeenCalledWith(
      mockOptions,
      'finaluser',
      ['code', 'docs', 'bug'],
      repo.getUserInfo,
    )
    
    // Verify config write was called with add results
    expect(mockWriteContributors).toHaveBeenCalledWith(mockOptions.config, [])
  })

  it('should handle empty contributors list', async () => {
    const username = 'firstuser'
    const contributions = 'code'
    
    const emptyOptions = {
      ...mockOptions,
      contributors: [],
    }
    
    mockPrompt.mockResolvedValue({
      username: 'firstuser',
      contributions: ['code'],
    })
    
    const updatedContributors = [
      {login: 'firstuser', name: 'First User', contributions: ['code']},
    ]
    mockAdd.mockResolvedValue(updatedContributors)

    const result = await addContributor(emptyOptions, username, contributions)

    expect(result.newContributor).toBe(true)
    expect(result.contributors).toEqual(updatedContributors)
  })
})