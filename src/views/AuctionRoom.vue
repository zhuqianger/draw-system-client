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
          <el-button
            v-if="isAdmin"
            type="success"
            :icon="Download"
            @click="handleExportTeams"
            :loading="exporting"
            size="large"
          >
            导出队伍信息
          </el-button>
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
                    v-if="currentAuction && currentAuction.status === 'WAITING'"
                    type="success"
                    :icon="VideoPlay"
                    @click="handleBeginAuction"
                    :loading="beginning"
                    size="large"
                  >
                    开始拍卖
                  </el-button>
                  <el-button
                    v-if="currentAuction && (currentAuction.status === 'FIRST_PHASE' || currentAuction.status === 'PICKUP_PHASE')"
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
                  <span v-if="currentAuction.status === 'WAITING'" class="time-text">等待管理员开始拍卖</span>
                  <span v-else-if="currentAuction.status === 'FIRST_PHASE'">
                    <el-tag type="primary" size="large">第一阶段</el-tag>
                    <span v-if="timeLeft > 0" class="time-text" style="margin-left: 10px;">剩余时间：{{ formatTime(timeLeft) }}</span>
                    <span v-else-if="currentAuction.highestBidAmount && currentAuction.maxPrice && currentAuction.highestBidAmount >= currentAuction.maxPrice" class="time-up" style="color: #67c23a; font-weight: bold; margin-left: 10px;">已出到最高价，等待管理员确认</span>
                    <span v-else class="time-up" style="color: #f56c6c; font-weight: bold; margin-left: 10px;">倒计时已结束，等待管理员确认</span>
                  </span>
                  <span v-else-if="currentAuction.status === 'PICKUP_PHASE'">
                    <el-tag type="warning" size="large">捡漏环节</el-tag>
                    <span v-if="timeLeft > 0" class="time-text" style="margin-left: 10px;">剩余时间：{{ formatTime(timeLeft) }}</span>
                    <span v-else-if="currentAuction.highestBidAmount && currentAuction.maxPrice && currentAuction.highestBidAmount >= currentAuction.maxPrice" class="time-up" style="color: #67c23a; font-weight: bold; margin-left: 10px;">已出到最高价，等待管理员确认</span>
                    <span v-else class="time-up" style="color: #f56c6c; font-weight: bold; margin-left: 10px;">倒计时已结束，等待管理员确认</span>
                  </span>
                  <span v-else class="time-up">拍卖已结束</span>
                </div>
                <div class="highest-bid">
                  <div class="bid-label">起拍价：¥{{ formatPriceSafe(currentAuction.startingPrice, 'starting') }}</div>
                  <div class="bid-label">最高价：¥{{ formatPriceSafe(currentAuction.maxPrice, 'max') }}</div>
                  <div class="bid-label">当前最高价</div>
                  <div class="bid-amount">¥{{ currentAuction.highestBidAmount || 0 }}</div>
                  <div class="bid-team" v-if="currentAuction.highestBidTeamName">
                    出价队伍：{{ currentAuction.highestBidTeamName }}
                  </div>
                </div>
              </div>

              <!-- 竞价区域（仅队长） -->
              <div v-if="isCaptain && (currentAuction.status === 'FIRST_PHASE' || currentAuction.status === 'PICKUP_PHASE') && timeLeft > 0 && timeLeft <= (currentAuction.duration || (currentAuction.status === 'FIRST_PHASE' ? 30 : 20) - 5)" class="bid-section">
                <div v-if="myTeam" class="team-cost-info">
                  <el-alert
                    :type="myTeam.nowCost > 0 ? 'info' : 'warning'"
                    :closable="false"
                    show-icon
                  >
                    <template #title>
                      <span>队伍剩余费用：<strong>¥{{ myTeam.nowCost?.toFixed(2) || '0.00' }}</strong></span>
                    </template>
                  </el-alert>
                </div>
                <el-form :model="bidForm" inline class="bid-form">
                  <el-form-item label="出价金额">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <el-button
                        circle
                        size="small"
                        @click="decreaseBid"
                        :icon="Minus"
                        style="flex-shrink: 0;"
                      />
                      <el-input-number
                        v-model="bidForm.amount"
                        :min="minBidAmount"
                        :max="maxBidAmount"
                        :precision="1"
                        :step="0.5"
                        size="large"
                        style="width: 180px"
                        @blur="adjustBidAmount"
                        @change="adjustBidAmount"
                      />
                      <el-button
                        circle
                        size="small"
                        @click="increaseBid"
                        :icon="Plus"
                        style="flex-shrink: 0;"
                      />
                    </div>
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
                <div class="bid-tip">
                  <div>费用下限（起拍价）：¥{{ currentAuction.startingPrice?.toFixed(2) || '0.00' }}，费用上限（基础定价+3）：¥{{ currentAuction.maxPrice?.toFixed(2) || '0.00' }}</div>
                  <div v-if="currentAuction.highestBidAmount">当前最高价：¥{{ currentAuction.highestBidAmount.toFixed(2) }}，最低出价：¥{{ minBidAmount.toFixed(2) }}</div>
                  <div v-else>最低出价（起拍价）：¥{{ minBidAmount.toFixed(2) }}</div>
                  <div style="margin-top: 5px;">出价必须是0.5的倍数，每次加价最少0.5</div>
                  <div v-if="timeLeft > (currentAuction.duration || (currentAuction.status === 'FIRST_PHASE' ? 30 : 20) - 5)" style="margin-top: 5px; color: #f56c6c;">
                    等待期：拍卖开始后5秒内不能出价（剩余等待时间：{{ Math.max(0, timeLeft - (currentAuction.duration || (currentAuction.status === 'FIRST_PHASE' ? 30 : 20) - 5)) }}秒）
                  </div>
                  <div v-if="myTeam && myTeam.nowCost !== null && myTeam.nowCost !== undefined" style="margin-top: 5px;">
                    剩余费用：¥{{ myTeam.nowCost.toFixed(2) }}，最高可出：¥{{ maxBidAmount.toFixed(1) }}（受费用上限和剩余费用限制）
                  </div>
                  <div v-if="myTeam" style="margin-top: 5px; color: #f56c6c;">
                    剩余费用必须≥还差的队员数（还需：{{ 4 - myTeam.playerCount }}个队员，剩余：¥{{ myTeam.nowCost?.toFixed(2) || '0.00' }}）
                  </div>
                </div>
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
                <div class="team-cost" v-if="team.nowCost !== null && team.nowCost !== undefined">
                  <el-tag type="warning" size="large" style="width: 100%; justify-content: center;">
                    <span>剩余费用：<strong>¥{{ team.nowCost.toFixed(2) }}</strong></span>
                  </el-tag>
                </div>
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
              <el-tooltip
                v-for="player in poolPlayers"
                :key="player.id"
                placement="right"
                :show-after="300"
                :hide-after="0"
                effect="dark"
                popper-class="player-tooltip"
              >
                <template #content>
                  <div class="player-tooltip-content">
                    <div class="tooltip-header">
                      <h4>{{ player.groupName || player.gameId || '未知' }}</h4>
                    </div>
                    <div class="tooltip-body">
                      <div class="tooltip-item" v-if="player.gameId">
                        <span class="tooltip-label">游戏ID：</span>
                        <span class="tooltip-value">{{ player.gameId }}</span>
                      </div>
                      <div class="tooltip-item" v-if="player.rank">
                        <span class="tooltip-label">段位：</span>
                        <span class="tooltip-value">{{ player.rank }}</span>
                      </div>
                      <div class="tooltip-item" v-if="player.position">
                        <span class="tooltip-label">擅长位置：</span>
                        <span class="tooltip-value">{{ player.position }}</span>
                      </div>
                      <div class="tooltip-item" v-if="player.heroes">
                        <span class="tooltip-label">自我介绍：</span>
                        <span class="tooltip-value">{{ player.heroes }}</span>
                      </div>
                      <div class="tooltip-item" v-if="player.cost !== null && player.cost !== undefined">
                        <span class="tooltip-label">费用：</span>
                        <span class="tooltip-value highlight">¥{{ player.cost.toFixed(2) }}</span>
                      </div>
                    </div>
                  </div>
                </template>
                <el-tag
                  class="pool-item"
                  size="small"
                >
                  {{ player.groupName || player.gameId }}
                </el-tag>
              </el-tooltip>
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
  ArrowLeft, Trophy, User, Clock, List, UserFilled, Box, Refresh, CircleClose, Money, Download, VideoPlay,
  Plus,
  Minus
} from '@element-plus/icons-vue'
import { getSession } from '../api/session'
import { placeBid, getCurrentAuction, getBids, createAuction, beginAuction, finishAuction } from '../api/auction'
import { getPoolPlayers, getTeams, exportTeams } from '../api/player'
import { connectWebSocket, disconnectWebSocket } from '../utils/websocket'

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
const beginning = ref(false)
const finishing = ref(false)
const exporting = ref(false)
const timeLeft = ref(0)
let timer = null

