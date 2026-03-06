import contributors from './contributors.json'

export function optionsFixture(extraOptions = {}) {
  const options = {
    contributors,
    ...extraOptions,
  }

  return options
}
