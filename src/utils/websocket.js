import SockJS from 'sockjs-client'
import Stomp from 'stompjs'

let stompClient = null
let reconnectTimer = null
const RECONNECT_DELAY = 5000 // 5秒后重连

/**
 * 连接WebSocket
 */
export function connectWebSocket(sessionId, callbacks) {
  const token = sessionStorage.getItem('token')
  if (!token) {
    console.warn('未找到token，无法连接WebSocket')
    return null
  }

  // 如果已经连接，先断开
  if (stompClient && stompClient.connected) {
    disconnectWebSocket()
  }

  // 创建SockJS连接
  const socket = new SockJS('http://localhost:8080/ws')
  stompClient = Stomp.over(socket)

  // 禁用调试信息
  stompClient.debug = () => {}

  // 连接WebSocket
  stompClient.connect(
    {},
    () => {
      console.log('WebSocket连接成功')

      // 订阅拍卖相关消息
      if (callbacks.onAuctionUpdate) {
        stompClient.subscribe('/topic/auction', (message) => {
          const data = JSON.parse(message.body)
          if (data.code === 200) {
            callbacks.onAuctionUpdate(data)
          }
        })
      }

      // 订阅竞价消息
      if (callbacks.onBidUpdate) {
        stompClient.subscribe('/topic/bid', (message) => {
          const data = JSON.parse(message.body)
          if (data.code === 200) {
            callbacks.onBidUpdate(data)
          }
        })
      }

      // 订阅队员分配消息
      if (callbacks.onPlayerAssigned) {
        stompClient.subscribe('/topic/assignment', (message) => {
          const data = JSON.parse(message.body)
          if (data.code === 200) {
            callbacks.onPlayerAssigned(data)
          }
        })
      }

      // 订阅系统状态更新
      if (callbacks.onSystemStatusUpdate) {
        stompClient.subscribe('/topic/system-status', (message) => {
          const data = JSON.parse(message.body)
          if (data.code === 200) {
            callbacks.onSystemStatusUpdate(data.data)
          }
        })
      }

      // 清除重连定时器
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    },
    (error) => {
      console.error('WebSocket连接失败:', error)
      // 尝试重连
      reconnectTimer = setTimeout(() => {
        connectWebSocket(sessionId, callbacks)
      }, RECONNECT_DELAY)
    }
  )

  return stompClient
}

/**
 * 断开WebSocket连接
 */
export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (stompClient && stompClient.connected) {
    stompClient.disconnect(() => {
      console.log('WebSocket已断开')
    })
    stompClient = null
  }
}

/**
 * 检查WebSocket连接状态
 */
export function isWebSocketConnected() {
  return stompClient && stompClient.connected
}
