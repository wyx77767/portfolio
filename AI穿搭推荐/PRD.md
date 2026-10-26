# AI 穿搭推荐 + 虚拟形象试衣 · 产品需求文档 (PRD)

> 版本：v1.0 · 日期：2026-09-25 · 状态：原型交付

---

## 一、产品定位

一个**交互式 AI 穿搭顾问网页应用**。用户录入身体数据并捏出专属虚拟形象后，AI 通过多轮卡片式对话了解风格偏好、颜色喜好、穿搭技巧与穿着场合，生成完整穿搭方案并实时渲染到虚拟形象上试穿。满意后一键跳转电商平台购买，不满意可定向微调。

**核心价值**：
- 降低穿搭决策成本 —— 用 AI + 虚拟形象替代"凭空想象"
- 精准匹配身材 —— 基于真实身体数据推荐显瘦/显高方案
- 闭环购物 —— 推荐即购买，无需自行搜索

---

## 二、核心用户流程

```
首页 → 身体数据录入 → 捏脸生成形象 → 风格偏好问答 → 场合确认 → 生成穿搭方案 → 决策闭环
                                                                          ├─ 满意 → 店铺链接 + 平替
                                                                          └─ 不满意 → 追问痛点 → 定向换一身
```

### 2.1 身体数据录入
| 字段 | 说明 |
|------|------|
| 身高 / 体重 | 数值输入 |
| 肩宽 / 胸围 / 腰围 / 臀围 | 数值输入，不确定时可勾选"使用标准尺码" |
| 腿长比例 | 滑块（0.40–0.60），影响下装推荐 |
| 肤色 | 色板选择 + 可选拍照取色（原型用色板） |
| 标准尺码 S/M/L/XL | 简化录入，自动映射三围 |

### 2.2 捏脸生成形象
- 可调参数：脸型、发型、发色、眼型、眼色、肤色
- 体型自动与第 1 步数据联动（身高/体重/三围 → 胖瘦/肩宽/腰臀比）
- 实时 2D SVG 预览，正面/侧面/背面可切换

### 2.3 风格偏好问答（多轮对话）
1. **风格卡片**：6–8 种主流风格（日系街头、韩系简约、法式慵懒、美式复古、机能风、Clean Fit、老钱风、Y2K），点击 喜欢 / 不喜欢
2. **颜色偏好**：色板多选
3. **穿搭技巧**：oversize / 叠穿 / 上松下紧 / 同色系 / 撞色，配示例标签

### 2.4 场合确认
- 通勤、约会、运动、聚会、面试、旅行等
- 支持多选，标注 主 / 次

### 2.5 生成穿搭方案
- AI 生成 1 套完整穿搭：上衣 + 下装 + 外套 + 鞋 + 配饰
- 实时渲染到虚拟形象（正面/侧面/背面切换）
- 同步生成穿搭介绍文案：设计理念、单品解析、显瘦/显高技巧、搭配逻辑、适合原因（结合身材数据）

### 2.6 决策闭环
- **满意** → 展示各单品店铺链接（淘宝/天猫/京东/得物）+ 价格区间 + 平替选项
- **不满意** → 追问痛点（颜色 / 版型 / 单品 / 整体风格），定向换一身，保留已确认部分

---

## 三、页面结构

| 页面 | 说明 |
|------|------|
| 首页 | 产品价值展示 + 开始入口 |
| 数据录入页 | 表单 + 体型预览图 |
| 捏脸页 | 实时预览的参数化捏脸面板 |
| 对话推荐页 | 风格/颜色/技巧多轮卡片流 |
| 场合页 | 主次场合选择 |
| 方案详情页 | 穿搭介绍 + 单品清单 + 店铺链接 + 换一身/微调 |

---

## 四、技术架构

### 4.1 前端
- **框架**：React 18（CDN + Babel 运行时编译，原型阶段免构建）
- **样式**：Tailwind CSS（CDN）
- **虚拟形象**：自研参数化 2D SVG 头像系统（分层：身体/脸/发型/五官/服装）
- **状态管理**：React `useReducer` + Context，全局用户画像 `userProfile`

### 4.2 推荐引擎（原型阶段）
- 本地规则打分引擎：每件单品带 `styles / colors / occasions / bodyTypes / techniques` 标签
- 打分函数：`score = Σ(权重 × 匹配度)`，按用户偏好加权排序
- 返回结构化 JSON：
```json
{
  "outfit": {
    "top": { "name": "...", "color": "#...", "tags": [...], "searchKeywords": "..." },
    "bottom": {...}, "outerwear": {...}, "shoes": {...}, "accessories": [...]
  },
  "description": {
    "concept": "...", "items": [...], "tips": [...], "logic": "...", "fitReason": "..."
  }
}
```
- 生产环境可替换为大模型 API（如 GPT / Claude / 豆包），输入用户画像 JSON，输出上述结构

### 4.3 店铺链接
- 用搜索关键词生成平台搜索 URL：
  - 淘宝：`https://s.taobao.com/search?q={keywords}`
  - 天猫：`https://list.tmall.com/search_product.htm?q={keywords}`
  - 京东：`https://search.jd.com/Search?keyword={keywords}`
  - 得物：`https://www.dewu.com/search?keyword={keywords}`

### 4.4 虚拟形象（生产升级路线）
- 原型：2D SVG 参数化形象 + 服装贴图叠加
- 升级：接入 Ready Player Me（3D 头像）/ Botify / 阿里 OutfitAnyone（虚拟试衣 API）

---

## 五、设计规范

### 5.1 视觉风格
- **方向**：杂志感 / Editorial，参考 Vogue × 得物 × 小红书
- **配色**：黑白灰主色 + 克莱因蓝 `#002FA7` 强调色
  ```css
  --ink: #0A0A0A;        /* 近黑 */
  --paper: #FAFAF8;      /* 米白 */
  --gray: #8A8A8A;       /* 中性灰 */
  --line: #E5E5E0;       /* 分割线 */
  --klein: #002FA7;      /* 克莱因蓝 强调 */
  --klein-soft: #E8ECF7; /* 克莱因蓝浅底 */
  ```

### 5.2 字体
- 标题：`Playfair Display`（衬线展示体，杂志感）
- 正文：`Noto Sans SC`（中文无衬线，清晰易读）

### 5.3 交互原则
- 卡片式选择替代打字输入，操作门槛最低化
- 步骤进度条始终可见，支持回退
- 换一身时局部替换，保留已确认单品
- 所有选择即时反馈到虚拟形象预览

---

## 六、数据模型

```typescript
interface UserProfile {
  body: {
    height: number; weight: number;
    shoulder: number; bust: number; waist: number; hip: number;
    legRatio: number; skinTone: string; size: 'S'|'M'|'L'|'XL';
  };
  avatar: {
    faceShape: 'oval'|'round'|'square'|'long';
    hairStyle: string; hairColor: string;
    eyeShape: string; eyeColor: string;
  };
  preferences: {
    likedStyles: string[]; dislikedStyles: string[];
    colors: string[]; techniques: string[];
  };
  occasions: { primary: string; secondary: string[] };
  currentOutfit: Outfit | null;
}
```
