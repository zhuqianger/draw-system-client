import request from './request'

export const placeBid = (data) => {
  return request({
    url: '/auction/bid',
    method: 'post',
    data
  })
}

export const getCurrentAuction = (sessionId) => {
  return request({
    url: `/auction/current?sessionId=${sessionId}`,
    method: 'get'
  })
}

export const getBids = (auctionId) => {
  return request({
    url: `/auction/${auctionId}/bids`,
    method: 'get'
  })
}

export const createAuction = (sessionId, playerId) => {
  return request({
    url: '/auction/create',
    method: 'post',
    params: { sessionId, playerId }
  })
}

export const beginAuction = (auctionId) => {
  return request({
    url: `/auction/begin/${auctionId}`,
    method: 'post'
  })
}

export const startAuction = (sessionId, playerId, duration = 60) => {
  return request({
    url: '/auction/start',
    method: 'post',
    params: { sessionId, playerId, duration }
  })
}

export const finishAuction = (auctionId) => {
  return request({
    url: `/auction/finish/${auctionId}`,
    method: 'post'
  })
}
