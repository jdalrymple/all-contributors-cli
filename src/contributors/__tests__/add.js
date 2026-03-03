import {describe, it, expect, vi} from 'vitest'
import {
  add,
  uniqueTypes,
  formatContributions,
  updateContributor,
  updateExistingContributor,
  addNewContributor,
  addContributorWithDetails,
} from '../add.js'
import fixtures from './fixtures/index.js'

/**
 * Mock function that simulates fetching contributor info from an API.
 * Returns a promise resolving to contributor data without making real API calls.
 *
 * @param {string} username - GitHub username to fetch
 * @returns {Promise<Object>} Contributor info (login, name, avatar_url, profile)
 */
function mockInfoFetcher(username) {
  return Promise.resolve({
    login: username,
    name: 'Some name',
    avatar_url: 'www.avatar.url',
    profile: 'www.profile.url',
  })
}

describe('uniqueTypes', () => {
  it('should return type property when contribution is object', () => {
    const contribution = {type: 'code', url: 'www.example.com'}
    expect(uniqueTypes(contribution)).toBe('code')
  })

  it('should return contribution itself when it is a string', () => {
    const contribution = 'docs'
    expect(uniqueTypes(contribution)).toBe('docs')
  })

  it('should return undefined when object has no type property', () => {
    const contribution = {url: 'www.example.com'}
    expect(uniqueTypes(contribution)).toBeUndefined()
  })
})

describe('formatContributions', () => {
  it('should return empty array when no existing or new types', () => {
    const options = {}
    const result = formatContributions(options, [], [])
    expect(result).toEqual([])
  })

  it('should add new types to existing contributions', () => {
    const options = {}
    const existing = ['code']
    const types = ['docs']
    const result = formatContributions(options, existing, types)
    expect(result).toEqual(['code', 'docs'])
  })

  it('should remove duplicates when adding same type', () => {
    const options = {}
    const existing = ['code']
    const types = ['code', 'docs']
    const result = formatContributions(options, existing, types)
    expect(result).toEqual(['code', 'docs'])
  })

  it('should handle object contributions with same type', () => {
    const options = {}
    const existing = [{type: 'code', url: 'www.old.com'}]
    const types = [{type: 'code', url: 'www.new.com'}]
    const result = formatContributions(options, existing, types)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({type: 'code', url: 'www.old.com'})
  })

  it('should handle mixed string and object contributions', () => {
    const options = {}
    const existing = ['code']
    const types = [{type: 'code', url: 'www.example.com'}]
    const result = formatContributions(options, existing, types)
    expect(result).toEqual(['code'])
  })

  it('should format new types with URL when options.url provided', () => {
    const options = {url: 'www.test.com'}
    const existing = ['code']
    const types = ['docs', 'bug']
    const result = formatContributions(options, existing, types)
    expect(result).toEqual([
      'code',
      {type: 'docs', url: 'www.test.com'},
      {type: 'bug', url: 'www.test.com'},
    ])
  })

  it('should handle removal case - fewer new types than existing with matches', () => {
    const options = {}
    const existing = ['code', 'docs', 'bug']
    const types = ['code']
    const result = formatContributions(options, existing, types)
    expect(result).toEqual(['code'])
  })

  it('should not remove when same length but different types', () => {
    const options = {}
    const existing = ['code', 'docs']
    const types = ['bug', 'test']
    const result = formatContributions(options, existing, types)
    expect(result).toEqual(['code', 'docs', 'bug', 'test'])
  })
})

describe('updateContributor', () => {
  it('should update contributor with new contributions', () => {
    const options = {}
    const contributor = {
      login: 'testuser',
      name: 'Test User',
      contributions: ['code'],
    }
    const contributions = ['docs']
    const result = updateContributor(options, contributor, contributions)

    expect(result).toEqual({
      login: 'testuser',
      name: 'Test User',
      contributions: ['code', 'docs'],
    })
  })

  it('should preserve other contributor properties', () => {
    const options = {}
    const contributor = {
      login: 'testuser',
      name: 'Test User',
      avatar_url: 'www.avatar.com',
      profile: 'www.profile.com',
      contributions: ['code'],
    }
    const contributions = ['docs']
    const result = updateContributor(options, contributor, contributions)

    expect(result.login).toBe('testuser')
    expect(result.name).toBe('Test User')
    expect(result.avatar_url).toBe('www.avatar.com')
    expect(result.profile).toBe('www.profile.com')
  })
})

describe('updateExistingContributor', () => {
  it('should update matching contributor', () => {
    const options = {
      contributors: [
        {login: 'user1', contributions: ['code']},
        {login: 'user2', contributions: ['docs']},
      ],
    }
    const username = 'user1'
    const contributions = ['bug']
    const result = updateExistingContributor(options, username, contributions)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({login: 'user1', contributions: ['code', 'bug']})
    expect(result[1]).toEqual({login: 'user2', contributions: ['docs']})
  })

  it('should handle case insensitive matching', () => {
    const options = {
      contributors: [
        {login: 'User1', contributions: ['code']},
        {login: 'user2', contributions: ['docs']},
      ],
    }
    const username = 'user1'
    const contributions = ['bug']
    const result = updateExistingContributor(options, username, contributions)

    expect(result[0]).toEqual({login: 'User1', contributions: ['code', 'bug']})
  })

  it('should not update contributors without login', () => {
    const options = {
      contributors: [
        {name: 'No Login User', contributions: ['code']},
        {login: 'user2', contributions: ['docs']},
      ],
    }
    const username = 'user2'
    const contributions = ['bug']
    const result = updateExistingContributor(options, username, contributions)

    expect(result[0]).toEqual({name: 'No Login User', contributions: ['code']})
    expect(result[1]).toEqual({login: 'user2', contributions: ['docs', 'bug']})
  })

  it('should return unchanged list when no match found', () => {
    const options = {
      contributors: [
        {login: 'user1', contributions: ['code']},
        {login: 'user2', contributions: ['docs']},
      ],
    }
    const username = 'nonexistent'
    const contributions = ['bug']
    const result = updateExistingContributor(options, username, contributions)

    expect(result).toEqual(options.contributors)
  })
})

