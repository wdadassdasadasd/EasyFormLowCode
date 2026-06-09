<template>
  <section class="placeholder-page">
    <div>
      <span>Workspace</span>
      <h1>工作台</h1>
      <p>当前版本优先打磨页面设计器，工作台仅保留演示入口。</p>
    </div>
    <el-button type="primary" @click="$router.push('/pagedesigner')">进入页面设计</el-button>
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
