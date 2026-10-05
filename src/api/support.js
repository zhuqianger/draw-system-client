import request from './request'

export function askSupport(question) {
  return request.post('/support/ask', { question })
}

export function getSupportSuggestions() {
  return request.get('/support/suggestions')
}
