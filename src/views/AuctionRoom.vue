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
        <el-col :span="8" style="display: flex; flex-direction: column; overflow: hidden;">
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
                    v-if="currentAuction && currentAuction.status === 'WAITING'"
                    type="warning"
                    :icon="Refresh"
                    @click="handleRedraw"
                    :loading="redrawing"
                    size="large"
                  >
                    重新抽选
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
              <div v-if="isCaptain && (currentAuction.status === 'FIRST_PHASE' || currentAuction.status === 'PICKUP_PHASE') && timeLeft > 0 && timeLeft <= (currentAuction.duration || (currentAuction.status === 'FIRST_PHASE' ? 30 : 30) - 5)" class="bid-section">
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
                  <div>费用下限（起拍价）：¥{{ currentAuction.startingPrice?.toFixed(2) || '0.00' }}，费用上限（基础定价+2.5）：¥{{ currentAuction.maxPrice?.toFixed(2) || '0.00' }}</div>
                  <div v-if="currentAuction.highestBidAmount">当前最高价：¥{{ currentAuction.highestBidAmount.toFixed(2) }}，最低出价：¥{{ minBidAmount.toFixed(2) }}</div>
                  <div v-else>最低出价（起拍价）：¥{{ minBidAmount.toFixed(2) }}</div>
                  <div style="margin-top: 5px;">出价必须是0.5的倍数，每次加价最少0.5</div>
                  <div v-if="timeLeft > (currentAuction.duration || (currentAuction.status === 'FIRST_PHASE' ? 30 : 30) - 5)" style="margin-top: 5px; color: #f56c6c;">
                    等待期：拍卖开始后5秒内不能出价（剩余等待时间：{{ Math.max(0, timeLeft - (currentAuction.duration || (currentAuction.status === 'FIRST_PHASE' ? 30 : 30) - 5)) }}秒）
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
                  有普通池队员时随机抽取普通池；普通池清空后按顺序抽取流拍池队首
                </p>
                <p v-else-if="poolPlayers.length === 0" style="color: #909399; font-size: 14px; margin-top: 10px;">
                  待拍卖池为空
                </p>
              </template>
            </el-empty>
          </el-card>

          <!-- 选人纪录 -->
          <el-card class="picks-card" shadow="hover" style="margin-top: 15px; flex: 1; display: flex; flex-direction: column; overflow: hidden;">
            <template #header>
              <div class="card-title">
                <el-icon :size="20"><List /></el-icon>
                <span>选人纪录</span>
              </div>
            </template>
            <div style="flex: 1; overflow-y: auto; min-height: 0;">
              <el-timeline v-if="pickRecords.length > 0">
                <el-timeline-item
                  v-for="record in pickRecords"
                  :key="record.id"
                  :timestamp="formatDateTime(record.createTime)"
                  placement="top"
                  size="default"
                >
                  <el-card shadow="hover" class="pick-card">
                    <div class="pick-item">
                      <div class="pick-main">
                        <div class="pick-seq">第{{ record.sequence }}轮</div>
                        <div class="pick-text">
                          <span class="pick-team">{{ record.teamName || '未知队伍' }}</span>
                          <span class="pick-captain" v-if="record.captainName">（队长：{{ record.captainName }}）</span>
                          <span> 拍得 </span>
                          <span class="pick-player">{{ record.playerGroupName || record.playerGameId || '未知队员' }}</span>
                        </div>
                      </div>
                      <div class="pick-amount">
                        <span class="pick-price">¥{{ record.amount }}</span>
                        <el-button
                          v-if="isAdmin"
                          type="danger"
                          size="small"
                          :loading="rollingBack"
                          @click="handleRollback(record)"
                        >
                          回退到此处
                        </el-button>
                      </div>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
              <el-empty v-else description="暂无选人纪录" :image-size="80" />
            </div>
          </el-card>
        </el-col>

        <!-- 中间：竞价历史 -->
        <el-col :span="8" style="display: flex; flex-direction: column; overflow: hidden;">
          <el-card class="bids-card" shadow="hover" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
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
                  <el-tag
                    type="warning"
                    size="large"
                    style="width: 100%; justify-content: center; cursor: pointer;"
                    @click.stop="isAdmin ? openUpdateTeamCostDialog(team) : null"
                  >
                    <span>剩余费用：<strong>¥{{ team.nowCost.toFixed(2) }}</strong></span>
                  </el-tag>
                </div>
                <div class="team-players">
                  <el-tag
                    v-for="player in team.players"
                    :key="player.id"
                    class="player-tag"
                    size="large"
                    :class="{ 'clickable-player': isAdmin && player.id !== team.captainId }"
                    @click.stop="handleTeamPlayerClick(team, player)"
                  >
                    {{ player.groupName || player.gameId }}
                  </el-tag>
                  <div v-if="team.players.length === 0" class="no-players">暂无队员</div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 待拍卖：普通池与流拍池分开展示 -->
          <div class="pools-stack">
            <el-card
              v-for="sec in poolSections"
              :key="sec.key"
              shadow="hover"
              :class="['pool-card', `pool-card--${sec.key}`]"
            >
              <template #header>
                <div class="card-title pool-section-title">
                  <el-icon :size="20"><component :is="sec.icon" /></el-icon>
                  <span>{{ sec.title }}</span>
                  <el-tag size="small" :type="sec.key === 'normal' ? 'success' : 'warning'">
                    {{ sec.players.length }} 人
                  </el-tag>
                </div>
              </template>
              <p class="pool-section-hint">{{ sec.hint }}</p>
              <div class="pool-list pool-list--scroll">
                <el-tooltip
                  v-for="player in sec.players"
                  :key="`${sec.key}-${player.id}`"
                  placement="left"
                  :show-after="450"
                  :hide-after="500"
                  :enterable="true"
                  effect="dark"
                  popper-class="player-tooltip"
                >
                  <template #content>
                    <div class="player-tooltip-content">
                      <div class="tooltip-header">
                        <h4>{{ player.groupName || player.gameId || '未知' }}</h4>
                      </div>
                      <div class="tooltip-body">
                        <div class="tooltip-item" v-if="sec.key === 'failed'">
                          <span class="tooltip-label">队列序号：</span>
                          <span class="tooltip-value">#{{ player.failedOrder ?? '-' }}（队首优先）</span>
                        </div>
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
                        <div class="tooltip-item" v-if="isAdmin && availableTeams.length > 0" style="margin-top: 8px; justify-content: flex-end;">
                          <el-button
                            type="primary"
                            size="small"
                            @click.stop="openAssignDialog(player)"
                          >
                            分配到指定队伍
                          </el-button>
                        </div>
                        <div v-if="isAdmin" class="pool-move-actions" @click.stop>
                          <el-button
                            v-if="sec.key === 'normal'"
                            type="warning"
                            size="small"
                            :loading="poolMovingId === player.id"
                            @click="handleMoveToFailedPool(player)"
                          >
                            移到流拍池
                          </el-button>
                          <el-button
                            v-if="sec.key === 'failed'"
                            type="success"
                            size="small"
                            :loading="poolMovingId === player.id"
                            @click="handleMoveToNormalPool(player)"
                          >
                            移回普通池
                          </el-button>
                        </div>
                      </div>
                    </div>
                  </template>
                  <el-tag
                    class="pool-item"
                    :class="sec.key === 'failed' ? 'pool-item--failed' : 'pool-item--normal'"
                    size="small"
                    :type="sec.key === 'failed' ? 'warning' : 'info'"
                  >
                    <template v-if="sec.key === 'failed'">
                      <span class="pool-item-order">#{{ player.failedOrder ?? '?' }}</span>
                    </template>
                    {{ player.groupName || player.gameId }}
                  </el-tag>
                </el-tooltip>
                <el-empty
                  v-if="sec.players.length === 0"
                  :description="sec.emptyText"
                  :image-size="64"
                />
              </div>
            </el-card>
          </div>
        </el-col>
      </el-row>

      <!-- 分配队员到指定队伍的弹窗 -->
      <el-dialog
        v-model="assignDialogVisible"
        title="分配到指定队伍"
        width="420px"
        destroy-on-close
      >
        <el-form :model="assignForm" label-width="90px">
          <el-form-item label="队员">
            <span>{{ assignTargetPlayer?.groupName || assignTargetPlayer?.gameId || '未知' }}</span>
          </el-form-item>
          <el-form-item label="目标队伍">
            <el-select v-model="assignForm.teamId" placeholder="请选择队伍" style="width: 260px">
              <el-option
                v-for="team in availableTeams"
                :key="team.id"
                :label="`${team.teamName}（${team.playerCount}/4，剩余¥${team.nowCost?.toFixed(2) || '0.00'}）`"
                :value="team.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="费用">
            <el-input-number
              v-model="assignForm.amount"
              :min="0.5"
              :step="0.5"
              :precision="1"
              style="width: 160px"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="assignDialogVisible = false">取 消</el-button>
          <el-button type="primary" :loading="assigning" @click="handleAssignConfirm">确 定</el-button>
        </template>
      </el-dialog>

      <!-- 修改队伍剩余费用的弹窗 -->
      <el-dialog
        v-model="updateCostDialogVisible"
        title="修改队伍剩余费用"
        width="420px"
        destroy-on-close
      >
        <el-form :model="updateCostForm" label-width="100px">
          <el-form-item label="队伍">
            <span>{{ updateCostForm.teamName || updateCostForm.teamId }}</span>
          </el-form-item>
          <el-form-item label="当前剩余">
            <el-input-number
              v-model="updateCostForm.nowCost"
              :min="0"
              :step="0.5"
              :precision="1"
              style="width: 200px"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="updateCostDialogVisible = false">取 消</el-button>
          <el-button type="primary" :loading="updatingCost" @click="handleUpdateCostConfirm">确 定</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, Trophy, User, Clock, List, UserFilled, Box, Refresh, CircleClose, Money, Download, VideoPlay,
  Plus,
  Minus
} from '@element-plus/icons-vue'
import { getSession } from '../api/session'
import { placeBid, getCurrentAuction, getBids, createAuction, beginAuction, finishAuction, getPickRecords, rollbackByPickRecord } from '../api/auction'
import { getPoolPlayers, getTeams, exportTeams, assignPlayerToTeam, updateTeamCost, removePlayerFromTeam, changePlayerPool } from '../api/player'
import { connectWebSocket, disconnectWebSocket } from '../utils/websocket'

