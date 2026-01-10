<template>
  <div class="auction-room">
    <el-container class="room-container">
      <el-header class="room-header">
        <div class="header-left">
          <el-button type="text" @click="$router.push('/sessions')" :icon="ArrowLeft">返回</el-button>
          <h2>{{ sessionInfo?.sessionName || '拍卖大厅' }}</h2>
        </div>
        <div class="header-right">
          <el-tag :type="sessionStatusType" size="large">{{ sessionStatusText }}</el-tag>
          <span class="user-name">{{ userInfo?.username }}</span>
        </div>
      </el-header>

      <el-main class="room-main">
        <el-row :gutter="20">
          <!-- 左侧：当前拍卖 -->
          <el-col :span="16">
            <el-card class="auction-card" shadow="never">
              <template #header>
                <div class="card-title">
                  <el-icon><Trophy /></el-icon>
                  <span>当前拍卖</span>
                </div>
              </template>
              
              <div v-if="currentAuction" class="auction-content">
                <div class="player-info">
                  <div class="player-avatar">
                    <el-avatar :size="100" :icon="User" />
                  </div>
                  <div class="player-details">
                    <h3>{{ currentAuction.playerName || currentAuction.playerGroupName || '未知' }}</h3>
                    <div class="player-meta">
                      <el-tag v-if="currentAuction.playerPosition">{{ currentAuction.playerPosition }}</el-tag>
                      <el-tag v-if="currentAuction.playerCost" type="success">¥{{ currentAuction.playerCost }}</el-tag>
                    </div>
                    <div class="player-stats">
                      <p><strong>群内名字：</strong>{{ currentAuction.playerGroupName || '-' }}</p>
                      <p><strong>游戏ID：</strong>{{ currentAuction.playerGameId || '-' }}</p>
                      <p><strong>擅长位置：</strong>{{ currentAuction.playerPosition || '-' }}</p>
                      <p><strong>擅长英雄：</strong>{{ currentAuction.playerHeroes || '-' }}</p>
                    </div>
                  </div>
                </div>

                <el-divider />

                <div class="auction-status">
                  <div class="time-info">
                    <el-icon><Clock /></el-icon>
                    <span v-if="timeLeft > 0">剩余时间：{{ formatTime(timeLeft) }}</span>
                    <span v-else class="time-up">拍卖已结束</span>
                  </div>
                  <div class="highest-bid">
                    <div class="bid-label">当前最高价</div>
                    <div class="bid-amount">
                      ¥{{ currentAuction.highestBidAmount || 0 }}
                    </div>
                    <div class="bid-team" v-if="currentAuction.highestBidTeamName">
                      出价队伍：{{ currentAuction.highestBidTeamName }}
                    </div>
                  </div>
                </div>

                <!-- 竞价区域（仅队长） -->
                <div v-if="isCaptain && currentAuction.status === 'ACTIVE' && timeLeft > 0" class="bid-section">
                  <el-form :model="bidForm" inline>
                    <el-form-item label="出价金额">
                      <el-input-number
                        v-model="bidForm.amount"
                        :min="(currentAuction.highestBidAmount || 0) + 1"
                        :precision="2"
                        :step="10"
                        size="large"
                        style="width: 200px"
                      />
                    </el-form-item>
                    <el-form-item>
                      <el-button
                        type="primary"
                        size="large"
                        :loading="bidding"
                        @click="handleBid"
                        :disabled="!canBid"
                      >
                        出价
                      </el-button>
                    </el-form-item>
                  </el-form>
                  <div class="bid-tip">出价必须高于当前最高价</div>
                </div>
              </div>

              <el-empty v-else description="暂无进行中的拍卖" />
            </el-card>

            <!-- 竞价历史 -->
            <el-card class="bids-card" shadow="never" style="margin-top: 20px">
              <template #header>
                <div class="card-title">
                  <el-icon><List /></el-icon>
                  <span>竞价记录</span>
                </div>
              </template>
              <el-timeline>
                <el-timeline-item
                  v-for="(bid, index) in bidHistory"
                  :key="index"
                  :timestamp="formatDateTime(bid.bidTime)"
                  placement="top"
                >
                  <el-card shadow="hover">
                    <div class="bid-item">
                      <div class="bid-team-name">{{ bid.teamName || '未知队伍' }}</div>
                      <div class="bid-amount">¥{{ bid.amount }}</div>
                      <el-tag v-if="bid.isWinner" type="success" size="small">获胜</el-tag>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
              <el-empty v-if="bidHistory.length === 0" description="暂无竞价记录" />
            </el-card>
          </el-col>

          <!-- 右侧：队伍信息 -->
          <el-col :span="8">
            <el-card class="teams-card" shadow="never">
              <template #header>
                <div class="card-title">
                  <el-icon><UserFilled /></el-icon>
                  <span>队伍信息</span>
                </div>
              </template>
              <div class="teams-list">
                <div
                  v-for="team in teams"
                  :key="team.id"
                  class="team-item"
                  :class="{ 'my-team': team.captainId === userInfo?.userId }"
                >
                  <div class="team-header">
                    <h4>{{ team.teamName }}</h4>
                    <el-tag size="small">{{ team.playerCount }}/4</el-tag>
                  </div>
                  <div class="team-captain">队长：{{ team.captainName }}</div>
                  <div class="team-players">
                    <div v-for="player in team.players" :key="player.id" class="player-tag">
                      {{ player.groupName || player.gameId }}
                    </div>
                    <div v-if="team.players.length === 0" class="no-players">暂无队员</div>
                  </div>
                </div>
              </div>
            </el-card>

            <!-- 待拍卖池 -->
            <el-card class="pool-card" shadow="never" style="margin-top: 20px">
              <template #header>
                <div class="card-title">
                  <el-icon><Box /></el-icon>
                  <span>待拍卖池</span>
                  <el-tag size="small" type="info">{{ poolPlayers.length }}</el-tag>
                </div>
              </template>
              <div class="pool-list">
                <div v-for="player in poolPlayers" :key="player.id" class="pool-item">
                  {{ player.groupName || player.gameId }}
                </div>
                <el-empty v-if="poolPlayers.length === 0" description="待拍卖池为空" :image-size="80" />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, Trophy, User, Clock, List, UserFilled, Box
} from '@element-plus/icons-vue'
import { getSession, activateSession } from '../api/session'
import { placeBid, getCurrentAuction, getBids, startAuction, finishAuction } from '../api/auction'
import { getPoolPlayers, getTeams } from '../api/player'

