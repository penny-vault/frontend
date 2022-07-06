import { emptyStrategy } from './constants'

export default function () {
  return {
    current: emptyStrategy,
    simulation: { executed: false },
    list: [],
    userArgs: {}
  }
}
