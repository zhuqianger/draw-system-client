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

export const assignPlayerToTeam = (data) => {
  return request({
    url: '/player/assign',
    method: 'post',
    data
  })
}