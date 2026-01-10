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
