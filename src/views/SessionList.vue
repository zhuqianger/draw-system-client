<template>
  <div class="session-list-container">
    <el-container>
      <el-header class="header">
        <div class="header-content">
          <h2>拍卖流程管理</h2>
          <div class="header-actions">
            <span class="user-info">{{ userInfo?.username }}</span>
            <el-button type="info" @click="handleLogout" size="small">退出</el-button>
            <el-button
              v-if="isAdmin"
              type="primary"
              @click="showCreateDialog = true"
              :icon="Plus"
            >
              创建新流程
            </el-button>
          </div>
        </div>
      </el-header>
      <el-main>
        <div class="session-grid">
          <el-card
            v-for="session in sessionList"
            :key="session.id"
            class="session-card"
            shadow="hover"
            @click="enterSession(session.id)"
          >
            <template #header>
              <div class="session-header">
                <h3>{{ session.sessionName }}</h3>
                <el-tag :type="getStatusType(session.status)">
                  {{ getStatusText(session.status) }}
                </el-tag>
              </div>
            </template>
            <div class="session-info">
              <p><el-icon><Calendar /></el-icon> 创建时间：{{ formatDate(session.createTime) }}</p>
              <p v-if="session.dataSourceFile">
                <el-icon><Document /></el-icon> 数据文件：已上传
              </p>
            </div>
          </el-card>
        </div>
      </el-main>
    </el-container>

    <!-- 创建流程对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建新拍卖流程"
      width="600px"
      @close="resetCreateForm"
    >
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="120px">
        <el-form-item label="流程名称" prop="sessionName">
          <el-input v-model="createForm.sessionName" placeholder="请输入拍卖流程名称" />
        </el-form-item>
        <el-form-item label="数据文件" prop="excelFile">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :on-change="handleFileChange"
            :limit="1"
            accept=".xlsx,.xls"
          >
            <el-button :icon="Upload">选择Excel文件</el-button>
            <template #tip>
              <div class="el-upload__tip">请上传包含队员和队长信息的Excel文件</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="队长序号" prop="captainIndices">
          <el-input
            v-model="createForm.captainIndices"
            placeholder="请输入队长序号，用逗号分隔，如：1,2,3"
          />
          <div class="form-tip">例如：1,2,3 表示第1、2、3列为队长信息</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Calendar, Document, Upload } from '@element-plus/icons-vue'
import { getSessionList, createSession } from '../api/session'

const router = useRouter()
const sessionList = ref([])
const showCreateDialog = ref(false)
const creating = ref(false)
const uploadRef = ref()
const createFormRef = ref()

const userInfo = computed(() => {
  const info = localStorage.getItem('userInfo')
  return info ? JSON.parse(info) : null
})

const isAdmin = computed(() => userInfo.value?.userType === 'ADMIN')

const createForm = reactive({
  sessionName: '',
  excelFile: null,
  captainIndices: ''
})

const createRules = {
  sessionName: [
    { required: true, message: '请输入流程名称', trigger: 'blur' }
  ],
  excelFile: [
    { required: true, message: '请选择Excel文件', trigger: 'change' }
  ],
  captainIndices: [
    { required: true, message: '请输入队长序号', trigger: 'blur' },
    { pattern: /^\d+(,\d+)*$/, message: '格式错误，请输入数字，用逗号分隔', trigger: 'blur' }
  ]
}

const loadSessionList = async () => {
  try {
    const res = await getSessionList()
    if (res.code === 200) {
      sessionList.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('加载列表失败')
  }
}

const handleFileChange = (file) => {
  createForm.excelFile = file.raw
}

const resetCreateForm = () => {
  createForm.sessionName = ''
  createForm.excelFile = null
  createForm.captainIndices = ''
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
  if (createFormRef.value) {
    createFormRef.value.clearValidate()
  }
}

const handleCreate = async () => {
  if (!createFormRef.value) return
  
  await createFormRef.value.validate(async (valid) => {
    if (valid) {
      if (!createForm.excelFile) {
        ElMessage.warning('请选择Excel文件')
        return
      }
      
      creating.value = true
      try {
        const formData = new FormData()
        formData.append('sessionName', createForm.sessionName)
        formData.append('excelFile', createForm.excelFile)
        formData.append('captainIndices', createForm.captainIndices)
        
        const res = await createSession(formData)
        if (res.code === 200) {
          ElMessage.success('创建成功')
          showCreateDialog.value = false
          resetCreateForm()
          loadSessionList()
        } else {
          ElMessage.error(res.message || '创建失败')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '创建失败')
      } finally {
        creating.value = false
      }
    }
  })
}

const enterSession = (sessionId) => {
  router.push(`/auction/${sessionId}`)
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  router.push('/login')
}

const getStatusType = (status) => {
  const map = {
    'CREATED': 'info',
    'ACTIVE': 'success',
    'FINISHED': 'warning'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    'CREATED': '已创建',
    'ACTIVE': '进行中',
    'FINISHED': '已结束'
  }
  return map[status] || status
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadSessionList()
})
</script>

<style scoped>
.session-list-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 70px;
  line-height: 70px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.header-content h2 {
  margin: 0;
  color: #667eea;
  font-size: 24px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info {
  color: #666;
  font-size: 14px;
}

.el-main {
  padding: 30px;
  max-width: 1400px;
  margin: 0 auto;
}

.session-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.session-card {
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 8px;
}

.session-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.session-info {
  color: #666;
  font-size: 14px;
}

.session-info p {
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}
</style>
