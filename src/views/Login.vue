<template>
  <div class="login-container">
    <div class="background-overlay"></div>
    <div class="login-wrapper">
      <el-card class="login-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <div class="logo-icon">
              <el-icon :size="48"><Trophy /></el-icon>
            </div>
            <h1>YPL选手拍卖系统</h1>
            <p class="subtitle">YPL Player Auction System</p>
          </div>
        </template>
        <el-form :model="loginForm" :rules="rules" ref="loginFormRef" label-width="0px" class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              size="large"
              class="custom-input"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              class="custom-input"
              show-password
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleLogin"
              class="login-button"
            >
              {{ loading ? '登录中...' : '登录' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Trophy } from '@element-plus/icons-vue'
import { login } from '../api/auth'

const router = useRouter()
const loginFormRef = ref()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const res = await login(loginForm)
        if (res.code === 200) {
          localStorage.setItem('token', res.data.token)
          localStorage.setItem('userInfo', JSON.stringify(res.data))
          ElMessage.success('登录成功')
          router.push('/sessions')
        } else {
          ElMessage.error(res.message || '登录失败')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '登录失败，请检查网络连接')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-image: url('https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=2071&q=80');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(13, 45, 83, 0.85) 0%, rgba(0, 20, 40, 0.9) 50%, rgba(13, 45, 83, 0.85) 100%);
  backdrop-filter: blur(2px);
}

.login-wrapper {
  position: relative;
  z-index: 10;
  width: 480px;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-card {
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.login-card :deep(.el-card__header) {
  padding: 50px 40px 35px;
  background: linear-gradient(135deg, #0d2d53 0%, #001428 50%, #0d2d53 100%);
  border-bottom: 2px solid rgba(255, 215, 0, 0.3);
  position: relative;
  overflow: hidden;
}

.login-card :deep(.el-card__header)::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.card-header {
  text-align: center;
  color: white;
  position: relative;
  z-index: 1;
}

.logo-icon {
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%);
  border-radius: 50%;
  border: 3px solid rgba(255, 215, 0, 0.5);
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
  }
}

.card-header h1 {
  color: #ffd700;
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 15px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.3);
  letter-spacing: 2px;
  font-family: 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.subtitle {
  color: rgba(255, 255, 255, 0.85);
  font-size: 16px;
  margin: 0;
  font-weight: 300;
  letter-spacing: 3px;
  text-transform: uppercase;
}

.login-form {
  padding: 45px 40px 40px;
  background: white;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 28px;
}

.custom-input :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 14px 18px;
  transition: all 0.3s ease;
  background: #f5f7fa;
  border: 2px solid #e4e7ed;
}

.custom-input :deep(.el-input__wrapper):hover {
  box-shadow: 0 4px 12px rgba(13, 45, 83, 0.2);
  border-color: rgba(13, 45, 83, 0.4);
  background: white;
}

.custom-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 16px rgba(13, 45, 83, 0.3);
  border-color: #0d2d53;
  background: white;
}

.custom-input :deep(.el-input__inner) {
  font-size: 16px;
  color: #303133;
  font-weight: 400;
}

.custom-input :deep(.el-input__prefix) {
  color: #0d2d53;
  font-size: 20px;
  margin-right: 12px;
}

.login-button {
  width: 100%;
  height: 52px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 2px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0d2d53 0%, #001428 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(13, 45, 83, 0.4);
  transition: all 0.3s ease;
  margin-top: 15px;
  color: white;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(13, 45, 83, 0.5);
  background: linear-gradient(135deg, #001428 0%, #0d2d53 100%);
}

.login-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(13, 45, 83, 0.3);
}

.login-button.is-loading {
  background: linear-gradient(135deg, #0d2d53 0%, #001428 100%);
}
</style>