const route = useRoute()
const router = useRouter()
const sessionId = route.params.sessionId

const sessionInfo = ref(null)
const currentAuction = ref(null)
const teams = ref([])
const poolPlayers = ref([])
const bidHistory = ref([])
const pickRecords = ref([])
const bidding = ref(false)
const drawing = ref(false)
const beginning = ref(false)
const finishing = ref(false)
const redrawing = ref(false)
const exporting = ref(false)
const rollingBack = ref(false)
const assignDialogVisible = ref(false)
const assigning = ref(false)
const assignTargetPlayer = ref(null)
const assignForm = reactive({
  playerId: null,
  teamId: null,
  amount: 0
})
const updateCostDialogVisible = ref(false)
const updatingCost = ref(false)
const poolMovingId = ref(null)
const updateCostForm = reactive({
  teamId: null,
  teamName: '',
  nowCost: 0
})
const timeLeft = ref(0)
let timer = null
let refreshQueueTimer = null
let refreshInFlight = false
const pendingRefresh = {
  auction: false,
  teams: false,
  poolPlayers: false,
  pickRecords: false,
  bidHistory: false
}
const recentEventTypeAt = new Map()
const recentEventIds = new Set()
const recentActionEventAt = new Map()
const pendingActionRefresh = new Map()
const lastSessionVersion = ref(0)

