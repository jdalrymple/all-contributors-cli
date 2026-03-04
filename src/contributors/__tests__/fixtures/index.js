import contributors from './contributors.json'

export function optionsFixture(extraOptions) {
  const options = {
    ...extraOptions,
    contributors,
  }

  return options
}