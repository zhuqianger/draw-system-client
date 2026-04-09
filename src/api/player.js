import request from './request'

export const getPoolPlayers = (sessionId) => {
  return request({
    url: `/player/pool?sessionId=${sessionId}`,
    method: 'get'
  })
}

export const getTeams = (sessionId) => {
  return request({
    url: `/team/session/${sessionId}`,
    method: 'get'
  })
}

export const exportTeams = (sessionId) => {
  return request({
    url: `/team/export/${sessionId}`,
    method: 'get',
    responseType: 'blob'
  })
}

export const assignPlayerToTeam = (data, options = {}) => {
  const { actionId } = options
  return request({
    url: '/player/assign',
    method: 'post',
    data,
    actionId
  })
}

export const updateTeamCost = (data, options = {}) => {
  const { actionId } = options
  return request({
    url: '/team/updateCost',
    method: 'post',
    data,
    actionId
  })
}

export const removePlayerFromTeam = (data, options = {}) => {
  const { actionId } = options
  return request({
    url: '/team/removePlayer',
    method: 'post',
    data,
    actionId
  })
}

export const changePlayerPool = (data, options = {}) => {
  const { actionId } = options
  return request({
    url: '/player/pool/change',
    method: 'post',
    data,
    actionId
  })
}