const userInfo = computed(() => {
  const info = sessionStorage.getItem('userInfo')
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

const myTeam = computed(() => {
  if (!userInfo.value?.userId) return null
  return teams.value.find(t => t.userId === userInfo.value.userId)
})

// 计算最低出价（费用下限：起拍价）
const minBidAmount = computed(() => {
  if (!currentAuction.value) return 0
  const startingPrice = currentAuction.value.startingPrice || 0
  
  if (currentAuction.value.highestBidAmount) {
    // 如果已有出价，最低出价 = 当前最高价 + 0.5，但不能低于起拍价
    const minFromHighest = currentAuction.value.highestBidAmount + 0.5
    return Math.max(minFromHighest, startingPrice)
  } else {
    // 如果没有出价，最低出价 = 起拍价（费用下限）
    return startingPrice
  }
})

// 计算最高可出价（费用上限：基础定价+3，同时考虑剩余费用）
const maxBidAmount = computed(() => {
  // 费用上限：基础定价 + 3（即maxPrice）
  const maxFromAuction = currentAuction.value?.maxPrice || Infinity
  
  if (!myTeam.value || myTeam.value.nowCost === null || myTeam.value.nowCost === undefined) {
    return maxFromAuction
  }
  
  // 将剩余费用向下取整到0.5的倍数
  const maxFromCost = Math.floor(myTeam.value.nowCost / 0.5) * 0.5
  
  // 取两者中的较小值：剩余费用限制 和 费用上限（基础定价+3）
  return Math.min(maxFromCost, maxFromAuction)
})

// 将金额调整为0.5的倍数
const roundToHalf = (value) => {
  return Math.round(value * 2) / 2
}

// 调整出价金额为0.5的倍数
const adjustBidAmount = () => {
  if (bidForm.amount !== null && bidForm.amount !== undefined) {
    bidForm.amount = roundToHalf(bidForm.amount)
  }
}

// 外部加号按钮：设置出价为最高价（考虑剩余费用和费用上限）
const increaseBid = () => {
  bidForm.amount = roundToHalf(maxBidAmount.value)
}

// 外部减号按钮：设置出价为最低价（起拍价或当前最高价+0.5）
const decreaseBid = () => {
  bidForm.amount = roundToHalf(minBidAmount.value)
}

const canBid = computed(() => {
  if (!currentAuction.value || bidForm.amount === null || bidForm.amount === undefined) return false
  if (currentAuction.value.status !== 'FIRST_PHASE' && currentAuction.value.status !== 'PICKUP_PHASE') return false
  if (timeLeft.value <= 0) return false
  
  // 检查是否已经过了5秒的等待期
  // 第一阶段：30秒，需要剩余时间<=25秒才能出价（即开始后5秒）
  // 捡漏阶段：20秒，需要剩余时间<=15秒才能出价（即开始后5秒）
  const duration = currentAuction.value.duration || (currentAuction.value.status === 'FIRST_PHASE' ? 30 : 20)
  const minTimeLeft = duration - 5 // 需要剩余时间<=这个值才能出价
  if (timeLeft.value > minTimeLeft) {
    return false // 还没到可以出价的时间
  }
  
  // 检查出价是否是0.5的倍数
  const remainder = Math.abs(bidForm.amount % 0.5)
  if (remainder > 0.001 && remainder < 0.499) {
    return false
  }
  
  // 检查出价是否低于最低出价（费用下限：起拍价）
  if (bidForm.amount < minBidAmount.value) return false
  
  // 检查出价是否低于起拍价（费用下限）
  const startingPrice = currentAuction.value.startingPrice || 0
  if (bidForm.amount < startingPrice) return false
  
  // 检查出价是否超过最高价（费用上限：基础定价+3）
  const maxPrice = currentAuction.value.maxPrice
  if (maxPrice !== null && maxPrice !== undefined && bidForm.amount > maxPrice) return false
  
  // 检查出价是否超过最高可出价（考虑剩余费用和费用上限）
  if (bidForm.amount > maxBidAmount.value) return false
  
  // 检查出价后剩余费用是否足够：出价后剩余费用必须 >= 还差的队员数-1（因为出价后要减去这个出价，还要再招remainingSlots-1个队员）
  // 总共需要4个队员（不包括队长），还差 remainingSlots 个队员
  if (myTeam.value) {
    const remainingSlots = 4 - myTeam.value.playerCount // 还差几个队员（不包括队长）
    if (myTeam.value.nowCost === null || myTeam.value.nowCost === undefined) {
      return false
    }
    const remainingCostAfterBid = myTeam.value.nowCost - bidForm.amount
    if (remainingSlots > 1 && remainingCostAfterBid < (remainingSlots - 1)) {
      return false
    }
  }
  
  return true
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
      // 保存旧的价格数据和其他关键数据，避免刷新时闪烁
      const oldStartingPrice = currentAuction.value?.startingPrice
      const oldMaxPrice = currentAuction.value?.maxPrice
      const oldPlayerId = currentAuction.value?.playerId
      const oldId = currentAuction.value?.id
      const oldEndTime = currentAuction.value?.endTime
      
      // 如果新数据和旧数据是同一个拍卖，使用智能合并策略
      const isSameAuction = oldId && res.data.id === oldId
      
      if (isSameAuction) {
        // 同一个拍卖，智能合并数据，保留价格信息
        const newData = res.data
        // 如果新数据中价格为空或无效，但旧数据有值，保持旧值
        if ((newData.startingPrice == null || newData.startingPrice === 0) && oldStartingPrice != null && oldStartingPrice !== 0) {
          newData.startingPrice = oldStartingPrice
        }
        if ((newData.maxPrice == null || newData.maxPrice === 0) && oldMaxPrice != null && oldMaxPrice !== 0) {
          newData.maxPrice = oldMaxPrice
        }
        
        // 如果倒计时已经过期，且新数据的endTime没有变化或更早，保持过期状态
        if (isTimeExpired && oldEndTime && newData.endTime) {
          const newEndTimeMs = new Date(newData.endTime).getTime()
          const oldEndTimeMs = new Date(oldEndTime).getTime()
          // 如果新endTime更早或相同，保持过期状态
          if (newEndTimeMs <= oldEndTimeMs) {
            currentAuction.value = newData
            // 不调用updateTimeLeft，保持过期状态
            loadBidHistory(currentAuction.value.id)
            return
          } else {
            // 如果新endTime更晚（不应该发生，但作为保护），重置过期状态
            isTimeExpired = false
          }
        }
        
        currentAuction.value = newData
      } else {
        // 不同的拍卖，直接使用新数据，重置过期标记
        isTimeExpired = false
        currentAuction.value = res.data
      }
      
      // 设置出价输入框的初始值为最低出价
      if (currentAuction.value.startingPrice) {
        bidForm.amount = currentAuction.value.highestBidAmount 
          ? currentAuction.value.highestBidAmount + 0.5 
          : currentAuction.value.startingPrice
      }
      if (currentAuction.value.endTime) {
        updateTimeLeft()
      } else {
        updateTimeLeft() // 即使没有endTime也要更新（处理WAITING状态）
      }
      loadBidHistory(currentAuction.value.id)
    } else {
      currentAuction.value = null
      isTimeExpired = false
      bidForm.amount = 0
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
    
    const res = await createAuction(sessionId, selectedPlayer.id)
    if (res.code === 200) {
      ElMessage.success(`已抽取：${selectedPlayer.groupName || selectedPlayer.gameId}，等待开始拍卖`)
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

const handleBeginAuction = async () => {
  if (!currentAuction.value) return
  
  beginning.value = true
  try {
    const res = await beginAuction(currentAuction.value.id)
    if (res.code === 200) {
      ElMessage.success('拍卖已开始')
      loadAuctionData()
    } else {
      ElMessage.error(res.message || '开始拍卖失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '开始拍卖失败')
  } finally {
    beginning.value = false
  }
}

// 管理员手动结束拍卖
const handleFinishAuction = async () => {
  if (!currentAuction.value) return
  
  // 保存当前价格数据，避免在刷新过程中丢失
  const savedStartingPrice = currentAuction.value.startingPrice
  const savedMaxPrice = currentAuction.value.maxPrice
  
  finishing.value = true
  try {
    const res = await finishAuction(currentAuction.value.id, false) // autoFinish=false，管理员手动结束
    if (res.code === 200) {
      if (res.message && res.message.includes('捡漏环节')) {
        ElMessage.success('第一阶段结束，进入捡漏环节')
      } else {
        ElMessage.success('拍卖已结束')
      }
      // 延迟一小段时间再刷新数据，避免与WebSocket推送冲突
      setTimeout(() => {
        loadAuctionData()
        loadTeams()
        loadPoolPlayers()
      }, 100)
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
    ElMessage.warning('出价不符合要求，请检查出价金额')
    return
  }

  bidding.value = true
  try {
    const res = await placeBid({
      auctionId: currentAuction.value.id,
      amount: bidForm.amount
    })
    if (res.code === 200) {
      // 出价成功
      if (currentAuction.value.maxPrice && bidForm.amount >= currentAuction.value.maxPrice) {
        ElMessage.success('出价达到最高价！倒计时已停止，请等待管理员确认结束拍卖')
      } else {
        ElMessage.success('出价成功')
      }
      bidForm.amount = 0
      // 立即刷新数据，获取更新后的endTime（如果达到最高价，endTime会被设置为当前时间）
      loadAuctionData()
      loadBidHistory(currentAuction.value.id)
      loadTeams() // 更新队伍信息（费用可能变化）
    } else {
      ElMessage.error(res.message || '出价失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '出价失败')
  } finally {
    bidding.value = false
  }
}

// 标记倒计时是否已结束，避免在已结束时重新启动倒计时
let isTimeExpired = false

const updateTimeLeft = () => {
  // 如果状态是WAITING，没有倒计时
  if (currentAuction.value?.status === 'WAITING') {
    timeLeft.value = 0
    isTimeExpired = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    return
  }
  
  if (!currentAuction.value?.endTime) {
    timeLeft.value = 0
    isTimeExpired = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    return
  }
  
  const endTime = new Date(currentAuction.value.endTime).getTime()
  const now = Date.now()
  const diff = Math.max(0, Math.floor((endTime - now) / 1000))
  
  // 如果倒计时已经结束过，且新数据仍然显示已过期，直接设置为0，不再重新计算
  if (isTimeExpired && diff <= 0) {
    timeLeft.value = 0
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    return
  }
  
  // 如果diff > 0，重置过期标记
  if (diff > 0) {
    isTimeExpired = false
  }
  
  timeLeft.value = diff
  
  if (diff > 0 && !timer) {
    timer = setInterval(() => {
      timeLeft.value = Math.max(0, timeLeft.value - 1)
      // 倒计时结束后，标记为已过期，不再刷新数据（等待后端推送）
      if (timeLeft.value === 0) {
        isTimeExpired = true
        clearInterval(timer)
        timer = null
        // 不再调用loadAuctionData()，完全依赖后端WebSocket推送
      }
    }, 1000)
  } else if (diff <= 0) {
    // 如果计算出的diff <= 0，标记为已过期
    isTimeExpired = true
    timeLeft.value = 0
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 安全的价格格式化函数，避免在数据更新时闪烁
// 使用闭包保存上一次的有效价格值
const formatPriceSafe = (() => {
  let lastStartingPrice = null
  let lastMaxPrice = null
  
  return (price, type = 'default') => {
    // 如果价格为null、undefined，使用上一次保存的有效值
    if (price == null || price === undefined) {
      if (type === 'starting') {
        if (lastStartingPrice != null) {
          return lastStartingPrice.toFixed(2)
        }
      } else if (type === 'max') {
        if (lastMaxPrice != null) {
          return lastMaxPrice.toFixed(2)
        }
      }
      // 如果当前拍卖存在，尝试从currentAuction中获取
      if (currentAuction.value) {
        const fallbackPrice = type === 'starting' 
          ? currentAuction.value.startingPrice 
          : currentAuction.value.maxPrice
        if (fallbackPrice != null && fallbackPrice !== 0) {
          return fallbackPrice.toFixed(2)
        }
      }
      // 返回占位符，避免显示0.00造成误解
      return '--'
    }
    
    // 如果价格为0，也返回'0.00'
    if (price === 0) {
      return '0.00'
    }
    
    // 确保是数字类型
    const numPrice = typeof price === 'number' ? price : parseFloat(price)
    if (isNaN(numPrice)) {
      return '0.00'
    }
    
    // 保存有效的价格值
    if (type === 'starting') {
      lastStartingPrice = numPrice
    } else if (type === 'max') {
      lastMaxPrice = numPrice
    }
    
    return numPrice.toFixed(2)
  }
})()

// 保留原formatPrice函数用于其他地方
const formatPrice = (price) => {
  if (price == null || price === undefined || price === 0) {
    return '0.00'
  }
  const numPrice = typeof price === 'number' ? price : parseFloat(price)
  if (isNaN(numPrice)) {
    return '0.00'
  }
  return numPrice.toFixed(2)
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const handleExportTeams = async () => {
  exporting.value = true
  try {
    const blob = await exportTeams(sessionId)
    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `队伍信息_${sessionInfo.value?.sessionName || sessionId}_${Date.now()}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败', error)
    ElMessage.error('导出失败：' + (error.response?.data?.message || error.message))
  } finally {
    exporting.value = false
  }
}

// WebSocket回调函数
const handleAuctionUpdate = (data) => {
  // 拍卖开始或结束 - 不弹提示，只刷新数据（避免重复提示）
  // 使用防抖，避免频繁刷新导致闪烁
  if (handleAuctionUpdate.timer) {
    clearTimeout(handleAuctionUpdate.timer)
  }
  handleAuctionUpdate.timer = setTimeout(() => {
    loadAuctionData()
    loadTeams()
    loadPoolPlayers()
    handleAuctionUpdate.timer = null
  }, 50) // 50ms防抖
}

const handleBidUpdate = (data) => {
  // 有新竞价 - 不弹提示，只刷新数据（避免重复提示）
  if (currentAuction.value) {
    loadAuctionData()
    loadBidHistory(currentAuction.value.id)
  }
}

const handlePlayerAssigned = (data) => {
  // 队员已分配 - 不弹提示，只刷新数据（避免重复提示）
  loadAuctionData()
  loadTeams()
  loadPoolPlayers()
}

const handleSystemStatusUpdate = (status) => {
  // 系统状态更新（包含完整数据）
  if (status.currentAuction) {
    const oldStatus = currentAuction.value?.status
    const oldStartingPrice = currentAuction.value?.startingPrice
    const oldMaxPrice = currentAuction.value?.maxPrice
    const oldId = currentAuction.value?.id
    const oldEndTime = currentAuction.value?.endTime
    
    // 如果新数据和旧数据是同一个拍卖，使用智能合并策略
    const isSameAuction = oldId && status.currentAuction.id === oldId
    
    if (isSameAuction) {
      // 同一个拍卖，智能合并数据，保留价格信息
      const newData = status.currentAuction
      // 如果新数据中价格为空或无效，但旧数据有值，保持旧值
      if ((newData.startingPrice == null || newData.startingPrice === 0) && oldStartingPrice != null && oldStartingPrice !== 0) {
        newData.startingPrice = oldStartingPrice
      }
      if ((newData.maxPrice == null || newData.maxPrice === 0) && oldMaxPrice != null && oldMaxPrice !== 0) {
        newData.maxPrice = oldMaxPrice
      }
      
      // 如果旧数据已经过期，且新数据的endTime没有变化或更早，保持过期状态
      if (isTimeExpired && oldEndTime) {
        const newEndTime = newData.endTime ? new Date(newData.endTime).getTime() : null
        const oldEndTimeMs = new Date(oldEndTime).getTime()
        // 如果新endTime不存在或更早/相同，保持过期状态
        if (!newEndTime || newEndTime <= oldEndTimeMs) {
          // 保持过期状态，不更新倒计时
          currentAuction.value = newData
          return // 提前返回，不更新倒计时
        }
      }
      
      currentAuction.value = newData
    } else {
      // 不同的拍卖，直接使用新数据，重置过期标记
      isTimeExpired = false
      currentAuction.value = status.currentAuction
    }
    
    // 如果状态发生变化，更新倒计时
    if (currentAuction.value.endTime) {
      updateTimeLeft()
    }
    
    // 如果从第一阶段进入捡漏环节，重置过期标记并更新倒计时
    if (oldStatus === 'FIRST_PHASE' && currentAuction.value.status === 'PICKUP_PHASE') {
      isTimeExpired = false
      updateTimeLeft()
    }
    
    if (currentAuction.value.id) {
      loadBidHistory(currentAuction.value.id)
    }
  } else {
    currentAuction.value = null
    isTimeExpired = false
  }
  // 可以更新teams和poolPlayers，但为了保持sessionId过滤，还是调用API
  loadTeams()
  loadPoolPlayers()
}

onMounted(() => {
  loadSessionInfo()
  loadAuctionData()
  loadTeams()
  loadPoolPlayers()

  // 连接WebSocket
  connectWebSocket(sessionId, {
    onAuctionUpdate: handleAuctionUpdate,
    onBidUpdate: handleBidUpdate,
    onPlayerAssigned: handlePlayerAssigned,
    onSystemStatusUpdate: handleSystemStatusUpdate
  })
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
  // 断开WebSocket连接
  disconnectWebSocket()
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
  padding: 20px;
  background: linear-gradient(135deg, #fff7e6 0%, #ffecc7 100%);
  border-radius: 8px;
  margin-top: 16px;
  border: 2px solid rgba(255, 215, 0, 0.3);
}

.team-cost-info {
  margin-bottom: 18px;
}

.bid-form {
  margin-bottom: 12px;
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
  gap: 16px;
  padding: 4px;
}

.team-item {
  padding: 18px;
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
  margin-bottom: 14px;
}

.team-header h4 {
  margin: 0;
  color: #333;
  font-size: 16px;
  font-weight: 700;
}

.team-captain {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.team-cost {
  margin-bottom: 14px;
  display: flex;
  justify-content: center;
}

.team-cost .el-tag {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  font-size: 14px;
}

.team-players {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
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

/* 玩家信息悬浮窗样式 */
:deep(.player-tooltip) {
  max-width: 300px;
  padding: 0 !important;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.player-tooltip-content {
  padding: 12px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 8px;
}

.tooltip-header {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.tooltip-header h4 {
  margin: 0;
  color: #ffd700;
  font-size: 16px;
  font-weight: 700;
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tooltip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.tooltip-label {
  color: #909399;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.tooltip-value {
  color: #ffffff;
  flex: 1;
  word-break: break-word;
}

.tooltip-value.highlight {
  color: #67c23a;
  font-weight: 700;
  font-size: 14px;
}
</style>