const route = useRoute()
const router = useRouter()
const sessionId = route.params.sessionId

const sessionInfo = ref(null)
const currentAuction = ref(null)
const teams = ref([])
const poolPlayers = ref([])
const bidHistory = ref([])
const bidding = ref(false)
const timeLeft = ref(0)
let timer = null

const userInfo = computed(() => {
  const info = localStorage.getItem('userInfo')
  return info ? JSON.parse(info) : null
})

const isCaptain = computed(() => userInfo.value?.userType === 'CAPTAIN')
const isAdmin = computed(() => userInfo.value?.userType === 'ADMIN')

const sessionStatusType = computed(() => {
  const map = {
    'CREATED': 'info',
    'ACTIVE': 'success',
    'FINISHED': 'warning'
  }
  return map[sessionInfo.value?.status] || 'info'
})

const sessionStatusText = computed(() => {
  const map = {
    'CREATED': '已创建',
    'ACTIVE': '进行中',
    'FINISHED': '已结束'
  }
  return map[sessionInfo.value?.status] || '未知'
})

const canBid = computed(() => {
  if (!currentAuction.value || !bidForm.amount) return false
  return bidForm.amount > (currentAuction.value.highestBidAmount || 0)
})

const bidForm = reactive({
  amount: 0
})

const loadSessionInfo = async () => {
  try {
    const res = await getSession(sessionId)
    if (res.code === 200) {
      sessionInfo.value = res.data
    }
  } catch (error) {
    ElMessage.error('加载失败')
  }
}

const loadAuctionData = async () => {
  try {
    const res = await getCurrentAuction(sessionId)
    if (res.code === 200 && res.data) {
      currentAuction.value = res.data
      if (currentAuction.value.endTime) {
        updateTimeLeft()
      }
      loadBidHistory(currentAuction.value.id)
    } else {
      currentAuction.value = null
    }
  } catch (error) {
    console.error('加载拍卖数据失败', error)
  }
}