describe('addNewContributor', () => {
  it('should handle infoFetcher errors', async () => {
    const options = {contributors: []}
    const username = 'newuser'
    const contributions = ['docs']
    const error = new Error('Fetch failed')
    const mockFetcher = vi.fn().mockRejectedValue(error)

    await expect(
      addNewContributor(options, username, contributions, mockFetcher),
    ).rejects.toBe(error)
  })

  it('should format contributions with URL when provided', async () => {
    const options = {
      contributors: [],
      url: 'www.custom.com',
    }
    const username = 'newuser'
    const contributions = ['docs', 'bug']
    const mockFetcher = vi.fn().mockResolvedValue({
      login: 'newuser',
      name: 'New User',
    })

    const result = await addNewContributor(options, username, contributions, mockFetcher)

    expect(result[0].contributions).toEqual([
      {type: 'docs', url: 'www.custom.com'},
      {type: 'bug', url: 'www.custom.com'},
    ])
  })
})

describe('addContributorWithDetails', () => {
  it('should add new contributor without going to the network', async () => {
    const {options} = fixtures()
    const userDetails = {
      login: 'jakebolam',
      contributions: ['code', 'security'],
      name: 'Jake Bolam',
      avatar_url: 'my-avatar.example.com',
      profile: 'jakebolam.com',
    }

    const contributors = await addContributorWithDetails({
      options,
      login: userDetails.login,
      contributions: userDetails.contributions,
      name: userDetails.name,
      avatar_url: userDetails.avatar_url,
      profile: userDetails.profile,
    })

    expect(contributors).toHaveLength(options.contributors.length + 1)
    expect(contributors[options.contributors.length]).toEqual(userDetails)
  })
})

describe('add', () => {
  it('should callback with error if infoFetcher fails', async () => {
    const {options} = fixtures()
    const username = 'login3'
    const contributions = ['doc']
    const error = new Error('infoFetcher error')
    function infoFetcher() {
      return Promise.reject(error)
    }
    const resolvedError = await add(
      options,
      username,
      contributions,
      infoFetcher,
    ).catch(e => e)

    expect(resolvedError).toBe(error)
  })

  it('calls infoFetcher with (username, options.repoType, options.repoHost) when adding new contributor', async () => {
    const {options} = fixtures()
    options.repoType = 'github'
    options.repoHost = 'https://github.com'
    const username = 'newuser'
    const contributions = ['doc']
    const infoFetcher = vi.fn().mockResolvedValue({
      login: username,
      name: 'New User',
      avatar_url: '',
      profile: '',
    })

    await add(options, username, contributions, infoFetcher)

    expect(infoFetcher).toHaveBeenCalledWith(
      username,
      'github',
      'https://github.com',
    )
  })

  it('add new contributor at the end of the list of contributors', () => {
    const {options} = fixtures()
    const username = 'login3'
    const contributions = ['doc']

    return add(options, username, contributions, mockInfoFetcher).then(
      contributors => {
        expect(contributors).toHaveLength(options.contributors.length + 1)
        expect(contributors[options.contributors.length]).toEqual({
          login: 'login3',
          name: 'Some name',
          avatar_url: 'www.avatar.url',
          profile: 'www.profile.url',
          contributions: ['doc'],
        })
      },
    )
  })


  it(`should not update an existing contributor's contributions where nothing has changed`, () => {
    const {options} = fixtures()
    const username = 'login2'
    const contributions = ['blog', 'code']

    return add(options, username, contributions, mockInfoFetcher).then(
      contributors => {
        expect(contributors).toEqual(options.contributors)
      },
    )
  })


  it(`should update an existing contributor's contributions if a new type is added`, () => {
    const {options} = fixtures()
    const username = 'login1'
    const contributions = ['bug']
    return add(options, username, contributions, mockInfoFetcher).then(
      contributors => {
        expect(contributors).toHaveLength(options.contributors.length)
        expect(contributors[0]).toEqual({
          login: 'login1',
          name: 'Some name',
          avatar_url: 'www.avatar.url',
          profile: 'www.profile.url',
          contributions: ['code', 'bug'],
        })
      },
    )
  })


  it(`should update an existing contributor's contributions if a new type is added with a link`, () => {
    const {options} = fixtures()
    const username = 'login1'
    const contributions = ['bug']
    options.url = 'www.foo.bar'

    return add(options, username, contributions, mockInfoFetcher).then(
      contributors => {
        expect(contributors).toHaveLength(options.contributors.length)
        expect(contributors[0]).toEqual({
          login: 'login1',
          name: 'Some name',
          avatar_url: 'www.avatar.url',
          profile: 'www.profile.url',
          contributions: ['code', {type: 'bug', url: 'www.foo.bar'}],
        })
      },
    )
  })

  it(`should update an existing contributor's contributions if an existing type is removed`, () => {
    const {options} = fixtures()
    const username = 'login2'
    const contributions = ['code']

    return add(options, username, contributions, mockInfoFetcher).then(
      contributors => {
        expect(contributors).toHaveLength(options.contributors.length)
        expect(contributors[1]).toEqual({
          login: 'login2',
          name: 'Some name',
          avatar_url: 'www.avatar.url',
          profile: 'www.profile.url',
          contributions: ['code'],
        })
      },
    )
  })
})
