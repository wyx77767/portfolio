# wyx 作品集 · 设计规范（design.md）

> 风格定位：**深蓝赛博朋克 + Y2K/vaporwave 灵感 + 玻璃拟态 + 3D 魔方导航**
> 所有新页面必须严格遵循本规范，保证全站视觉统一。
> 实现时优先使用 CSS 变量，禁止硬编码颜色。

---

## 1. 配色系统

### 1.1 深色模式（默认）

| 用途 | 变量 | 色值 | 说明 |
|---|---|---|---|
| 页面背景 | `--bg` | `#0a1530` | 深蓝主调（素材主调） |
| 背景亮一级 | `--bg-soft` | `#1a2a5a` | 深蓝亮一级 |
| 正文文字 | `--body-text` | `#e8e8f0` | 深蓝背景上的浅字 |
| 次要文字 | `--muted` | `#5a6a9a` | 蓝灰 |
| **主色（点缀）** | `--primary` | `#4fc3f7` | 青蓝高亮（素材主点缀） |
| 辅助色 | `--accent` | `#ff4fc3` | 品红，仅 glitch/渐变用，克制 |
| 卡片背景 | `--card-bg` | `rgba(18, 30, 60, .7)` | 深蓝玻璃 |
| 卡片边框 | `--card-border` | `rgba(79, 195, 247, .12)` | 青蓝细边 |
| 导航背景 | `--nav-bg` | `rgba(10, 21, 48, .75)` | 深蓝玻璃 |
| 导航链接 | `--nav-muted` | `rgba(232, 232, 240, .55)` | 半透明白 |
| 网格线 | `--grid` | `rgba(79, 195, 247, .1)` | 青蓝网格 |
| 渐变 | `--grad` | `linear-gradient(135deg, #4fc3f7, #ff4fc3)` | 青→品红 |

### 1.2 日光模式

| 用途 | 变量 | 色值 |
|---|---|---|
| 页面背景 | `--bg` | `#f5f7fa` |
| 正文文字 | `--body-text` | `#0f172a`（slate-900） |
| 次要文字 | `--muted` | `#64748b` |
| 主色 | `--primary` | `#0288d1`（Material 蓝） |
| 辅助色 | `--accent` | `#e91e63`（Material 品红） |
| 卡片背景 | `--card-bg` | `rgba(255, 255, 255, .92)` |
| 卡片边框 | `--card-border` | `rgba(2, 136, 209, .14)` |
| 导航背景 | `--nav-bg` | `rgba(255, 255, 255, .88)` |

### 1.3 魔方六面配色

| 面 | 色值 | 用途 |
|---|---|---|
| f1 正面 | `#0288d1` | 蓝 |
| f2 右面 | `#e91e63` | 品红 |
| f3 背面 | `#4fc3f7` | 青 |
| f4 左面 | `#ff6b9d` | 粉 |
| f5 顶面 | `#ffffff` | 白（文字用 `#0f172a`） |
| f6 底面 | `#0f172a` | 深蓝 |

---

## 2. 字体系统

### 2.1 字体族

| 用途 | 字体 | 来源 |
|---|---|---|
| 标题（英文/数字） | `Bebas Neue` | Google Fonts |
| 正文（中文） | `PingFang SC`, `Microsoft YaHei`, sans-serif | 系统 |
| 复古等宽（备用） | `Share Tech Mono`, `VT323`, `Press Start 2P` | Google Fonts |

### 2.2 字号层级

| 元素 | 字号 | 字重 | 行高 | 字距 |
|---|---|---|---|---|
| 大标题 `.hero h1` | `clamp(36px, 6vw, 48px)` | 400 | 1.15 | 1px |
| 板块标题 `.sec-title` | `clamp(32px, 5vw, 42px)` | 400 | — | 2px |
| 卡片标题 `h3.block-h` | 20px | 400 | — | 1px |
| 正文 | 15px | 400 | 1.7 | — |
| 次要文字 `.muted` | 14px | 400 | — | — |
| Logo | 20px | 400 | — | 3px |
| 按钮 `.btn` | 16px | 400 | — | 2px |
| 兴趣卡片文字 `.hobby .t` | 15px | 700 | — | — |

---

## 3. 间距系统

### 3.1 模块间距

| 元素 | 间距 |
|---|---|
| 板块上下内边距 `.section` | `80px 0` |
| Hero 上下内边距 `.hero` | `48px 0 40px` |
| 容器最大宽度 `.container` | `1080px`，左右 `24px` |
| 板块标题与副标题间距 | `8px` |
| 副标题与内容间距 `.sec-sub` margin-bottom | `48px` |
| 板块头部底部 `.sec-head` margin-bottom | `48px` |
| Grid 两列间距 `.grid-2` | `26px` |

