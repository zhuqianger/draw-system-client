import request from './request'

export const createSession = (formData) => {
  return request({
    url: '/session/create',
    method: 'post',
    data: formData,
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

export const activateSession = (sessionId) => {
  return request({
    url: `/session/${sessionId}/activate`,
    method: 'post'
  })
}

export const deleteSession = (sessionId) => {
  return request({
    url: `/session/${sessionId}`,
    method: 'delete'
  })
}
