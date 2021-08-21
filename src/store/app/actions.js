import { api } from 'boot/axios'
import { authPlugin } from '../../auth'

export async function fetchApiKey ({ commit, state }) {
  const accessToken = await authPlugin.getTokenSilently()
  let options = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }

  api.get(`/apikey/`, options).then(response => {
    let key = response.data
    commit('setApiKey', key.token)
  })
}
