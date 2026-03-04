import {describe, it, expect} from 'vitest'
import {prompt, getQuestions, getValidUserContributions} from '../prompt.js'
import { optionsFixture } from './fixtures/index.js'

describe('prompt', () => {
  it(`should throw error if all contribution types are invalid`, () => {
    const options = optionsFixture({ repoType: 'github' })
    const username = 'userName'
    const contributions = 'invalidContributionType1,invalidContributionType2'

    expect(() => prompt(options, username, contributions)).toThrow(
      'invalidContributionType1,invalidContributionType2 is/are invalid contribution type(s)',
    )
  })

  it(`should not throw error if atleast one of the contribution types is valid`, async () => {
    const options = optionsFixture({ repoType: 'github' })
    const username = 'userName'
    const contributions = 'wrongContributionType,code'

    const answers = await prompt(options, username, contributions)

    expect(answers).toEqual({username: 'userName', contributions: ['code']})
  })

  it(`should filter valid contribution types from user inserted types`, async () => {
    const options = optionsFixture({ repoType: 'github' })
    const username = 'userName'
    const contributions =
      'invalidContributionType1,code,invalidContributionType2,bug'

    const answers = await prompt(options, username, contributions)

    expect(answers.contributions).toHaveLength(2)
    expect(answers.contributions).toEqual(['code', 'bug'])
  })
})

describe('getQuestions', () => {
  it(`should prompt for contributions when username is provided but contributions are undefined`, () => {
    const options = optionsFixture({ repoType: 'github' })
    const username = 'userName'
    const contributions = undefined

    const questions = getQuestions(options, username, contributions)
    const contributionsQuestion = questions.find(q => q.name === 'contributions')

    expect(contributionsQuestion).toBeDefined()
    expect(contributionsQuestion.message).toBe('What are the contribution types?')
  })

  it(`should return prompt with username message when username and contributions are not provided`, () => {
    const options = optionsFixture({ repoType: 'github' })
    const username = undefined
    const contributions = undefined

    const questions = getQuestions(options, username, contributions)
    const usernameQuestion = questions.find(q => q.name === 'username')

    expect(usernameQuestion).toBeDefined()
    expect(usernameQuestion.message).toBe(
      "What is the contributor's GitHub username?",
    )
  })

  it(`username validation should return error when input is empty`, () => {
    const options = optionsFixture({ repoType: 'github' })

    const questions = getQuestions(options, undefined, undefined)
    const usernameQuestion = questions.find(q => q.name === 'username')
    const result = usernameQuestion.validate('')

    expect(result).toBe('Username not provided')
  })

  it(`username validation should return true when input is provided`, () => {
    const options = optionsFixture({ repoType: 'github' })

    const questions = getQuestions(options, undefined, undefined)
    const usernameQuestion = questions.find(q => q.name === 'username')
    const result = usernameQuestion.validate('lwasser')

    expect(result).toBe(true)
  })

  it(`contributions validation should return error when no contributions selected`, () => {
    const options = optionsFixture({ repoType: 'github' })

    const questions = getQuestions(options, 'userName', undefined)
    const contributionsQuestion = questions.find(q => q.name === 'contributions')
    // Simulate user selecting nothing (empty array)
    const result = contributionsQuestion.validate([], {username: 'userName'})

    expect(result).toBe('Use space to select at least one contribution type.')
  })

  it(`contributions validation should return error when selection matches previous contributions`, () => {
    const options = {
      repoType: 'github',
      contributors: [
        {
          login: 'jfmengels',
          name: 'Jeroen Engels',
          contributions: ['code', 'doc'], // Existing contributions
        },
      ],
    }

    const questions = getQuestions(options, 'jfmengels', undefined)
    const contributionsQuestion = questions.find(q => q.name === 'contributions')

    // The user's contrib types already existing in the all-contribs file
    const result = contributionsQuestion.validate(['code', 'doc'], {
      username: 'jfmengels',
    })

    expect(result).toBe(
      'Nothing changed, use space to select contribution types.',
    )
  })

  it(`contributions validation should return true when valid selection is made`, () => {
    const options = optionsFixture({ repoType: 'github' })

    const questions = getQuestions(options, 'userName', undefined)
    const contributionsQuestion = questions.find(q => q.name === 'contributions')

    // Simulate user selecting valid contributions
    const result = contributionsQuestion.validate(['code', 'doc'], {
      username: 'userName',
    })

    expect(result).toBe(true)
  })
})

describe('getValidUserContributions', () => {
  it('should return valid contribution types when all are valid', () => {
    const options = optionsFixture({ repoType: 'github' })
    const contributions = 'code,docs,bug'

    const result = getValidUserContributions(options, contributions)

    expect(result).toEqual(['code', 'docs', 'bug'])
  })

  it('should filter out invalid contribution types and return only valid ones', () => {
    const options = optionsFixture({ repoType: 'github' })
    const contributions = 'code,invalidType,docs,anotherInvalid,bug'

    const result = getValidUserContributions(options, contributions)

    expect(result).toEqual(['code', 'docs', 'bug'])
  })

  it('should throw error when all contribution types are invalid', () => {
    const options = optionsFixture({ repoType: 'github' })
    const contributions = 'invalidType1,invalidType2,anotherInvalid'

    expect(() => getValidUserContributions(options, contributions)).toThrow(
      'invalidType1,invalidType2,anotherInvalid is/are invalid contribution type(s)'
    )
  })

  it('should handle single valid contribution type', () => {
    const options = optionsFixture({ repoType: 'github' })
    const contributions = 'code'

    const result = getValidUserContributions(options, contributions)

    expect(result).toEqual(['code'])
  })

  it('should handle single invalid contribution type', () => {
    const options = optionsFixture({ repoType: 'github' })
    const contributions = 'invalidType'

    expect(() => getValidUserContributions(options, contributions)).toThrow(
      'invalidType is/are invalid contribution type(s)'
    )
  })

  it('should handle empty string contributions', () => {
    const options = optionsFixture({ repoType: 'github' })
    const contributions = ''

    expect(() => getValidUserContributions(options, contributions)).toThrow()
  })

  it('should handle null contributions', () => {
    const options = optionsFixture({ repoType: 'github' })
    const contributions = null

    expect(() => getValidUserContributions(options, contributions)).toThrow()
  })

  it('should handle undefined contributions', () => {
    const options = optionsFixture({ repoType: 'github' })
    const contributions = undefined

    expect(() => getValidUserContributions(options, contributions)).toThrow()
  })

  it('should handle contributions with spaces around commas', () => {
    const options = optionsFixture({ repoType: 'github' })
    const contributions = 'code, docs , bug'

    const result = getValidUserContributions(options, contributions)

    expect(result).toEqual(['code', ' docs ', ' bug'])
  })

  it('should handle mixed valid and invalid types with descriptive error message', () => {
    const options = optionsFixture({ repoType: 'github' })
    const contributions = 'code,wrongType,docs,anotherWrong'

    const result = getValidUserContributions(options, contributions)

    expect(result).toEqual(['code', 'docs'])
  })

  it('should handle contribution types that exist in different repo types', () => {
    const githubOptions = optionsFixture({ repoType: 'github' })
    const gitlabOptions = optionsFixture({ repoType: 'gitlab' })
    const contributions = 'code,docs'

    const githubResult = getValidUserContributions(githubOptions, contributions)
    const gitlabResult = getValidUserContributions(gitlabOptions, contributions)

    expect(githubResult).toEqual(['code', 'docs'])
    expect(gitlabResult).toEqual(['code', 'docs'])
  })
})
