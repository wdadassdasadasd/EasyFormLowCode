<template>
  <section class="placeholder-page">
    <div>
      <span>Projects</span>
      <h1>项目管理</h1>
      <p>第一版聚焦演示项目和用户管理页面，后续再接完整项目 CRUD。</p>
    </div>
    <el-button type="primary" plain @click="$router.push('/pagedesigner')">查看演示页面</el-button>
  </section>
</template>

<style lang="scss" scoped>
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: calc(100vh - 88px);
  padding: 32px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

h1 {
  margin: 6px 0 8px;
  color: #111827;
}

p {
  margin: 0;
  color: #6b7280;
}
</style>
