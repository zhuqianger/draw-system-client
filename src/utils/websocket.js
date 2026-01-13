import SockJS from 'sockjs-client'
import Stomp from 'stompjs'

let stompClient = null
let socket = null
let reconnectTimer = null
let heartbeatTimer = null
let subscriptions = [] // 保存订阅对象
let savedCallbacks = null // 保存回调函数
let savedSessionId = null // 保存sessionId
let isManualDisconnect = false // 标记是否为手动断开
let reconnectAttempts = 0 // 重连尝试次数
const RECONNECT_DELAY = 500 // 0.5秒后重连
const MAX_RECONNECT_ATTEMPTS = 10 // 最大重连次数
const HEARTBEAT_INTERVAL = 500 // 心跳间隔0.5s

/**
 * 连接WebSocket
 */
export function connectWebSocket(sessionId, callbacks) {
  const token = sessionStorage.getItem('token')
  if (!token) {
    console.warn('未找到token，无法连接WebSocket')
    return null
  }

  // 保存参数以便重连时使用
  savedCallbacks = callbacks
  savedSessionId = sessionId
  isManualDisconnect = false

  // 如果已经连接，先断开
  if (stompClient && stompClient.connected) {
    disconnectWebSocket()
    // 等待断开完成
    setTimeout(() => {
      doConnect()
    }, 500)
    return stompClient
  }

  doConnect()
  return stompClient
}

/**
 * 执行连接
 */
function doConnect() {
  // 如果超过最大重连次数，停止重连
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('WebSocket重连次数超过限制，停止重连')
    reconnectAttempts = 0
    return
  }

  try {
    // 创建SockJS连接
    socket = new SockJS('http://localhost:8080/ws')
    stompClient = Stomp.over(socket)

    // 禁用调试信息
    stompClient.debug = () => {}

    // 设置连接超时
    stompClient.heartbeat.outgoing = 3000 // 3秒发送一次心跳
    stompClient.heartbeat.incoming = 3000 // 3秒接收一次心跳

    // 监听socket连接错误
    socket.onerror = (error) => {
      console.error('WebSocket socket错误:', error)
      handleDisconnect()
    }

    socket.onclose = (event) => {
      console.warn('WebSocket socket关闭:', event)
      if (!isManualDisconnect) {
        handleDisconnect()
      }
    }

    // 连接WebSocket
    stompClient.connect(
      {},
      () => {
        console.log('WebSocket连接成功')
        reconnectAttempts = 0 // 重置重连次数

        // 清除重连定时器
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }

        // 清除旧的订阅
        subscriptions.forEach(sub => {
          try {
            sub.unsubscribe()
          } catch (e) {
            console.warn('取消订阅失败:', e)
          }
        })
        subscriptions = []

        // 订阅拍卖相关消息
        if (savedCallbacks && savedCallbacks.onAuctionUpdate) {
          const sub = stompClient.subscribe('/topic/auction', (message) => {
            try {
              const data = JSON.parse(message.body)
              if (data.code === 200) {
                savedCallbacks.onAuctionUpdate(data)
              }
            } catch (e) {
              console.error('处理拍卖消息失败:', e)
            }
          })
          subscriptions.push(sub)
        }

        // 订阅竞价消息
        if (savedCallbacks && savedCallbacks.onBidUpdate) {
          const sub = stompClient.subscribe('/topic/bid', (message) => {
            try {
              const data = JSON.parse(message.body)
              if (data.code === 200) {
                savedCallbacks.onBidUpdate(data)
              }
            } catch (e) {
              console.error('处理竞价消息失败:', e)
            }
          })
          subscriptions.push(sub)
        }

        // 订阅队员分配消息
        if (savedCallbacks && savedCallbacks.onPlayerAssigned) {
          const sub = stompClient.subscribe('/topic/assignment', (message) => {
            try {
              const data = JSON.parse(message.body)
              if (data.code === 200) {
                savedCallbacks.onPlayerAssigned(data)
              }
            } catch (e) {
              console.error('处理分配消息失败:', e)
            }
          })
          subscriptions.push(sub)
        }

        // 订阅系统状态更新
        if (savedCallbacks && savedCallbacks.onSystemStatusUpdate) {
          const sub = stompClient.subscribe('/topic/system-status', (message) => {
            try {
              const data = JSON.parse(message.body)
              if (data.code === 200) {
                savedCallbacks.onSystemStatusUpdate(data.data)
              }
            } catch (e) {
              console.error('处理系统状态消息失败:', e)
            }
          })
          subscriptions.push(sub)
        }

        // 启动心跳检测
        startHeartbeat()
      },
      (error) => {
        console.error('WebSocket连接失败:', error)
        handleDisconnect()
      }
    )
  } catch (error) {
    console.error('创建WebSocket连接异常:', error)
    handleDisconnect()
  }
}

/**
 * 处理断开连接
 */
function handleDisconnect() {
  // 停止心跳
  stopHeartbeat()

  // 清理订阅
  subscriptions.forEach(sub => {
    try {
      sub.unsubscribe()
    } catch (e) {
      // 忽略错误
    }
  })
  subscriptions = []

  // 如果不是手动断开，则尝试重连
  if (!isManualDisconnect && savedCallbacks && savedSessionId) {
    reconnectAttempts++
    console.log(`WebSocket断开，${RECONNECT_DELAY / 1000}秒后尝试重连 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }
    
    reconnectTimer = setTimeout(() => {
      doConnect()
    }, RECONNECT_DELAY)
  }
}

/**
 * 启动心跳检测
 */
function startHeartbeat() {
  stopHeartbeat()
  
  heartbeatTimer = setInterval(() => {
    if (stompClient && stompClient.connected) {
      // 检查连接状态
      try {
        // SockJS readyState: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
        if (socket && socket.readyState === 1) {
          // 连接正常
        } else {
          console.warn('心跳检测：连接已断开，readyState=' + (socket ? socket.readyState : 'null'))
          handleDisconnect()
        }
      } catch (e) {
        console.warn('心跳检测失败:', e)
        handleDisconnect()
      }
    } else {
      console.warn('心跳检测：stompClient未连接')
      handleDisconnect()
    }
  }, HEARTBEAT_INTERVAL)
}

/**
 * 停止心跳检测
 */
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

/**
 * 断开WebSocket连接
 */
export function disconnectWebSocket() {
  isManualDisconnect = true
  reconnectAttempts = 0

  // 停止心跳
  stopHeartbeat()

  // 清除重连定时器
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  // 取消所有订阅
  subscriptions.forEach(sub => {
    try {
      sub.unsubscribe()
    } catch (e) {
      console.warn('取消订阅失败:', e)
    }
  })
  subscriptions = []

  // 断开连接
  if (stompClient) {
    try {
      if (stompClient.connected) {
        stompClient.disconnect(() => {
          console.log('WebSocket已断开')
        })
      }
    } catch (e) {
      console.warn('断开连接时出错:', e)
    }
    stompClient = null
  }

  // 关闭socket
  if (socket) {
    try {
      socket.close()
    } catch (e) {
      console.warn('关闭socket时出错:', e)
    }
    socket = null
  }

  // 清理保存的数据
  savedCallbacks = null
  savedSessionId = null
}

/**
 * 检查WebSocket连接状态
 */
export function isWebSocketConnected() {
  // SockJS readyState: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
  return stompClient && stompClient.connected && socket && socket.readyState === 1
}
