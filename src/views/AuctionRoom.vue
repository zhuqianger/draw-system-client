<template>
  <div class="auction-room-container">
    <div class="background-overlay"></div>
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <el-button type="text" @click="$router.push('/sessions')" :icon="ArrowLeft" size="large">
            返回
          </el-button>
          <h2>
            <el-icon :size="28"><Trophy /></el-icon>
            {{ sessionInfo?.sessionName || '拍卖大厅' }}
          </h2>
        </div>
        <div class="header-right">
          <el-tag :type="sessionStatusType" size="large">{{ sessionStatusText }}</el-tag>
          <span class="user-name">{{ userInfo?.username }}</span>
        </div>
      </div>
    </div>

    <div class="page-main">
      <el-row :gutter="20" style="flex: 1; overflow: hidden; display: flex;">
        <!-- 左侧：当前拍卖和竞价记录 -->
        <el-col :span="16" style="display: flex; flex-direction: column; overflow: hidden;">
          <el-card class="auction-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <div class="card-title">
                  <el-icon :size="24"><Trophy /></el-icon>
                  <span>当前拍卖</span>
                </div>
                <div v-if="isAdmin" class="card-actions">
                  <el-button
                    v-if="!currentAuction && poolPlayers.length > 0"
                    type="primary"
                    :icon="Refresh"
                    @click="handleRandomDraw"
                    :loading="drawing"
                    size="large"
                  >
                    摇号抽取
                  </el-button>
                  <el-button
                    v-if="currentAuction && currentAuction.status === 'ACTIVE'"
                    type="danger"
                    :icon="CircleClose"
                    @click="handleFinishAuction"
                    :loading="finishing"
                    size="large"
                  >
                    结束拍卖
                  </el-button>
                </div>
              </div>
            </template>
            
            <div v-if="currentAuction" class="auction-content">
              <div class="player-info">
                <div class="player-avatar">
                  <el-avatar :size="80" :icon="User" />
                </div>
                <div class="player-details">
                  <h3>{{ currentAuction.playerName || currentAuction.playerGroupName || '未知' }}</h3>
                  <div class="player-meta">
                    <el-tag v-if="currentAuction.playerPosition" size="large">{{ currentAuction.playerPosition }}</el-tag>
                    <el-tag v-if="currentAuction.playerRank" size="large" type="info">{{ currentAuction.playerRank }}</el-tag>
                    <el-tag v-if="currentAuction.playerCost" type="success" size="large">¥{{ currentAuction.playerCost }}</el-tag>
                  </div>
                  <div class="player-stats">
                    <p><strong>群内名字：</strong>{{ currentAuction.playerGroupName || '-' }}</p>
                    <p><strong>游戏ID：</strong>{{ currentAuction.playerGameId || '-' }}</p>
                    <p><strong>擅长位置：</strong>{{ currentAuction.playerPosition || '-' }}</p>
                    <p><strong>自我介绍：</strong>{{ currentAuction.playerHeroes || '-' }}</p>
                  </div>
                </div>
              </div>

              <el-divider />

              <div class="auction-status">
                <div class="time-info">
                  <el-icon :size="24"><Clock /></el-icon>
                  <span v-if="timeLeft > 0" class="time-text">剩余时间：{{ formatTime(timeLeft) }}</span>
                  <span v-else class="time-up">拍卖已结束</span>
                </div>
                <div class="highest-bid">
                  <div class="bid-label">当前最高价</div>
                  <div class="bid-amount">¥{{ currentAuction.highestBidAmount || 0 }}</div>
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
                      style="width: 220px"
                    />
                  </el-form-item>
                  <el-form-item>
                    <el-button
                      type="primary"
                      size="large"
                      :loading="bidding"
                      @click="handleBid"
                      :disabled="!canBid"
                      :icon="Money"
                    >
                      出价
                    </el-button>
                  </el-form-item>
                </el-form>
                <div class="bid-tip">出价必须高于当前最高价</div>
              </div>
            </div>

            <el-empty v-else description="暂无进行中的拍卖">
              <template #description>
                <p>暂无进行中的拍卖</p>
                <p v-if="isAdmin && poolPlayers.length > 0" style="color: #909399; font-size: 14px; margin-top: 10px;">
                  点击"摇号抽取"按钮随机抽取待拍卖池中的队员
                </p>
                <p v-else-if="poolPlayers.length === 0" style="color: #909399; font-size: 14px; margin-top: 10px;">
                  待拍卖池为空
                </p>
              </template>
            </el-empty>
          </el-card>

          <!-- 竞价历史 -->
          <el-card class="bids-card" shadow="hover" style="margin-top: 15px; flex: 1; display: flex; flex-direction: column; overflow: hidden;">
            <template #header>
              <div class="card-title">
                <el-icon :size="20"><List /></el-icon>
                <span>竞价记录</span>
              </div>
            </template>
            <div style="flex: 1; overflow-y: auto; min-height: 0;">
              <el-timeline>
                <el-timeline-item
                  v-for="(bid, index) in bidHistory"
                  :key="index"
                  :timestamp="formatDateTime(bid.bidTime)"
                  placement="top"
                  size="default"
                >
                  <el-card shadow="hover" class="bid-card">
                    <div class="bid-item">
                      <div class="bid-team-name">{{ bid.teamName || '未知队伍' }}</div>
                      <div class="bid-amount-large">¥{{ bid.amount }}</div>
                      <el-tag v-if="bid.isWinner" type="success" size="small">获胜</el-tag>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
              <el-empty v-if="bidHistory.length === 0" description="暂无竞价记录" :image-size="80" />
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：队伍信息和待拍卖池 -->
        <el-col :span="8" style="display: flex; flex-direction: column; overflow: hidden;">
          <el-card class="teams-card" shadow="hover" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
            <template #header>
              <div class="card-title">
                <el-icon :size="20"><UserFilled /></el-icon>
                <span>队伍信息</span>
              </div>
            </template>
            <div class="teams-list" style="flex: 1; overflow-y: auto; min-height: 0;">
              <div
                v-for="(team, index) in teams"
                :key="team.id"
                class="team-item"
                :class="{ 'my-team': team.userId === userInfo?.userId }"
              >
                <div class="team-header">
                  <h4>{{ index + 1 }}号队伍</h4>
                  <el-tag size="large" :type="team.playerCount >= 4 ? 'success' : 'info'">
                    {{ team.playerCount }}/4
                  </el-tag>
                </div>
                <div class="team-captain">队长：{{ team.captainName }}</div>
                <div class="team-players">
                  <el-tag
                    v-for="player in team.players"
                    :key="player.id"
                    class="player-tag"
                    size="large"
                  >
                    {{ player.groupName || player.gameId }}
                  </el-tag>
                  <div v-if="team.players.length === 0" class="no-players">暂无队员</div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 待拍卖池 -->
          <el-card class="pool-card" shadow="hover" style="margin-top: 15px; flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 200px;">
            <template #header>
              <div class="card-title">
                <el-icon :size="20"><Box /></el-icon>
                <span>待拍卖池</span>
                <el-tag size="small" type="info">{{ poolPlayers.length }}</el-tag>
              </div>
            </template>
            <div class="pool-list" style="flex: 1; overflow-y: auto; min-height: 0;">
                  <el-tag
                    v-for="player in poolPlayers"
                    :key="player.id"
                    class="pool-item"
                    size="small"
                  >
                    {{ player.groupName || player.gameId }}
                  </el-tag>
              <el-empty v-if="poolPlayers.length === 0" description="待拍卖池为空" :image-size="80" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, Trophy, User, Clock, List, UserFilled, Box, Refresh, CircleClose, Money
} from '@element-plus/icons-vue'
import { getSession } from '../api/session'
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
const drawing = ref(false)
const finishing = ref(false)
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

