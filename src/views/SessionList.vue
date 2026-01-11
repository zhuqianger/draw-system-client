<template>
  <div class="session-list-container">
    <div class="page-header">
      <div class="header-content">
        <h2>
          <el-icon :size="32"><Trophy /></el-icon>
          拍卖流程管理
        </h2>
        <div class="header-actions">
          <span class="user-info">
            <el-icon><User /></el-icon>
            {{ userInfo?.username }}
          </span>
          <el-button type="info" @click="handleLogout" :icon="SwitchButton" size="large">退出</el-button>
          <el-button
            v-if="isAdmin"
            type="primary"
            @click="showCreateDialog = true"
            :icon="Plus"
            size="large"
          >
            创建新流程
          </el-button>
        </div>
      </div>
    </div>
    <div class="page-main">
      <div class="session-grid">
        <el-card
          v-for="session in sessionList"
          :key="session.id"
          class="session-card"
          shadow="hover"
        >
          <template #header>
            <div class="session-header">
              <h3 @click="enterSession(session.id)" class="session-title">{{ session.sessionName }}</h3>
              <div class="header-right">
                <el-tag :type="getStatusType(session.status)" size="large">
                  {{ getStatusText(session.status) }}
                </el-tag>
                <el-button
                  v-if="isAdmin"
                  type="danger"
                  :icon="Delete"
                  size="small"
                  circle
                  @click.stop="handleDelete(session)"
                  style="margin-left: 10px;"
                />
              </div>
            </div>
          </template>
          <div class="session-info" @click="enterSession(session.id)">
            <p><el-icon><Calendar /></el-icon> 创建时间：{{ formatDate(session.createTime) }}</p>
            <p v-if="session.dataSourceFile">
              <el-icon><Document /></el-icon> 数据文件：已上传
            </p>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 创建流程对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建新拍卖流程"
      width="800px"
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
          <div class="form-tip">例如：1,3,5 表示表格内1,3,5为队长，并且依次为1、2、3号队伍队长</div>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Calendar, Document, Upload, Trophy, User, SwitchButton, Delete } from '@element-plus/icons-vue'
import { getSessionList, createSession, deleteSession } from '../api/session'

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

const handleDelete = (session) => {
  ElMessageBox.confirm(
    `确定要删除拍卖流程"${session.sessionName}"吗？删除后将标记该拍卖流程为结束状态`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const res = await deleteSession(session.id)
      if (res.code === 200) {
        ElMessage.success('删除成功')
        loadSessionList()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }).catch(() => {
    // 用户取消删除，不做任何操作
  })
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
}

.session-list-container::before {
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

.header-content h2 {
  margin: 0;
  color: #0d2d53;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 1.5px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-content h2::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 32px;
  background: linear-gradient(135deg, #0d2d53 0%, #ffd700 100%);
  border-radius: 3px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 24px;
}

.user-info {
  color: #333;
  font-size: 16px;
  font-weight: 600;
  padding: 10px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 24px;
  border: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.page-main {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 70px 60px;
  max-width: 1920px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.session-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  width: 100%;
}

.session-card {
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.98);
  overflow: hidden;
}

.session-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  border-color: rgba(13, 45, 83, 0.3);
}

.session-card {
  min-width: 0;
}

.session-card :deep(.el-card__header) {
  background: linear-gradient(135deg, #0d2d53 0%, #001428 100%);
  border-bottom: 2px solid rgba(255, 215, 0, 0.3);
  padding: 32px 36px;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.session-title {
  margin: 0;
  color: #ffd700;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  cursor: pointer;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.session-header :deep(.el-tag) {
  font-weight: 600;
  padding: 10px 18px;
  border-radius: 14px;
  font-size: 15px;
  border: none;
  flex-shrink: 0;
}

.session-info {
  padding: 36px;
  color: #606266;
  font-size: 16px;
  background: white;
}

.session-info p {
  margin: 24px 0;
  display: flex;
  align-items: center;
  gap: 14px;
  color: #606266;
  line-height: 2;
  font-size: 16px;
}

.session-info p:first-child {
  margin-top: 0;
}

.session-info p:last-child {
  margin-bottom: 0;
}

.session-info :deep(.el-icon) {
  color: #0d2d53;
  font-size: 20px;
  flex-shrink: 0;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  line-height: 1.5;
}

:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #0d2d53 0%, #001428 100%);
  padding: 24px 30px;
  border-bottom: 2px solid rgba(255, 215, 0, 0.3);
}

:deep(.el-dialog__title) {
  color: #ffd700;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 1px;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #ffd700;
  font-size: 20px;
}

:deep(.el-dialog__body) {
  padding: 30px;
  background: #fafafa;
}

:deep(.el-form-item__label) {
  color: #303133;
  font-weight: 600;
  font-size: 14px;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(13, 45, 83, 0.15);
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 16px rgba(13, 45, 83, 0.2);
}

:deep(.el-upload) {
  width: 100%;
}

:deep(.el-upload .el-button) {
  width: 100%;
  border-radius: 8px;
  border: 2px dashed #dcdfe6;
  background: white;
  color: #606266;
  transition: all 0.3s;
}

:deep(.el-upload .el-button:hover) {
  border-color: #0d2d53;
  color: #0d2d53;
  background: #f5f7fa;
}

:deep(.el-dialog__footer) {
  padding: 20px 30px;
  background: white;
  border-top: 1px solid #e4e7ed;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #0d2d53 0%, #001428 100%);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  padding: 12px 24px;
  transition: all 0.3s;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #001428 0%, #0d2d53 100%);
  box-shadow: 0 4px 15px rgba(13, 45, 83, 0.3);
  transform: translateY(-2px);
}

:deep(.el-button--info) {
  background: #909399;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  padding: 10px 20px;
  transition: all 0.3s;
}

:deep(.el-button--info:hover) {
  background: #787c82;
  transform: translateY(-2px);
}

:deep(.el-button) {
  transition: all 0.3s;
}
</style>
