export function setStrategies (state, strategies) {
  state.list = strategies
}

export function setStrategy (state, strategy) {
  state.current = strategy
}

export function setSimulationExecuted (state, executed) {
  state.simulation.executed = executed
}
