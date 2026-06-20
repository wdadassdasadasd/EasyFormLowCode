<template>
  <section class="setting-page">
    <header><span>Settings</span><h1>运行说明</h1><p>当前版本专注单表后台 CRUD 生成，不包含权限、审批或远程数据源写入能力。</p></header>
    <el-descriptions :column="1" border>
      <el-descriptions-item label="内置数据源">SQLite Runtime CRUD</el-descriptions-item>
      <el-descriptions-item label="页面协议">PageSchema v1</el-descriptions-item>
      <el-descriptions-item label="发布策略">草稿保存、发布快照、版本回滚后再发布</el-descriptions-item>
      <el-descriptions-item label="外部 REST 数据源">仅兼容读取预览，暂不支持写入或统计</el-descriptions-item>
    </el-descriptions>
  </section>
</template>

<script setup>
defineOptions({ name: 'SettingPage' })
</script>

<style lang="scss" scoped>
.setting-page { display: grid; gap: 18px; max-width: 900px; padding: 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }.setting-page span { color: #2563eb; font-size: 12px; font-weight: 700; }.setting-page h1 { margin: 6px 0; }.setting-page p { margin: 0; color: #6b7280; }
</style>