const loadBidHistory = async (auctionId) => {
  try {
    const res = await getBids(auctionId)
    if (res.code === 200) {
      bidHistory.value = (res.data || []).reverse()
    }
  } catch (error) {
    console.error('加载竞价历史失败', error)
  }
}

const loadTeams = async () => {
  try {
    const res = await getTeams(sessionId)
    if (res.code === 200) {
      teams.value = res.data || []
    }
  } catch (error) {
    console.error('加载队伍失败', error)
  }
}

const loadPoolPlayers = async () => {
  try {
    const res = await getPoolPlayers(sessionId)
    if (res.code === 200) {
      poolPlayers.value = res.data || []
    }
  } catch (error) {
    console.error('加载待拍卖池失败', error)
  }
}

const handleBid = async () => {
  if (!canBid.value) {
    ElMessage.warning('出价必须高于当前最高价')
    return
  }

  bidding.value = true
  try {
    const res = await placeBid({
      auctionId: currentAuction.value.id,
      amount: bidForm.amount
    })
    if (res.code === 200) {
      ElMessage.success('出价成功')
      bidForm.amount = 0
      loadAuctionData()
    } else {
      ElMessage.error(res.message || '出价失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '出价失败')
  } finally {
    bidding.value = false
  }
}

const updateTimeLeft = () => {
  if (!currentAuction.value?.endTime) return
  
  const endTime = new Date(currentAuction.value.endTime).getTime()
  const now = Date.now()
  const diff = Math.max(0, Math.floor((endTime - now) / 1000))
  
  timeLeft.value = diff
  
  if (diff > 0 && !timer) {
    timer = setInterval(() => {
      timeLeft.value = Math.max(0, timeLeft.value - 1)
      if (timeLeft.value === 0) {
        clearInterval(timer)
        timer = null
        loadAuctionData() // 重新加载数据
      }
    }, 1000)
  }
}

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadSessionInfo()
  loadAuctionData()
  loadTeams()
  loadPoolPlayers()
  
  // 定时刷新数据
  const refreshTimer = setInterval(() => {
    loadAuctionData()
    loadTeams()
    loadPoolPlayers()
  }, 5000)
  
  onUnmounted(() => {
    clearInterval(refreshTimer)
    if (timer) {
      clearInterval(timer)
    }
  })
})
</script>

<style scoped>
.auction-room {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.room-container {
  min-height: 100vh;
}

.room-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  color: #667eea;
  font-size: 24px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-name {
  color: #666;
  font-size: 14px;
}

.room-main {
  padding: 30px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

.auction-card, .bids-card, .teams-card, .pool-card {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.auction-content {
  padding: 20px 0;
}

.player-info {
  display: flex;
  gap: 30px;
  align-items: center;
}

.player-avatar {
  flex-shrink: 0;
}

.player-details h3 {
  margin: 0 0 15px 0;
  font-size: 24px;
  color: #333;
}

.player-meta {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
}

.player-stats {
  color: #666;
  line-height: 1.8;
}

.player-stats .cost {
  color: #f56c6c;
  font-size: 20px;
  font-weight: 600;
}

.auction-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  margin: 20px 0;
}

.time-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  color: #333;
}

.time-up {
  color: #f56c6c;
  font-weight: 600;
}

.highest-bid {
  text-align: right;
}

.bid-label {
  font-size: 14px;
  color: #999;
  margin-bottom: 5px;
}

.bid-amount {
  font-size: 32px;
  font-weight: 700;
  color: #f56c6c;
  margin-bottom: 5px;
}

.bid-team {
  font-size: 12px;
  color: #666;
}

.bid-section {
  padding: 20px;
  background: #fff7e6;
  border-radius: 8px;
  margin-top: 20px;
}

.bid-tip {
  font-size: 12px;
  color: #999;
  margin-top: 10px;
}

.bid-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bid-team-name {
  font-weight: 600;
  color: #333;
}

.teams-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.team-item {
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.team-item.my-team {
  border-color: #667eea;
  background: #ecf5ff;
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.team-header h4 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.team-captain {
  font-size: 12px;
  color: #666;
  margin-bottom: 10px;
}

.team-players {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.player-tag {
  padding: 4px 12px;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.no-players {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.pool-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pool-item {
  padding: 10px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.pool-item:hover {
  background: #e4e7ed;
  cursor: pointer;
}
</style>
