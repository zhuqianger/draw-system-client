import request from './request'

export const createSession = (formData, options = {}) => {
  const { actionId } = options
  return request({
    url: '/session/create',
    method: 'post',
    data: formData,
    actionId,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const getSessionList = () => {
  return request({
    url: '/session/list',
    method: 'get'
  })
}

export const getSession = (sessionId) => {
  return request({
    url: `/session/${sessionId}`,
    method: 'get'
  })
}

export const activateSession = (sessionId, options = {}) => {
  const { actionId } = options
  return request({
    url: `/session/${sessionId}/activate`,
    method: 'post',
    actionId
  })
}

export const deleteSession = (sessionId, options = {}) => {
  const { actionId } = options
  return request({
    url: `/session/${sessionId}`,
    method: 'delete',
    actionId
  })
}