const handleRandomDraw = async () => {
  if (poolPlayers.value.length === 0) {
    ElMessage.warning('待拍卖池为空，无法摇号')
    return
  }
  
  drawing.value = true
  try {
    // 随机选择一个player
    const randomIndex = Math.floor(Math.random() * poolPlayers.value.length)
    const selectedPlayer = poolPlayers.value[randomIndex]
    
    const res = await startAuction(sessionId, selectedPlayer.id, 60)
    if (res.code === 200) {
      ElMessage.success(`已抽取：${selectedPlayer.groupName || selectedPlayer.gameId}`)
      loadAuctionData()
      loadPoolPlayers()
    } else {
      ElMessage.error(res.message || '摇号失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '摇号失败')
  } finally {
    drawing.value = false
  }
}

const handleFinishAuction = async () => {
  if (!currentAuction.value) return
  
  finishing.value = true
  try {
    const res = await finishAuction(currentAuction.value.id)
    if (res.code === 200) {
      ElMessage.success('拍卖已结束')
      loadAuctionData()
      loadTeams()
      loadPoolPlayers()
    } else {
      ElMessage.error(res.message || '结束拍卖失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '结束拍卖失败')
  } finally {
    finishing.value = false
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
      loadBidHistory(currentAuction.value.id)
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
        loadAuctionData()
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
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.auction-room-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-image: url('https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.background-overlay {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(13, 45, 83, 0.85) 0%, rgba(0, 20, 40, 0.9) 50%, rgba(13, 45, 83, 0.85) 100%);
  backdrop-filter: blur(2px);
  z-index: 0;
}

.page-header {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  height: 90px;
  border-bottom: 2px solid rgba(13, 45, 83, 0.1);
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 60px;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-left h2 {
  margin: 0;
  color: #0d2d53;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 1.5px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h2::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 32px;
  background: linear-gradient(135deg, #0d2d53 0%, #ffd700 100%);
  border-radius: 3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.user-name {
  color: #333;
  font-size: 18px;
  font-weight: 600;
  padding: 10px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 24px;
  border: 1px solid #e4e7ed;
}

.page-main {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 40px 60px;
  max-width: 1920px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.auction-card, .bids-card, .teams-card, .pool-card {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}

.auction-card:hover, .bids-card:hover, .teams-card:hover, .pool-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #0d2d53;
  letter-spacing: 0.5px;
}

.card-actions {
  display: flex;
  gap: 12px;
}

:deep(.el-card__header) {
  background: linear-gradient(135deg, #0d2d53 0%, #001428 100%);
  border-bottom: 2px solid rgba(255, 215, 0, 0.3);
  padding: 16px 20px;
  flex-shrink: 0;
}

:deep(.el-card__header .card-title) {
  color: #ffd700;
  text-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

:deep(.el-card__body) {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.auction-content {
  padding: 20px 0;
}

.player-info {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.player-avatar {
  flex-shrink: 0;
}

.player-details h3 {
  margin: 0 0 12px 0;
  font-size: 20px;
  color: #333;
  font-weight: 700;
}

.player-meta {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.player-stats {
  color: #606266;
  line-height: 1.6;
  font-size: 14px;
}

.player-stats p {
  margin: 6px 0;
}

.auction-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 8px;
  margin: 15px 0;
}

.time-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.time-text {
  color: #0d2d53;
}

.time-up {
  color: #f56c6c;
  font-weight: 700;
}

.highest-bid {
  text-align: right;
}

.bid-label {
  font-size: 16px;
  color: #909399;
  margin-bottom: 8px;
}

.bid-amount {
  font-size: 28px;
  font-weight: 700;
  color: #f56c6c;
  margin-bottom: 4px;
}

.bid-team {
  font-size: 14px;
  color: #666;
}

.bid-section {
  padding: 16px;
  background: linear-gradient(135deg, #fff7e6 0%, #ffecc7 100%);
  border-radius: 8px;
  margin-top: 15px;
  border: 2px solid rgba(255, 215, 0, 0.3);
}

.bid-tip {
  font-size: 14px;
  color: #909399;
  margin-top: 12px;
}

.bid-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.bid-team-name {
  font-weight: 700;
  color: #333;
  font-size: 16px;
  flex: 1;
}

.bid-amount-large {
  font-size: 24px;
  font-weight: 700;
  color: #f56c6c;
}

.bid-card {
  background: rgba(255, 255, 255, 0.95);
}

.teams-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.team-item {
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.team-item:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.team-item.my-team {
  border-color: #0d2d53;
  background: linear-gradient(135deg, #ecf5ff 0%, #e1f3ff 100%);
  box-shadow: 0 4px 20px rgba(13, 45, 83, 0.2);
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.team-header h4 {
  margin: 0;
  color: #333;
  font-size: 16px;
  font-weight: 700;
}

.team-captain {
  font-size: 12px;
  color: #666;
  margin-bottom: 10px;
}

.team-players {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.player-tag {
  font-size: 14px;
}

.no-players {
  font-size: 14px;
  color: #999;
  font-style: italic;
}

.pool-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px;
}

.pool-item {
  padding: 8px 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 6px;
  transition: all 0.2s;
  cursor: pointer;
  font-size: 13px;
}

.pool-item:hover {
  background: linear-gradient(135deg, #e4e7ed 0%, #f5f7fa 100%);
  transform: translateX(4px);
}

:deep(.el-divider) {
  margin: 15px 0;
  border-color: rgba(13, 45, 83, 0.1);
}

:deep(.el-timeline-item__timestamp) {
  color: #909399;
  font-size: 14px;
}

:deep(.el-empty__description) {
  color: #909399;
  font-size: 16px;
}
</style>
