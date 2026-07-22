export const DEFAULT_PAGE_ID = 'user_manage'

// API 基础地址：开发期通过 .env.development 提供 VITE_API_BASE_URL；生产构建同样
// 通过环境变量注入，避免在生产二进制里硬编码本地回环地址导致部署事故。当未设置
// 时回退为空串，使请求相对当前站点发出（部署到与后端同源时无需额外配置）。
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || ''