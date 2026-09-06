# ZUNEX 充电应用 · UI 设计文档

> 版本 v1.0 · 2026-09 · 适用范围：ZUNEX 移动端充电全流程 Web 应用（Next.js + Tailwind CSS 4 + Framer Motion）
>
> 设计关键词：**Ink · Paper · Signal** —— 深墨色底、纸白文字、信号蓝主色，琥珀色能量点缀。玻璃与光。没有霓虹，没有游戏感，没有"AI 味"的圆润卡片堆砌。

---

## 目录

1. [设计理念](#1-设计理念)
2. [设计令牌 Design Tokens](#2-设计令牌)
3. [全局视觉系统](#3-全局视觉系统)
4. [动效系统](#4-动效系统)
5. [页面规格](#5-页面规格)
   - 5.1 [场景背景（全局）](#51-场景背景全局)
   - 5.2 [设备门控页 DeviceGate](#52-设备门控页-devicegate)
   - 5.3 [启动加载页 Boot](#53-启动加载页-boot)
   - 5.4 [欢迎页 Welcome](#54-欢迎页-welcome)
   - 5.5 [时长选择页 Duration](#55-时长选择页-duration)
   - 5.6 [支付页 Payment](#56-支付页-payment)
   - 5.7 [激活仪式页 Activation](#57-激活仪式页-activation)
   - 5.8 [充电进行页 Charging](#58-充电进行页-charging)
   - 5.9 [完成页 Complete](#59-完成页-complete)
   - 5.10 [错误页 Error](#510-错误页-error)
   - 5.11 [演示面板 DemoPanel](#511-演示面板-demopanel)
6. [状态与反馈汇总](#6-状态与反馈汇总)
7. [可访问性与兼容性](#7-可访问性与兼容性)
8. [页面流转与状态机映射](#8-页面流转与状态机映射)

---

## 1. 设计理念

### 1.1 核心原则

| 原则 | 说明 |
|---|---|
| **物体即界面** | 关键动作用"物"承载（可拍击的能量气泡、玻璃能量环、完成印章），而非传统按钮。欢迎页没有任何按钮。 |
| **玻璃与光** | 所有面板为多层渐变玻璃材质：内高光 + 内阴影 + 背景模糊 + 外部深阴影。光源只有两种：信号蓝（冷）与琥珀（暖）。 |
| **后端即真相** | UI 是服务器状态的纯反射（会话快照驱动），界面不"猜"状态。 |
| **去 AI 感** | 刻意避免：圆形单选框、大量同圆角卡片、居中对称堆叠的"模板感"。用排印式细线行、全宽仪表条、非对称光斑替代。 |
| **服务器权威计时** | 倒计时以服务器时间为锚（含时钟偏移校准），断网时本地续走并在恢复后校正。 |

### 1.2 品牌资产（approved artwork，禁止重绘/改色）

| 资产 | 路径 | 用法 |
|---|---|---|
| 全字标 Wordmark | `public/brand/zunex-wordmark.svg` | 顶部品牌位（BrandHeader），白色纸色 |
| 品牌符号 Symbol | `public/brand/zunex-symbol.svg` | 气泡核心、能量环水印、完成印章、页脚点缀、站点徽章 |
| 应用图标 | `public/brand/zunex-icon.svg` | 容器圆角 26.8% |
| PhonePe 图标 | `public/brand/logo-phonepe.svg` | 支付列表（紫底 #5F259F，白"पे"） |
| Google Pay 图标 | `public/brand/logo-gpay.svg` | 支付列表（白底，四色 G + "Pay"） |

### 1.3 三条硬性体验红线

1. **充电屏是主角**——必须一眼传达"能量在流动"。
2. **每个状态转换都有仪式感**——页面切换统一模糊淡入，关键节点有专属动效（气泡迸裂、能量解锁、印章落定）。
3. **永远不让用户猜**——连接状态、验证状态、演示状态全部可见（通过呼吸点与状态胶囊）。

---

## 2. 设计令牌

### 2.1 色彩

```css
/* 墨色阶（背景） */
--color-ink-950: #04050a;   /* 页面最深底色 */
--color-ink-900: #07090f;
--color-ink-850: #0a0d17;
--color-ink-800: #0d1120;
--color-ink-700: #141931;

/* 纸色阶（文字） */
--color-paper:     #f2f5ff;  /* 主文字 */
--color-paper-dim: #aab3cf;  /* 次级文字 */

/* 信号蓝（主色 / 冷光源） */
signal-200 #cdd8ff / 300 #a9bcff / 400 #7d97ff / 500 #4a63ff / 600 #2447ff / 700 #1a34d6

/* 琥珀（能量点缀 / 暖光源） */
amber-300 #ffd58a / 400 #ffc24d / 500 #ffb020

/* 余烬（错误 / 警示暖红） */
ember-400 #ff8a70 / ember-500 #ff6a4d

/* 薄荷（成功 / 在线） */
mint-400 #7dedc4
```

**使用规则**

- 背景永远是 ink 系；paper 用于文字；signal 是交互与能量的默认色；amber 只用于"能量/等待/演示"；ember 只用于错误；mint 只用于"可用/在线/成功"。
- 状态点颜色映射：在线 `#7dedc4` · 等待/同步 `#ffc24d` · 离线 `#ff8a70` · 信号蓝 `#7d97ff`。

### 2.2 字体

| 角色 | 字体栈 | 用途 |
|---|---|---|
| 正文 | `var(--font-inter), system-ui, sans-serif` | 段落、说明 |
| 展示 `font-display` | `var(--font-space), var(--font-inter), system-ui` | 标题、按钮、eyebrow、状态文案 |
| 数字 `numeral` | Space Grotesk + `font-variant-numeric: tabular-nums; letter-spacing: -0.01em` | 所有数字（价格、瓦数、百分比） |
| 眉标 `eyebrow` | Space Grotesk · 0.6875rem · 字距 0.32em · 全大写 · `rgba(242,245,255,0.42)` · w500 | 标签、分区题 |

**典型字号阶梯**（移动端 1x）

```
金额大数      3.4rem / semibold
页面主标题     1.9rem（完成/激活）· 1.75rem（欢迎）· 1.65rem（时长）
遥测数值      1.25rem (text-xl)
正文         0.875–0.9375rem
状态/脚注     0.6875rem，字距 0.18em，全大写
最细眉标      0.5625rem，字距 0.2–0.22em
```

### 2.3 布局与安全区

- 页面容器 `.app-viewport`：`min-height: 100dvh` 的纵向 flex。
- 水平留白 `.safe-x`：`max(env(safe-area-inset-left), 20px)`。
- 顶部 `.safe-top`：`env(safe-area-inset-top) + 14px`；底部 `.safe-bottom`：`env(safe-area-inset-bottom) + 20px`。
- 内容列最大宽度 `max-w-sm`（24rem），水平居中。
- `color-scheme: dark`；全局禁用点按高亮；`overscroll-behavior-y: none`；按钮 `touch-action: manipulation`。

---

## 3. 全局视觉系统

### 3.1 玻璃材质（三层递进）

| 类名 | 材质 | 用途 |
|---|---|---|
| `.glass` | 165° 白色渐变 7.5%→2.2%→5%，描边 `rgba(255,255,255,0.09)`，内高光 + 内底影 + 外深影 `0 24px 60px -24px rgba(0,0,0,0.75)`，`blur(20px) saturate(150%)` | 主面板、选中卡片 |
| `.glass-soft` | 白 4.5% 平铺，描边 0.07，`blur(14px)` | 未选中卡片 |
| `.glass-chip` | 胶囊（圆角 9999），白 5.5%，描边 0.09，`blur(12px)`，内高光 0.08 | 状态胶囊、返回钮、徽章、演示钮 |

配套 `.hairline-top`：顶部 1px 渐变高光线（左右各内缩 12%）——所有玻璃面板的"受光边"。

> **圆角规范**：主面板 `1.75rem`；列表容器 `1.5rem`；卡片/警示 `1.25rem`；按钮 `1.25rem`；胶囊 `9999px`。禁止更夸张的"果冻圆角"。

### 3.2 按钮

**GlowButton `.btn-glow`**（主操作，每屏至多一个）

- 尺寸：全宽，`padding: 1.0625rem 1.5rem`，圆角 `1.25rem`，Space Grotesk 600 / 1rem。
- 底色：`linear-gradient(140deg, #4a63ff 0%, #2447ff 55%, #1a34d6 100%)`，描边 `rgba(255,255,255,0.18)`。
- 光：`inset 0 1px 0 rgba(255,255,255,0.28)` 高光 + `0 14px 44px -10px rgba(36,71,255,0.55)` 蓝色光晕；`::after` 叠加顶部 14% 白色渐变。
- 交互：hover 亮度 1.06；按压 Framer `scale: 0.97`（spring stiffness 500 / damping 30）；禁用 `grayscale(0.5) brightness(0.75)`。

**GhostButton `.btn-ghost`**（次操作）

- 白 5% 平铺底，描边 0.1，文字 `rgba(242,245,255,0.82)`，500 字重 / 0.9375rem；按压底色升到 9%。

**文字按钮**：取消/关闭类动作为纯文字（`text-paper-dim`，0.875–0.8125rem）。

### 3.3 状态胶囊与状态点

- `StatusPill`：`.glass-chip` 胶囊 + 7px 呼吸圆点（`breathe 2.4s`）+ 全大写 0.6875rem 文案。色调：signal / mint / amber / ember / neutral。
- `pulse-dot`：7px 实心点 + `::after` 扩散环（`pulse-ring 2s`，scale 0.6→1.6 渐隐），颜色由 `--pulse-color` 注入。

### 3.4 图标

自绘 24×24 描边图标集（`stroke: currentColor`，w1.7，圆头圆角）：bolt / lock / shield / chevron-left / check / close / refresh / info / timer / power / phone / leaf。其中 bolt 为实心。仅用于语义点缀，不承载品牌。

### 3.5 底部抽屉 Sheet

- 遮罩：`bg-black/60 + backdrop-blur-sm`，淡入淡出。
- 面板：`.glass rounded-[1.75rem]`，吸底（含安全区 + 18px），顶部 40×4 拖拽指示条。
- 动效：`y: 110% → 0`，spring stiffness 320 / damping 34。`role="dialog"` + `aria-modal`，遮罩点击可关（onClose 提供时）。

### 3.6 骨架加载

`.shimmer`：1.8s 横向扫光（透明→白 9%/16%→透明），用于支付意向加载占位。

---

## 4. 动效系统

### 4.1 标准曲线与节奏

```ts
const ease = [0.22, 1, 0.36, 1]; // 全应用标准曲线（cubic-bezier）
```

| 场景 | 参数 |
|---|---|
| 页面切换（AnimatePresence `mode="wait"`） | 入场：`opacity 0→1, y 26→0, scale 0.985→1, blur 8→0`，0.5s；出场：`y→-20` 同步渐隐 |
| 内容进场 | `opacity + y(16–26px)`，0.55–0.8s，可叠加 stagger（0.06–0.09s/项） |
| 按压反馈 | `scale 0.95–0.975`，spring 500/30 |
| 环境循环 | 呼吸 `breathe`（0.75→1 透明度，scale 1→1.06）、漂浮 `floaty`（±10px, 6s） |

### 4.2 循环动画登记表（均受 `prefers-reduced-motion` 抑制）

| 名称 | 时长 | 用途 |
|---|---|---|
| `spin-slow` | 8–30s 线性 | 光泽扫掠、光晕旋转、射线、火花轨道 |
| `breathe` | 4.6–5.5s | 光晕、状态点 |
| `drift-a/b` | 26s/32s 交替 | 背景光束漂移 |
| `grain-shift` | 9s steps(6) | 胶片颗粒 |
| `pulse-ring` | 2s | 状态点扩散环 |
| `mark-breathe` | 3.2s | 气泡内品牌符号呼吸（透明度 0.82↔1） |
| `hint-pulse` | 2.8s | "TAP TO CHARGE" 提示呼吸（0.45↔1） |
| `shimmer-sweep` | 1.8s | 验证占位扫光 |
| `rise` | 3.4s | 完成页上升能量微粒 |

### 4.3 一次性动效（关键节点）

| 节点 | 动效 |
|---|---|
| 气泡迸裂 | 压缩→膨胀→消散 `scale [1, 0.9, 1.16, 1.05] / opacity [1,1,1,0]`，0.7s，times `[0, 0.3, 0.72, 1]`；闪光 0.75s；两圈冲击环 0.85s（第二圈延迟 0.12s）；14 颗液滴 0.7–0.86s；**760ms 后跳转下一页** |
| 能量解锁 | 中心径向光爆（1.4s）+ 三圈扩散环（1.6s，间隔 0.22s） |
| 印章落定 | 玻璃盘 0.9s 展开 → 符号 spring 弹入（延迟 0.18s）→ 金色涟漪 1.6s（延迟 0.35s） |
| 金额浮现 | `blur(6px)→0` + 上移，0.5s，`popLayout` 按金额值重触发 |

---

## 5. 页面规格

### 5.1 场景背景（全局）

**构成**（`.scene`，fixed 全屏，`pointer-events: none`）

1. 底色：径向 `120% 90% at 50% 0%` 的 #0b1024 渐入 ink-950。
2. 三束模糊光（`blur(70px)` 椭圆）：
   - `beam-a`：蓝 `rgba(36,71,255,0.34)`，左上，`drift-a 26s`；
   - `beam-b`：琥珀 `rgba(255,176,32,0.14)`，右下，`drift-b 32s`；
   - `beam-c`：淡蓝 `rgba(125,151,255,0.1)`，中部，38s 反向。
3. 暗角 `.vignette`：`130% 110% at 50% 45%`，边缘 55% 黑。
4. 胶片颗粒 `.grain`：SVG 噪声，透明度 0.05，9s 抖动。

### 5.2 设备门控页 DeviceGate

**触发**：视口 `≥900px 且 pointer: fine`（桌面），且 localStorage `zunex:preview ≠ "1"`。

**布局**：居中列（max-w-sm）：字标 h-4 → 176×176 扫描框 → 标题 + 说明 → 预览按钮。

**视觉**：扫描框为四角 L 形白 25% 边框（各 40×40，外角圆角 2xl）；一条蓝色水平扫描线（`via-signal-400` 渐变）在 12%↔86% 间往返，3.2s 循环。

**交互**：`Continue in preview mode` 写入 `zunex:preview=1` 后进入完整应用。手机访问直接跳过此页。

**动效**：整体 `opacity+y(24px)` 0.7s 进场。

### 5.3 启动加载页 Boot

- 居中：EnergyOrb（`min(46vw, 190px)`，强度 0.8）+ 眉标状态文案（"Locating station" / "Restoring your session" / "Syncing"）。
- 顶部 BrandHeader 全字标。
- 无交互，状态到达后由页面切换动效接管。

### 5.4 欢迎页 Welcome

**定位**：扫码落地第一屏。"物体即界面"的完整表达——**全页无按钮**。

**布局**（上→下）

1. **BrandHeader**（字标 h-5，`-inset-x-8 -inset-y-3` 蓝雾 `rgba(157,180,255,0.16)` + `blur-xl` 环境光晕）。
2. 站点信息：`Zunex One`（font-display 1.75rem semibold）+ 位置（paper-dim 0.875rem）。
3. **能量气泡**（flex-1 垂直居中，尺寸 `min(62vw, 270px)`）：
   - `bubble-halo`：外扩 30%，蓝 0.38 + 琥珀 0.16 双径向，blur 28px，`breathe 5.5s`；
   - `bubble-body`：玻璃球体——左上白高光 26%、右下信号蓝 50%、左下琥珀 13%，160° `#111640→#070a18` 深底；描边白 0.16；内高光/内蓝影/内深影/外蓝晕四层 box-shadow；顶部边缘光 `::after`；
   - `bubble-swirl` / `bubble-swirl-inner`：两层锥形渐变能量涡旋，9s 正转 / 6s 反转，blur 14/10px；
   - **品牌符号**居中（宽 34%），蓝色 drop-shadow，`mark-breathe 3.2s`；
   - `bubble-spec`：左上 24° 斜置白色高光斑。
4. 提示文案："TAP TO CHARGE"（0.75rem，字距 0.34em，`hint-pulse 2.8s` 呼吸）。
5. 页脚：StatusPill（mint，"AVAILABLE · 30W USB-C"，可用时呼吸）+ 符号点缀的 "PAY SECURELY WITH UPI · INSTANT START"（0.6875rem / 0.18em）。

**交互**

- 整个气泡是 `<button aria-label="Tap to charge">`；悬浮漂浮 `y [0,-10,0] 6s`，按压 `scale 0.95`。
- 站点不可用时：气泡禁用、光晕降至 0.35、文案变 "STATION UNAVAILABLE"（paper-dim/50，无呼吸）。
- **拍击后**：进入迸裂序列（见 §4.3），760ms 后调用 `onStart` 进入时长选择页；迸裂期间按钮禁用防连点；提示文案同步淡出。
- `prefers-reduced-motion`：跳过动画直接跳转。

**进场**：字标 `y-12` 0.7s → 站点信息 `y-18` 0.8s delay 0.15 → 气泡 `scale 0.86` 1s delay 0.2 → 页脚 `y-20` 0.8s delay 0.45。

### 5.5 时长选择页 Duration

**布局**

1. BrandHeader：左侧 40×40 返回钮（glass-chip，chevron-left 图标），中央字标。
2. 主标题两行："How long / do you need power?"（1.65rem semibold）。
3. 计费方案卡片列（gap 0.75rem，进场 stagger 0.09s）：
   - 卡片：全宽 `rounded-[1.25rem] p-5`，未选中 `glass-soft` / 选中 `glass`；
   - 内容一行三区：分钟大数（numeral 2.1rem + "MIN" 眉标）｜右侧价格（numeral 1.25rem）+ tagline（paper-dim 0.75rem）｜选中态 "SELECTED" 标签（0.5625rem / 0.22em，signal-300，`x:6` 滑入）；
   - **选中样式**：描边 `rgba(125,151,255,0.55)` + 双圈光（`0 0 0 1px rgba(74,99,255,0.35)`）+ 蓝色外晕 + 165° 蓝/白/琥珀渐变底；按压 `scale 0.975`；`aria-pressed` 标记；
   - **刻意去除了圆形单选框**。
4. 页脚 GlowButton：未选 "Select a duration"（禁用）；已选 `Continue · ₹xx`；提交中 "Preparing…"。

### 5.6 支付页 Payment

**布局**

1. BrandHeader 居中字标。
2. 金额卡：`glass rounded-[1.75rem] px-6 py-7` 居中——眉标 "SECURE CHECKOUT · 30 MINUTES · ZUNEX ONE" → 金额（numeral **3.4rem**，blur-in 0.5s，值变化时 popLayout 重放）→ 脚注 "Charged once · Refund protection included"（paper-dim 0.75rem）。
3. "PAY WITH UPI" 分区（眉标）：`.glass rounded-[1.5rem]` 行列表，每行 `px-4 py-3.5`，行间 1px 白 6% 分隔线：
   - 图标 40×40（圆角 23%）：PhonePe 官方紫 / GPay 官方白 / UPI 蓝渐变字标（兜底）；
   - 应用名 0.9375rem medium + 右侧 16px chevron（白 40%）；
   - 行进场 stagger 0.06s；按压 `scale 0.98`；意向未到时显示 40px 高 shimmer 占位。
4. 页脚：验证中显示禁用 GlowButton（16px 旋转环 + "Verifying with your bank"）；常态为文字按钮 "Cancel and choose another time"；最底 "🔒 ENCRYPTED · VERIFIED BY ZUNEX PAY"（0.6875rem / 0.14em + lock 图标）。

**弹层与状态**

| 状态 | 呈现 |
|---|---|
| 已选应用（等待确认） | Sheet：52px 应用图标 + "Complete payment in {app}" + "Approve ₹xx in the app…" + 蓝点 "AWAITING CONFIRMATION" 呼吸。演示模式附 Simulate success / failure；非演示附 "I have completed the payment" |
| 验证失败 | 卡内警示条 `rounded-[1.25rem]`：余烬渐变底（12%）+ 琥珀红描边 0.3，info 图标 + "Payment did not go through / Nothing was charged…"，`role="alert"`，spring 弹入 |
| 意向创建失败 | Sheet：info 图标 + "Could not reach ZUNEX Pay" + Try again（GlowButton） |

**交互细节**：点击应用行 → `window.location.href` 跳 UPI scheme（best-effort）+ 弹出等待 Sheet；演示模式 3s 后自动确认；`confirmRequested` 引用锁防重复提交。

### 5.7 激活仪式页 Activation

支付成功 → 出线的过场，随服务器状态自动推进，无交互。

- **阶段一 "Energy unlocked"**（payment_successful）：中心径向光爆（信号蓝 0.5，50% 46% 处，1.4s easeOut）+ 三圈 160px 扩散环（scale 0.4→3.4，1.6s，间隔 0.22s）；EnergyOrb `min(56vw, 240px)` 强度 1.25 + 高光闪烁加速。
- **阶段二 "Waking the station"**（starting）：Orb 常态 + 三个 1.5px 蓝点轮流呼吸（1.2s，间隔 0.2s）。
- 文案区高 96px，`AnimatePresence wait` 上下交替（0.5s）。
- 服务器翻到 `charging_active` 即切页（ Experience 统一页面过渡）。

### 5.8 充电进行页 Charging

**布局**

1. **BrandHeader 三元结构**：左徽章 = glass-chip（符号 h-3 + "Zunex One" 0.6875rem）｜中央全字标｜右 StatusPill（mint "LIVE" / amber "SECURING"）。
2. 离线横幅（条件）：`rounded-2xl` 琥珀 9% 底 + 0.28 描边，琥珀呼吸点 + "Connection interrupted — your session keeps running. Reconnecting…"；高度自适应展开/收起。
3. **能量环**（主视觉，`--ring-size: min(78vw, 320px)`，`role="timer"`）——玻璃能量环带完整规格：

| 层（自后向前） | 规格 |
|---|---|
| `ring-halo` | 外扩 16% 的锥形渐变光晕（蓝→淡蓝→琥珀→蓝），`blur(40px)`，透明度 0.55，`spin-slow 18s` |
| `ring-arc-glow` | 进度弧的光溢出：外扩 4%，`blur(18px)`，透明度 0.6（settle 后 0.25），环形 mask（内径 36px→26px 过渡） |
| `ring-track` | 弱轨白 5% |
| `ring-arc` | 进度弧本体：锥形渐变 `from 214deg`，蓝 0.95 → 淡蓝 0.98（60% 处）→ 琥珀 1.0 于弧端，其余白 5%；spring 平滑（stiffness 50 / damping 20） |
| `ring-lens` | 玻璃本体：150° 白 0.18→0.05→0.03→0.13 渐变 + 上下 1px 内高光/内底影 |
| `ring-spec` | 固定高光斑（30% 10% 处，42%×20% 径向白 0.55，透明度 0.4）——"棚拍反光" |
| `ring-flow` | 慢速锥形扫掠（白 0.2 与淡蓝 0.16 两段），`mix-blend: screen`，`spin-slow 12s` |
| `ring-sheen` | 8s 窄光楔扫过 |
| `ring-ticks` | SVG 刻度盘：60 刻度，每 5 一长刻（r 96→90.5/93，白 0.22/0.09），整体 inset 3.5%、透明度 0.5 |
| `ring-head` | 弧端彗头：14px 白球，蓝双层光晕（16px/42px）+ 30×8px 渐变彗尾（blur 3px）；随角度 spring 旋转 |
| `ring-core` | 玻璃核心透镜（inset 14%）：左上高光 + 右下蓝 0.2 渐变、165° 深底、`blur(12px)`、外深影；`::after` 顶部蓝雾；**ZUNEX 符号水印**（top 16%，宽 25%，透明度 0.09） |
| 核心内容 | 点阵倒计时 `DotDigits`（h 7.2vw，max 48px / min 32px，paper 色）+ "REMAINING" 眉标 |

   - `settled`（收尾）态：弧退为淡蓝→纸白全环，光晕降至 0.25，彗头隐藏。
4. **遥测条** `telemetry-strip`（全宽、无圆角盒）：上下 1px 细线 + 纵向 `blur(14px)`；三格 `py 0.95rem` 等宽，格间垂直渐变细线（上下 24% 留空）；每格 = 眉标（0.5625rem/0.2em）+ 数值（numeral 1.25rem + 单位小字）。字段：POWER（W，2s 抖动 ±7%）/ DELIVERED（Wh，实时计算）/ PROGRESS（%）。
5. 页脚：状态点 + "REALTIME · SYNCED"（0.6875rem / 0.18em）。

**交互**：无操作入口（纯展示）。连接状态点色映射见 §2.1。演示加速入口不在本页（已移至 DemoPanel）。

### 5.9 完成页 Complete

**布局**

1. BrandHeader。
2. 背景：10 颗上升能量微粒（`rise 3.4s`，left 8%→89%，延迟 0.55s 递增，时长 3–5s 循环）。
3. **ChargeSeal 印章**（`min(60vw, 250px)`）：

| 层 | 规格 |
|---|---|
| `seal-rays` | 外扩 34% 的仪式射线（琥珀/淡蓝相间 12 段锥形渐变），blur 3px，`spin-slow 30s` |
| `seal-halo` | 琥珀 0.22 + 蓝 0.26 双径向光晕，blur 30px，`breathe 4.6s` |
| `seal-disc` | 玻璃圆盘：左上白高光 + 右下琥珀 0.2 + 左下蓝 0.3，160° `#12173f→#060812`，描边白 0.14，内高光 + 琥珀内底影 + 深外影 |
| `seal-gloss` | 顶部边缘光 |
| 品牌符号 | 宽 38%，琥珀+蓝双层 drop-shadow，spring 弹入（130/15，延迟 0.18s） |
| `seal-ripple` | 金色涟漪环：scale 0.8→1.9 渐隐，1.6s（延迟 0.35s） |
| `seal-spark` | 金色火花沿盘沿轨道 10s 环绕 |

4. 文案：眉标 "SESSION COMPLETE" + "Fully charged."（1.9rem）。
5. **收据行**（无卡片，`max-w-sm` 纯排印）：Station / Duration / Energy delivered / Average power / Ended at —— 每行 flex 两端对齐、`py 0.8rem`、行间 1px 白 6% 细线；标签 paper-dim 0.875rem，值 numeral 0.875rem medium。
6. 页脚：GlowButton "Charge again"（→ 时长选择页）+ GhostButton "Finish"（→ 回欢迎页）。

### 5.10 错误页 Error

- 居中：字标 h-3.5 → 80px 圆形警示盘（余烬渐变 + 0.28 描边 + 红晕，power 图标 30px ember-400）→ `error.title`（1.55rem）+ `error.message`（paper-dim 0.875rem，行高 relaxed）→ 动作按钮列（primary GlowButton，其余 Ghost）。
- 文案由服务器 `FRIENDLY_ERRORS` 映射提供（station_offline / station_maintenance / station_busy / payment_failed / charging_start_failed / station_not_found / network 等），永远告知"钱没丢/下一步做什么"。
- 动效：头部淡入 0.5s，主体 `y 26 + scale 0.97` 0.7s。

### 5.11 演示面板 DemoPanel

- **入口**：固定左下角 glass-chip "DEMO"（`bottom: safe-bottom + 14px`），场景非默认时附琥珀呼吸点。
- **Sheet 内容**：五个场景卡（rounded-2xl，选中 glass + 蓝描边光，`aria-pressed`）：Everything works / Station offline / Payment fails / Start fails / Network drops；切换即重载。
- **会话控制**（存在活跃会话时）：细线分区 + "SESSION CONTROLS" 眉标 + GhostButton "Fast-forward to completion"（调用 `x-zunex-demo` 头接口直达完成页）。
- 仅 `?demo=1` 渲染；生产构建零痕迹。

---

## 6. 状态与反馈汇总

| 状态 | 视觉 | 动效 |
|---|---|---|
| 实时同步 | mint 点 + "REALTIME · SYNCED" | 点 2s 扩散环 |
| 断线 | 琥珀→红点 + 离线横幅 | 高度展开 0.3s；恢复自动收回并校正倒计时 |
| 验证中 | 禁用主按钮 + 旋转环 | spin 0.8s |
| 等待 UPI | Sheet + 呼吸蓝点 | spring 上滑 |
| 站点不可用 | 气泡禁用 + 灰提示 | 光晕降透明度 |
| 加载占位 | shimmer 扫光 | 1.8s 循环 |

---

## 7. 可访问性与兼容性

- **减少动态**：`prefers-reduced-motion: reduce` 下所有循环动画直接 `animation: none`，其余动画/过渡压至 0.01ms；气泡拍击跳过迸裂直接跳转；能量环进度 spring 改为 `jump` 直达。
- **语义**：能量环 `role="timer"` + `aria-label="Time remaining mm:ss"`；气泡 `aria-label="Tap to charge"`；警示 `role="alert"`；离线横幅 `role="status"`；Sheet `role="dialog" aria-modal` + `aria-labelledby`；装饰层全部 `aria-hidden`。
- **焦点**：`:focus-visible` 2px signal-400 外描边 + 2px 偏移。
- **触控**：全局取消点按高亮、`touch-action: manipulation` 防双击缩放；充电会话期间申请 Wake Lock 防息屏。
- **安全区**：全面适配刘海/Home 指示条（见 §2.3）。
- **深色强制**：`color-scheme: dark`，无浅色变体。

---

## 8. 页面流转与状态机映射

```
扫码进入 (?s=ZNX-A1&demo=1)
   │
   ├─ 桌面访问 ──► DeviceGate（扫描提示 / 预览模式）
   │
   ▼
 Boot「Locating station」── 失败 ──► Error（station_not_found/offline/maintenance）
   │ 成功且 available
   ▼
 Welcome（气泡）──拍击气泡──► Duration ──选方案──► 创建会话
   ▲                                                   │
   │                                        payment_pending
   │                                                   ▼
   │◄──取消── Payment（PhonePe / GPay / Any UPI）
   │                                                   │ 验证成功
   │                                                   ▼
   │                              Activation「Energy unlocked」→「Waking the station」
   │                                                   │ charging_active
   │                                                   ▼
   │                              Charging（能量环 + 遥测，实时同步，断线自恢复）
   │                                                   │ stopping → charging_completed
   │                                                   ▼
   └── Finish ────────────────────── Complete（印章 + 收据）── Charge again ──► Duration
```

**状态 → 页面**（服务器快照驱动，`AnimatePresence` 统一过渡）

| SessionState | 页面 |
|---|---|
| —（无会话） | boot / welcome / select |
| `payment_pending` | payment |
| `payment_successful` / `starting` | activation |
| `charging_active` / `stopping` | charging |
| `charging_completed` | complete |
| `error` | error |
| `cancelled` / 会话丢失 | 清除本地会话 → welcome |

**持久化**：`localStorage["zunex:session:ZNX-A1"]` 保存会话 ID，刷新/重开自动恢复到对应页面；跨站点陈旧会话自动丢弃。

---

*文档与代码对应关系：设计令牌 `src/app/globals.css` · 品牌组件 `src/components/brand/Logo.tsx` · 基础件 `src/components/ui/kit.tsx` · 视觉件 `src/components/visuals/*` · 页面 `src/components/screens/*` · 流转 `src/components/Experience.tsx`。*