const createActionId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

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

const availableTeams = computed(() => {
  return teams.value.filter(t => (t.playerCount ?? 0) < 4)
})

/** 逻辑上与接口数据一致：普通池 / 流拍池分列 */
const normalPoolPlayers = computed(() =>
  poolPlayers.value.filter(p => !p.poolType || p.poolType === 'NORMAL')
)
const failedPoolPlayers = computed(() =>
  [...poolPlayers.value.filter(p => p.poolType === 'FAILED')].sort(
    (a, b) => (a.failedOrder ?? 999999) - (b.failedOrder ?? 999999)
  )
)

const poolSections = computed(() => [
  {
    key: 'normal',
    title: '普通池',
    hint: '摇号优先从此池随机抽取；队员流拍后会进入下方流拍池。',
    icon: Box,
    players: normalPoolPlayers.value,
    emptyText: '普通池暂无队员'
  },
  {
    key: 'failed',
    title: '流拍池',
    hint: '仅当普通池为空时，按序号从队首依次抽取；在本池再次流拍会排到队尾。',
    icon: List,
    players: failedPoolPlayers.value,
    emptyText: '流拍池暂无队员'
  }
])

const isNormalPoolPlayer = (p) => !p.poolType || p.poolType === 'NORMAL'

/** 摇号：优先随机普通池；否则取流拍池队首。重新抽选时可尽量避开上一人 */
const selectPlayerForDraw = (players, { preferOtherThanId } = {}) => {
  const normalsAll = players.filter(isNormalPoolPlayer)
  let normals = normalsAll
  if (preferOtherThanId != null && normalsAll.length > 1) {
    const filtered = normalsAll.filter(p => p.id !== preferOtherThanId)
    if (filtered.length > 0) normals = filtered
  }
  if (normals.length > 0) {
    return normals[Math.floor(Math.random() * normals.length)]
  }
  let failed = players
    .filter(p => p.poolType === 'FAILED')
    .sort((a, b) => (a.failedOrder ?? 999999) - (b.failedOrder ?? 999999))
  if (preferOtherThanId != null && failed.length > 1) {
    const filtered = failed.filter(p => p.id !== preferOtherThanId)
    if (filtered.length > 0) failed = filtered
  }
  return failed[0] ?? null
}

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

