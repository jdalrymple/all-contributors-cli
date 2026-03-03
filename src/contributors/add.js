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
  return options.contributors.map(contributor => {
    if (
      !contributor.login ||
      username.toLowerCase() !== contributor.login.toLowerCase()
    ) {
      return contributor
    }
    return updateContributor(options, contributor, contributions)
  })
}

export function addNewContributor(options, username, contributions, infoFetcher) {
  return infoFetcher(username, options.repoType, options.repoHost).then(
    userData => {
      const contributor = {
        ...userData,
        contributions: formatContributions(options, [], contributions),
      }
      return options.contributors.concat(contributor)
    },
  )
}

export function add(options, username, contributions, infoFetcher) {
  // case insensitive find
  const exists = options.contributors.find(contributor => {
    return (
      contributor.login &&
      contributor.login.toLowerCase() === username.toLowerCase()
    )
  })

  if (exists) {
    return Promise.resolve(
      updateExistingContributor(options, username, contributions),
    )
  }
  return addNewContributor(options, username, contributions, infoFetcher)
}

export function addContributorWithDetails({
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
