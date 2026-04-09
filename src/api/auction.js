import request from './request'

export const placeBid = (data, options = {}) => {
  const { actionId } = options
  return request({
    url: '/auction/bid',
    method: 'post',
    data,
    actionId
  })
}

export const getCurrentAuction = (sessionId) => {
  return request({
    url: `/auction/current?sessionId=${sessionId}`,
    method: 'get'
  })
}

export const getBids = (auctionId, options = {}) => {
  const { lite = true } = options
  return request({
    url: `/auction/${auctionId}/bids`,
    method: 'get',
    params: { lite }
  })
}

export const createAuction = (sessionId, playerId, options = {}) => {
  const { actionId } = options
  return request({
    url: '/auction/create',
    method: 'post',
    params: { sessionId, playerId },
    actionId
  })
}

export const beginAuction = (auctionId, options = {}) => {
  const { actionId } = options
  return request({
    url: `/auction/begin/${auctionId}`,
    method: 'post',
    actionId
  })
}

export const startAuction = (sessionId, playerId, duration = 60, options = {}) => {
  const { actionId } = options
  return request({
    url: '/auction/start',
    method: 'post',
    params: { sessionId, playerId, duration },
    actionId
  })
}

export const finishAuction = (auctionId, autoFinish = false, options = {}) => {
  const { actionId } = options
  return request({
    url: `/auction/finish/${auctionId}`,
    method: 'post',
    params: { autoFinish },
    actionId
  })
}

export const getPickRecords = (sessionId) => {
  return request({
    url: `/auction/picks`,
    method: 'get',
    params: { sessionId }
  })
}

export const rollbackByPickRecord = (recordId, options = {}) => {
  const { actionId } = options
  return request({
    url: `/auction/rollback/${recordId}`,
    method: 'post',
    actionId
  })
}