// 计算最高可出价（费用上限：基础定价+2.5，同时考虑剩余费用）
const maxBidAmount = computed(() => {
  // 费用上限：基础定价 + 2.5（即maxPrice）
  const maxFromAuction = currentAuction.value?.maxPrice || Infinity
  
  if (!myTeam.value || myTeam.value.nowCost === null || myTeam.value.nowCost === undefined) {
    return maxFromAuction
  }
  
  // 将剩余费用向下取整到0.5的倍数
  const maxFromCost = Math.floor(myTeam.value.nowCost / 0.5) * 0.5
  
  // 取两者中的较小值：剩余费用限制 和 费用上限（基础定价+2.5）
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
  // 捡漏阶段：30秒，需要剩余时间<=25秒才能出价（即开始后5秒）
  const duration = currentAuction.value.duration || (currentAuction.value.status === 'FIRST_PHASE' ? 30 : 30)
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
  
  // 检查出价是否超过最高价（费用上限：基础定价+2.5）
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

const loadAuctionData = async ({ refreshBidHistory = false } = {}) => {
  try {
    const res = await getCurrentAuction(sessionId)
    if (res.code === 200 && res.data) {
      // 保存旧的价格数据和其他关键数据，避免刷新时闪烁
      const oldStartingPrice = currentAuction.value?.startingPrice
      const oldMaxPrice = currentAuction.value?.maxPrice
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
            if (refreshBidHistory && currentAuction.value.id) {
              await loadBidHistory(currentAuction.value.id)
            }
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
        // 确保新拍卖的价格数据被正确设置
        if (currentAuction.value.startingPrice == null || currentAuction.value.maxPrice == null) {
          // 如果价格数据缺失，尝试从后端重新获取
          // 这种情况不应该发生，但作为保护措施
        }
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
      if (refreshBidHistory && currentAuction.value.id) {
        await loadBidHistory(currentAuction.value.id)
      }
    } else {
      currentAuction.value = null
      isTimeExpired = false
      bidForm.amount = 0
      if (refreshBidHistory) {
        bidHistory.value = []
      }
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

const loadPickRecords = async () => {
  try {
    const res = await getPickRecords(sessionId)
    if (res.code === 200) {
      pickRecords.value = res.data || []
    }
  } catch (error) {
    console.error('加载选人纪录失败', error)
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

const applySystemStatusSnapshot = (status) => {
  if (!status) return

  const nextAuction = status.currentAuction || null
  if (nextAuction) {
    const oldStartingPrice = currentAuction.value?.startingPrice
    const oldMaxPrice = currentAuction.value?.maxPrice
    const oldId = currentAuction.value?.id
    const oldEndTime = currentAuction.value?.endTime
    const isSameAuction = oldId && nextAuction.id === oldId

    if (isSameAuction) {
      if ((nextAuction.startingPrice == null || nextAuction.startingPrice === 0) && oldStartingPrice != null && oldStartingPrice !== 0) {
        nextAuction.startingPrice = oldStartingPrice
      }
      if ((nextAuction.maxPrice == null || nextAuction.maxPrice === 0) && oldMaxPrice != null && oldMaxPrice !== 0) {
        nextAuction.maxPrice = oldMaxPrice
      }

      if (isTimeExpired && oldEndTime && nextAuction.endTime) {
        const newEndTimeMs = new Date(nextAuction.endTime).getTime()
        const oldEndTimeMs = new Date(oldEndTime).getTime()
        if (newEndTimeMs <= oldEndTimeMs) {
          currentAuction.value = nextAuction
        } else {
          isTimeExpired = false
          currentAuction.value = nextAuction
        }
      } else {
        currentAuction.value = nextAuction
      }
    } else {
      isTimeExpired = false
      currentAuction.value = nextAuction
    }

    if (currentAuction.value?.startingPrice) {
      bidForm.amount = currentAuction.value.highestBidAmount
        ? currentAuction.value.highestBidAmount + 0.5
        : currentAuction.value.startingPrice
    }
    updateTimeLeft()
  } else {
    currentAuction.value = null
    isTimeExpired = false
    bidForm.amount = 0
  }

  teams.value = status.teams || []
  poolPlayers.value = status.poolPlayers || []
  pickRecords.value = status.pickRecords || []
  bidHistory.value = status.currentBidHistory || []
}

const enqueueRefresh = (flags, delay = 80) => {
  if (!flags) return

  pendingRefresh.auction = pendingRefresh.auction || !!flags.auction
  pendingRefresh.teams = pendingRefresh.teams || !!flags.teams
  pendingRefresh.poolPlayers = pendingRefresh.poolPlayers || !!flags.poolPlayers
  pendingRefresh.pickRecords = pendingRefresh.pickRecords || !!flags.pickRecords
  pendingRefresh.bidHistory = pendingRefresh.bidHistory || !!flags.bidHistory

  if (refreshQueueTimer) {
    clearTimeout(refreshQueueTimer)
  }

  refreshQueueTimer = setTimeout(() => {
    refreshQueueTimer = null
    flushRefreshQueue()
  }, delay)
}

const flushRefreshQueue = async () => {
  if (refreshInFlight) return

  const plan = {
    auction: pendingRefresh.auction,
    teams: pendingRefresh.teams,
    poolPlayers: pendingRefresh.poolPlayers,
    pickRecords: pendingRefresh.pickRecords,
    bidHistory: pendingRefresh.bidHistory
  }

  pendingRefresh.auction = false
  pendingRefresh.teams = false
  pendingRefresh.poolPlayers = false
  pendingRefresh.pickRecords = false
  pendingRefresh.bidHistory = false

  refreshInFlight = true
  try {
    const tasks = []
    if (plan.auction) tasks.push(loadAuctionData({ refreshBidHistory: plan.bidHistory }))
    if (plan.teams) tasks.push(loadTeams())
    if (plan.poolPlayers) tasks.push(loadPoolPlayers())
    if (plan.pickRecords) tasks.push(loadPickRecords())
    await Promise.all(tasks)

    if (!plan.auction && plan.bidHistory && currentAuction.value?.id) {
      await loadBidHistory(currentAuction.value.id)
    }
  } finally {
    refreshInFlight = false
    if (
      pendingRefresh.auction ||
      pendingRefresh.teams ||
      pendingRefresh.poolPlayers ||
      pendingRefresh.pickRecords ||
      pendingRefresh.bidHistory
    ) {
      enqueueRefresh({}, 0)
    }
  }
}

const scheduleFallbackRefresh = (expectedEventTypes, flags, delay = 1200, options = {}) => {
  const startAt = options.startAt || Date.now()
  const actionId = options.actionId || null
  const expectedSet = new Set(expectedEventTypes || [])

  if (actionId) {
    pendingActionRefresh.set(actionId, {
      expectedSet,
      startAt
    })
  }

  setTimeout(() => {
    let hasExpectedEvent = expectedEventTypes.some(type => (recentEventTypeAt.get(type) || 0) >= startAt)

    if (actionId) {
      const pending = pendingActionRefresh.get(actionId)
      const actionEventAt = recentActionEventAt.get(actionId) || 0
      const matchedByAction = !!pending?.matched || actionEventAt >= startAt
      hasExpectedEvent = hasExpectedEvent || matchedByAction
      pendingActionRefresh.delete(actionId)
    }

    if (!hasExpectedEvent) {
      enqueueRefresh(flags, 0)
    }
  }, delay)
}

const mapEventToRefreshFlags = (eventType) => {
  if (eventType === 'BID_PLACED') {
    return { auction: true, bidHistory: true }
  }
  if (eventType === 'AUCTION_STARTED' || eventType === 'AUCTION_FINISHED') {
    return { auction: true, teams: true, poolPlayers: true }
  }
  if (eventType === 'PLAYER_ASSIGNED') {
    return { auction: true, teams: true, poolPlayers: true, pickRecords: true }
  }
  if (eventType === 'TEAM_COST_UPDATED') {
    return { teams: true }
  }
  if (eventType === 'PLAYER_POOL_CHANGED') {
    return { poolPlayers: true }
  }
  if (eventType === 'PLAYER_REMOVED_FROM_TEAM') {
    return { teams: true, poolPlayers: true, pickRecords: true }
  }
  if (eventType === 'ROLLBACK_COMPLETED') {
    return { auction: true, teams: true, poolPlayers: true, pickRecords: true, bidHistory: true }
  }
  if (eventType === 'SYSTEM_CHANGED' || eventType === 'SYSTEM_STATUS') {
    return { auction: true, teams: true, poolPlayers: true, pickRecords: true }
  }
  // 兜底：未知事件按系统变更处理
  return { auction: true, teams: true, poolPlayers: true, pickRecords: true }
}

const applyAuctionDelta = (auctionPatch) => {
  if (!auctionPatch) return false

  if (!currentAuction.value || !currentAuction.value.id || currentAuction.value.id !== auctionPatch.id) {
    currentAuction.value = {
      ...(currentAuction.value || {}),
      ...auctionPatch
    }
  } else {
    currentAuction.value = {
      ...currentAuction.value,
      ...auctionPatch
    }
  }

  if (currentAuction.value?.startingPrice) {
    bidForm.amount = currentAuction.value.highestBidAmount
      ? currentAuction.value.highestBidAmount + 0.5
      : currentAuction.value.startingPrice
  }
  updateTimeLeft()
  return true
}

const applyBidPlacedDelta = (data) => {
  if (!data) return false
  let applied = false

  if (data.auction) {
    applied = applyAuctionDelta(data.auction) || applied
  }

  if (data.bid && data.bid.id) {
    const exists = bidHistory.value.some(b => b.id === data.bid.id)
    if (!exists) {
      bidHistory.value.unshift(data.bid)
    }
    applied = true
  }
  return applied
}

const applyPlayerAssignedDelta = (data) => {
  if (!data) return false
  let applied = false

  if (data.team && data.team.id) {
    const idx = teams.value.findIndex(t => t.id === data.team.id)
    if (idx >= 0) {
      teams.value.splice(idx, 1, data.team)
    } else {
      teams.value.push(data.team)
    }
    applied = true
  }

  if (data.poolRemovedPlayerId) {
    poolPlayers.value = poolPlayers.value.filter(p => p.id !== data.poolRemovedPlayerId)
    applied = true
  }

  if (data.pickRecord && data.pickRecord.id) {
    const exists = pickRecords.value.some(r => r.id === data.pickRecord.id)
    if (!exists) {
      pickRecords.value.push(data.pickRecord)
    }
    applied = true
  }
  return applied
}

const applyTeamCostUpdatedDelta = (data) => {
  if (!data?.team || !data.team.id) return false
  const idx = teams.value.findIndex(t => t.id === data.team.id)
  if (idx >= 0) {
    teams.value.splice(idx, 1, data.team)
  } else {
    teams.value.push(data.team)
  }
  return true
}

const upsertPoolPlayer = (player) => {
  if (!player || !player.id) return false
  if (player.status && player.status !== 'POOL') {
    poolPlayers.value = poolPlayers.value.filter(p => p.id !== player.id)
    return true
  }
  const idx = poolPlayers.value.findIndex(p => p.id === player.id)
  if (idx >= 0) {
    poolPlayers.value.splice(idx, 1, player)
  } else {
    poolPlayers.value.push(player)
  }
  return true
}

const applyPlayerPoolChangedDelta = (data) => {
  return upsertPoolPlayer(data?.player)
}

const applyPlayerRemovedFromTeamDelta = (data) => {
  if (!data) return false
  let applied = false

  if (data.team && data.team.id) {
    const idx = teams.value.findIndex(t => t.id === data.team.id)
    if (idx >= 0) {
      teams.value.splice(idx, 1, data.team)
    } else {
      teams.value.push(data.team)
    }
    applied = true
  }

  if (data.poolPlayer) {
    applied = upsertPoolPlayer(data.poolPlayer) || applied
  }

  if (data.pickRecordRemoved?.teamId && data.pickRecordRemoved?.playerId) {
    pickRecords.value = pickRecords.value.filter(
      r => !(r.teamId === data.pickRecordRemoved.teamId && r.playerId === data.pickRecordRemoved.playerId)
    )
    applied = true
  }
  return applied
}

const applyRollbackCompletedDelta = (event) => {
  const snapshot = event?.systemStatus || event?.data?.systemStatus
  if (!snapshot) return false
  applySystemStatusSnapshot(snapshot)
  return true
}

const applyIncrementalEvent = (event) => {
  if (event?.eventType === 'ROLLBACK_COMPLETED') {
    return applyRollbackCompletedDelta(event)
  }

  const data = event?.data
  if (!data) return false

  if (event.eventType === 'BID_PLACED') {
    return applyBidPlacedDelta(data)
  }
  if (event.eventType === 'AUCTION_STARTED' || event.eventType === 'AUCTION_FINISHED') {
    return applyAuctionDelta(data.auction)
  }
  if (event.eventType === 'PLAYER_ASSIGNED') {
    return applyPlayerAssignedDelta(data)
  }
  if (event.eventType === 'TEAM_COST_UPDATED') {
    return applyTeamCostUpdatedDelta(data)
  }
  if (event.eventType === 'PLAYER_POOL_CHANGED') {
    return applyPlayerPoolChangedDelta(data)
  }
  if (event.eventType === 'PLAYER_REMOVED_FROM_TEAM') {
    return applyPlayerRemovedFromTeamDelta(data)
  }
  return false
}

const handleWebSocketEvent = (event) => {
  if (!event || !event.eventType) return

  if (event.eventId) {
    if (recentEventIds.has(event.eventId)) {
      return
    }
    recentEventIds.add(event.eventId)
    if (recentEventIds.size > 200) {
      const oldest = recentEventIds.values().next().value
      if (oldest) recentEventIds.delete(oldest)
    }
  }

  recentEventTypeAt.set(event.eventType, Date.now())

  if (event.actionId) {
    recentActionEventAt.set(event.actionId, Date.now())
    if (recentActionEventAt.size > 500) {
      const oldestActionId = recentActionEventAt.keys().next().value
      if (oldestActionId) {
        recentActionEventAt.delete(oldestActionId)
      }
    }
    const pending = pendingActionRefresh.get(event.actionId)
    if (pending && pending.expectedSet.has(event.eventType)) {
      pending.matched = true
    }
  }

  if (event.sessionVersion != null) {
    const incomingVersion = Number(event.sessionVersion)
    if (!Number.isNaN(incomingVersion) && incomingVersion > 0) {
      if (lastSessionVersion.value > 0 && incomingVersion > lastSessionVersion.value + 1) {
        // 发现版本跳跃，认为有事件丢失，立即做一次全量同步
        lastSessionVersion.value = incomingVersion
        enqueueRefresh(
          { auction: true, teams: true, poolPlayers: true, pickRecords: true, bidHistory: true },
          0
        )
        return
      }
      if (lastSessionVersion.value > 0 && incomingVersion < lastSessionVersion.value) {
        return
      }
      lastSessionVersion.value = incomingVersion
    }
  }

  if (event.systemStatus) {
    applySystemStatusSnapshot(event.systemStatus)
    return
  }
  if (applyIncrementalEvent(event)) {
    return
  }
  enqueueRefresh(mapEventToRefreshFlags(event.eventType), 80)
}

const handleWebSocketReconnected = () => {
  // 重连后做一次全量校准，防止断线期间丢失增量事件
  enqueueRefresh(
    {
      auction: true,
      teams: true,
      poolPlayers: true,
      pickRecords: true,
      bidHistory: true
    },
    0
  )
}

const handleMoveToFailedPool = async (player) => {
  poolMovingId.value = player.id
  const actionId = createActionId()
  const requestStartAt = Date.now()
  try {
    const res = await changePlayerPool({
      sessionId: Number(sessionId),
      playerId: player.id,
      targetPoolType: 'FAILED'
    }, { actionId })
    if (res.code === 200) {
      ElMessage.success('已移至流拍池')
      scheduleFallbackRefresh(['PLAYER_POOL_CHANGED'], { poolPlayers: true }, 1200, { startAt: requestStartAt, actionId })
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    poolMovingId.value = null
  }
}

const handleMoveToNormalPool = async (player) => {
  poolMovingId.value = player.id
  const actionId = createActionId()
  const requestStartAt = Date.now()
  try {
    const res = await changePlayerPool({
      sessionId: Number(sessionId),
      playerId: player.id,
      targetPoolType: 'NORMAL'
    }, { actionId })
    if (res.code === 200) {
      ElMessage.success('已移回普通池')
      scheduleFallbackRefresh(['PLAYER_POOL_CHANGED'], { poolPlayers: true }, 1200, { startAt: requestStartAt, actionId })
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    poolMovingId.value = null
  }
}

const handleRandomDraw = async () => {
  if (poolPlayers.value.length === 0) {
    ElMessage.warning('待拍卖池为空，无法摇号')
    return
  }
  
  drawing.value = true
  try {
    const selectedPlayer = selectPlayerForDraw(poolPlayers.value, {})
    if (!selectedPlayer) {
      ElMessage.warning('没有可抽取的队员')
      return
    }

    const actionId = createActionId()
    const requestStartAt = Date.now()
    const res = await createAuction(sessionId, selectedPlayer.id, { actionId })
    if (res.code === 200) {
      ElMessage.success(`已抽取：${selectedPlayer.groupName || selectedPlayer.gameId}，等待开始拍卖`)
      scheduleFallbackRefresh(
        ['AUCTION_STARTED'],
        { auction: true, poolPlayers: true, teams: true },
        1200,
        { startAt: requestStartAt, actionId }
      )
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
    const actionId = createActionId()
    const requestStartAt = Date.now()
    const res = await beginAuction(currentAuction.value.id, { actionId })
    if (res.code === 200) {
      ElMessage.success('拍卖已开始')
      scheduleFallbackRefresh(
        ['AUCTION_STARTED'],
        { auction: true, teams: true, poolPlayers: true },
        1200,
        { startAt: requestStartAt, actionId }
      )
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
  
  finishing.value = true
  try {
    const actionId = createActionId()
    const requestStartAt = Date.now()
    const res = await finishAuction(currentAuction.value.id, false, { actionId }) // autoFinish=false，管理员手动结束
    if (res.code === 200) {
      if (res.message && res.message.includes('捡漏环节')) {
        ElMessage.success('第一阶段结束，进入捡漏环节')
      } else {
        ElMessage.success('拍卖已结束')
      }
      scheduleFallbackRefresh(
        ['AUCTION_FINISHED', 'AUCTION_STARTED'],
        {
          auction: true,
          teams: true,
          poolPlayers: true,
          pickRecords: true
        },
        1200,
        { startAt: requestStartAt, actionId }
      )
    } else {
      ElMessage.error(res.message || '结束拍卖失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '结束拍卖失败')
  } finally {
    finishing.value = false
  }
}

// 重新抽选：仅在当前已抽出队员但未开始拍卖（WAITING）时可用
const handleRedraw = async () => {
  if (!isAdmin.value) {
    ElMessage.warning('只有管理员可以重新抽选')
    return
  }
  if (!currentAuction.value || currentAuction.value.status !== 'WAITING') {
    return
  }
  if (poolPlayers.value.length === 0) {
    ElMessage.warning('待拍卖池为空，无法重新抽选')
    return
  }

  redrawing.value = true
  try {
    const prevPlayerId = currentAuction.value.playerId
    // 结束当前未开始的拍卖，把该队员放回待拍卖池
    const finishActionId = createActionId()
    const resFinish = await finishAuction(currentAuction.value.id, false, { actionId: finishActionId })
    if (resFinish.code !== 200) {
      ElMessage.error(resFinish.message || '结束当前拍卖失败，无法重新抽选')
      return
    }

    // 更新一次待拍卖池，确保刚才的队员已经回到池中
    await loadPoolPlayers()
    if (poolPlayers.value.length === 0) {
      ElMessage.warning('待拍卖池为空，无法重新抽选')
      await loadAuctionData()
      return
    }

    const selectedPlayer = selectPlayerForDraw(poolPlayers.value, { preferOtherThanId: prevPlayerId })
    if (!selectedPlayer) {
      ElMessage.warning('没有可抽取的队员')
      await loadAuctionData()
      return
    }

    const createActionIdForRedraw = createActionId()
    const createStartAt = Date.now()
    const resCreate = await createAuction(sessionId, selectedPlayer.id, { actionId: createActionIdForRedraw })
    if (resCreate.code === 200) {
      ElMessage.success(`已重新抽选：${selectedPlayer.groupName || selectedPlayer.gameId || '未知'}，等待开始拍卖`)
      scheduleFallbackRefresh(
        ['AUCTION_STARTED'],
        { auction: true, poolPlayers: true, teams: true },
        1200,
        { startAt: createStartAt, actionId: createActionIdForRedraw }
      )
    } else {
      ElMessage.error(resCreate.message || '重新抽选失败')
      await loadAuctionData()
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '重新抽选失败')
  } finally {
    redrawing.value = false
  }
}


const handleBid = async () => {
  if (!canBid.value) {
    ElMessage.warning('出价不符合要求，请检查出价金额')
    return
  }

  bidding.value = true
  try {
    const actionId = createActionId()
    const requestStartAt = Date.now()
    const res = await placeBid({
      auctionId: currentAuction.value.id,
      amount: bidForm.amount
    }, { actionId })
    if (res.code === 200) {
      // 出价成功
      if (currentAuction.value.maxPrice && bidForm.amount >= currentAuction.value.maxPrice) {
        ElMessage.success('出价达到最高价！倒计时已停止，请等待管理员确认结束拍卖')
      } else {
        ElMessage.success('出价成功')
      }
      bidForm.amount = 0
      scheduleFallbackRefresh(
        ['BID_PLACED'],
        { auction: true, bidHistory: true },
        1200,
        { startAt: requestStartAt, actionId }
      )
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
    // 如果价格为null、undefined，先尝试从currentAuction中获取
    if (price == null || price === undefined) {
      if (currentAuction.value) {
        const fallbackPrice = type === 'starting' 
          ? currentAuction.value.startingPrice 
          : currentAuction.value.maxPrice
        if (fallbackPrice != null && fallbackPrice !== 0) {
          // 如果从currentAuction中获取到有效价格，保存并返回
          const numPrice = typeof fallbackPrice === 'number' ? fallbackPrice : parseFloat(fallbackPrice)
          if (!isNaN(numPrice)) {
            if (type === 'starting') {
              lastStartingPrice = numPrice
            } else if (type === 'max') {
              lastMaxPrice = numPrice
            }
            return numPrice.toFixed(2)
          }
        }
      }
      // 如果currentAuction中也没有，尝试使用上一次保存的有效值
      if (type === 'starting') {
        if (lastStartingPrice != null) {
          return lastStartingPrice.toFixed(2)
        }
      } else if (type === 'max') {
        if (lastMaxPrice != null) {
          return lastMaxPrice.toFixed(2)
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

const openUpdateTeamCostDialog = (team) => {
  if (!isAdmin.value) return
  if (team.nowCost === null || team.nowCost === undefined) return
  updateCostForm.teamId = team.id
  updateCostForm.teamName = team.teamName
  updateCostForm.nowCost = Number(team.nowCost)
  updateCostDialogVisible.value = true
}

const handleUpdateCostConfirm = async () => {
  if (!isAdmin.value) {
    ElMessage.warning('只有管理员可以修改队伍费用')
    return
  }
  if (!updateCostForm.teamId) {
    ElMessage.error('队伍信息缺失')
    return
  }
  const value = Number(updateCostForm.nowCost || 0)
  if (value < 0) {
    ElMessage.warning('剩余费用不能为负数')
    return
  }

  updatingCost.value = true
  try {
    const actionId = createActionId()
    const requestStartAt = Date.now()
    const res = await updateTeamCost({
      teamId: updateCostForm.teamId,
      nowCost: value
    }, { actionId })
    if (res.code === 200) {
      ElMessage.success(res.message || '队伍费用已更新')
      updateCostDialogVisible.value = false
      scheduleFallbackRefresh(['TEAM_COST_UPDATED'], { teams: true }, 1200, { startAt: requestStartAt, actionId })
    } else {
      ElMessage.error(res.message || '更新失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '更新失败')
  } finally {
    updatingCost.value = false
  }
}

const openAssignDialog = (player) => {
  if (!isAdmin.value) return
  assignTargetPlayer.value = player
  assignForm.playerId = player.id
  assignForm.teamId = availableTeams.value[0]?.id || null
  assignForm.amount = player.cost != null ? roundToHalf(Number(player.cost)) : 1
  assignDialogVisible.value = true
}

const handleAssignConfirm = async () => {
  if (!isAdmin.value) {
    ElMessage.warning('只有管理员可以分配队员')
    return
  }
  if (!assignForm.playerId || !assignForm.teamId) {
    ElMessage.warning('请选择队伍')
    return
  }
  const team = availableTeams.value.find(t => t.id === assignForm.teamId)
  if (!team) {
    ElMessage.error('目标队伍不存在或已满员')
    return
  }

  const amount = roundToHalf(assignForm.amount || 0)
  if (amount <= 0) {
    ElMessage.warning('费用必须大于0')
    return
  }

  assigning.value = true
  try {
    const actionId = createActionId()
    const requestStartAt = Date.now()
    const res = await assignPlayerToTeam({
      playerId: assignForm.playerId,
      teamId: assignForm.teamId,
      amount
    }, { actionId })
    if (res.code === 200) {
      ElMessage.success(res.message || '分配成功')
      assignDialogVisible.value = false
      scheduleFallbackRefresh(
        ['PLAYER_ASSIGNED'],
        {
          auction: true,
          teams: true,
          poolPlayers: true,
          pickRecords: true
        },
        1200,
        { startAt: requestStartAt, actionId }
      )
    } else {
      ElMessage.error(res.message || '分配失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '分配失败')
  } finally {
    assigning.value = false
  }
}

const handleTeamPlayerClick = async (team, player) => {
  if (!isAdmin.value) return
  if (!team || !player) return
  if (player.id === team.captainId) {
    ElMessage.info('不能移除队长')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要将队员「${player.groupName || player.gameId || player.id}」移出 ${team.teamName} 并放回待拍卖池吗？`,
      '移除确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  try {
    const actionId = createActionId()
    const requestStartAt = Date.now()
    const res = await removePlayerFromTeam({
      teamId: team.id,
      playerId: player.id
    }, { actionId })
    if (res.code === 200) {
      ElMessage.success(res.message || '已移除队员')
      scheduleFallbackRefresh(
        ['PLAYER_REMOVED_FROM_TEAM'],
        {
          teams: true,
          poolPlayers: true,
          pickRecords: true
        },
        1200,
        { startAt: requestStartAt, actionId }
      )
    } else {
      ElMessage.error(res.message || '移除失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '移除失败')
  }
}

const handleRollback = async (record) => {
  if (!isAdmin.value) {
    ElMessage.warning('只有管理员可以回退选人纪录')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认要回退到第 ${record.sequence} 条选人纪录之前的状态吗？此操作会撤销之后所有已选队员，并重新计算队伍费用。`,
      '确认回退',
      {
        type: 'warning',
        confirmButtonText: '确认回退',
        cancelButtonText: '取消'
      }
    )
  } catch {
    // 用户取消
    return
  }

  rollingBack.value = true
  try {
    const actionId = createActionId()
    const requestStartAt = Date.now()
    const res = await rollbackByPickRecord(record.id, { actionId })
    if (res.code === 200) {
      ElMessage.success(res.message || '回退成功')
      scheduleFallbackRefresh(
        ['ROLLBACK_COMPLETED'],
        {
          auction: true,
          teams: true,
          poolPlayers: true,
          pickRecords: true,
          bidHistory: true
        },
        1200,
        { startAt: requestStartAt, actionId }
      )
    } else {
      ElMessage.error(res.message || '回退失败')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '回退失败')
  } finally {
    rollingBack.value = false
  }
}

onMounted(() => {
  loadSessionInfo()
  loadAuctionData({ refreshBidHistory: true })
  loadTeams()
  loadPoolPlayers()
  loadPickRecords()

  // 连接WebSocket
  connectWebSocket(sessionId, {
    onEvent: handleWebSocketEvent,
    onReconnected: handleWebSocketReconnected
  })
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
  if (refreshQueueTimer) {
    clearTimeout(refreshQueueTimer)
    refreshQueueTimer = null
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

.auction-card, .bids-card, .picks-card, .teams-card, .pool-card {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}

.pools-stack {
  margin-top: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}

.pools-stack .pool-card {
  flex: 1;
  min-height: 100px;
  overflow: hidden;
}

.pool-section-hint {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.pool-list--scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.pool-section-title {
  flex-wrap: wrap;
  row-gap: 6px;
}

.pool-item-order {
  font-weight: 700;
  margin-right: 6px;
}

.pool-card--normal {
  border-left: 4px solid #67c23a;
}

.pool-card--failed {
  border-left: 4px solid #e6a23c;
}

.auction-card:hover, .bids-card:hover, .picks-card:hover, .teams-card:hover, .pool-card:hover {
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

.pick-card {
  background: rgba(255, 255, 255, 0.96);
}

.pick-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.pick-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pick-seq {
  font-size: 13px;
  color: #909399;
}

.pick-text {
  font-size: 14px;
  color: #333;
}

.pick-team {
  font-weight: 700;
  color: #0d2d53;
}

.pick-captain {
  margin-left: 4px;
  color: #606266;
}

.pick-player {
  font-weight: 700;
  color: #f56c6c;
}

.pick-amount {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pick-price {
  font-size: 18px;
  font-weight: 700;
  color: #f56c6c;
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

.player-tag.clickable-player {
  cursor: pointer;
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

.pool-move-actions {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
</style>
