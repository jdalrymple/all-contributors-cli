export function uniqueTypes(contribution) {
  return contribution.type || contribution
}

export function formatContributions(options, existing = [], types) {
  const same = types.filter(type =>
    existing.some(
      existingType => uniqueTypes(existingType) === uniqueTypes(type),
    ),
  )
  const remove = types.length < existing.length && same.length

  if (options.url) {
    return existing.concat(
      types.map(type => {
        return {type, url: options.url}
      }),
    )
  }

  if (remove) {
    return same
  }

  const combined = existing.concat(types)

  return combined.filter(
    (item, index, arr) =>
      index ===
      arr.findIndex(other => uniqueTypes(other) === uniqueTypes(item)),
  )
}

export function updateContributor(options, contributor, contributions) {
  return {
    ...contributor,
    contributions: formatContributions(
      options,
      contributor.contributions,
      contributions,
    ),
  }
}

export function updateExistingContributor(options, username, contributions) {
  return options.contributors.map(c => {
    if (!c.login || username.toLowerCase() !== c.login.toLowerCase()) {
      return c
    }

    return updateContributor(options, c, contributions)
  })
}

export async function addNewContributor(options, username, contributions, infoFetcher) {
  const userData = await infoFetcher(username, options.repoType, options.repoHost)
  const contributor = {
    ...userData,
    contributions: formatContributions(options, [], contributions),
  }

  return options.contributors.concat(contributor)
}

export async function add(options, username, contributions, infoFetcher) {
  const exists = options.contributors.find(c => (
      c.login &&
      c.login.toLowerCase() === username.toLowerCase()
  ))

  if (exists) {
    updateExistingContributor(options, username, contributions)
  }

  return addNewContributor(options, username, contributions, infoFetcher)
}

export function addWithDetails({
  options,
  login,
  contributions,
  name,
  avatar_url,
  profile,
}) {
  const infoFetcherNoNetwork = function () {
    return Promise.resolve({
      login,
      name,
      avatar_url,
      profile,
    })
  }

  return add(options, login, contributions, infoFetcherNoNetwork)
}