### 3.2 组件内边距

| 元素 | 内边距 |
|---|---|
| 卡片 `.card` | `28px` |
| 项目卡 `.work .body` | `20px` |
| 兴趣卡 `.hobby` | `22px 10px` |
| 信息项 `.info-item` | `12px 16px` |
| 按钮 `.btn` | `10px 24px` |
| 导航 `.nav-inner` | `14px 24px` |

---

## 4. 组件样式

### 4.1 导航栏

```css
nav {
  position: sticky; top: 0; z-index: 100;
  background: var(--nav-bg);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}
```
- 玻璃拟态 + `backdrop-filter: blur(20px)`
- Logo：Bebas Neue + 主色高亮
- 链接：`var(--nav-muted)`，hover 变 `var(--primary)`

### 4.2 3D 魔方导航

```css
.nav-tower { perspective: 900px; width: 160px; height: 160px; cursor: grab; }
.tower-stage { transform-style: preserve-3d; transform: rotateY(-30deg) rotateX(20deg); }
.tower-face {
  border: 2px solid #0a1530; border-radius: 6px;
  background-image: linear-gradient(#0a1530 2px, transparent 2px),
                    linear-gradient(90deg, #0a1530 2px, transparent 2px);
  background-size: calc(100%/3) calc(100%/3);  /* 3×3 网格 */
}
```
- 6 面立方体，每面 3×3 深色网格
- JS 接管旋转（requestAnimationFrame），默认慢速自转，拖拽暂停
- 文字：白色 + `text-shadow` 黑底，f5 白面用深色字

### 4.3 卡片

```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 28px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, .15);
  backdrop-filter: blur(16px);
}
```
- 玻璃拟态 + 1px 细边框 + 柔阴影
- 标题：Bebas Neue + 主色 + 下边框分隔

### 4.4 按钮

```css
.btn {
  padding: 10px 24px; border-radius: 4px;
  font-family: "Bebas Neue"; font-size: 16px; letter-spacing: 2px;
}
.btn-main { background: var(--primary); color: #0a1530; }
.btn-ghost { background: transparent; color: var(--body-text); border: 1px solid rgba(79,195,247,.4); }
```
- 圆角 4px，无阴影，hover 上移 1px

### 4.5 兴趣卡片

```css
.hobby {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 18px; text-align: center; padding: 22px 10px;
  box-shadow: var(--shadow);
}
.hobby .emoji { font-size: 36px; }
.hobby .t { font-weight: 700; font-size: 15px; color: #000; }  /* 强制黑色 */
```

### 4.6 技能条

```css
.skill .track { height: 8px; border-radius: 4px; background: rgba(79,195,247,.08); }
.skill .fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #4fc3f7, #ff4fc3); }
```

---

## 5. 背景层

- **网格层**：`linear-gradient` 60px 间距，`var(--grid)` 色
- **径向光雾**（`body::before`）：左上青蓝光雾 + 右上品红光雾 + 底部深蓝
- **glitch 条纹**（`body::after`，仅深色模式）：`repeating-linear-gradient` 水平条纹，`mix-blend-mode: screen`
- 日光模式下：去掉 glitch 条纹，光雾改为低透明度蓝/品红

---

## 6. 动效

| 动效 | 用途 | 参数 |
|---|---|---|
| `reveal` 滚动浮现 | 板块进入视口 | `translateY(30px) → 0`，0.8s |
| `glitchShift` | Hero 名字故障风 | 2.8-3.2s，青/品红双层偏移 |
| `wobble` | 头像点击摇摆 | 0.6s，±8° |
| `blink` | 打字机光标 | 1s steps(1) |
| 魔方自转 | 默认慢速 | 0.15°/帧 |

---

## 7. 响应式断点

| 断点 | 行为 |
|---|---|
| `max-width: 900px` | 隐藏 3D 魔方，显示 `.nav-fallback` 横向导航 |
| `max-width: 760px` | `.grid-2` 变单列；头像缩小到 190px；按钮组纵向 |

---

## 8. 禁忌

- ❌ 禁止硬编码颜色，必须用 CSS 变量
- ❌ 禁止在日光模式下使用浅色文字（用 `--body-text`）
- ❌ 禁止给兴趣卡文字设浅色（强制 `#000`）
- ❌ 禁止在魔方上加 CSS `animation`（JS 接管旋转）
- ❌ 禁止使用黄/绿/紫等彩虹色，只用青蓝 + 品红双色体系
