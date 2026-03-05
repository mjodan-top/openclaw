---
name: multi-model-serial-review
description: "多模型串行代码审查 (Multi-Model Serial Code Review). Use when: (1) 需要多模型交叉验证代码质量，(2) 需要不同视角审查代码 (架构/安全/性能)，(3) 重要功能上线前审查，(4) 技术债务评估。NOT for: 简单单文件审查，紧急 hotfix，已有明确审查结论的 PR。"
metadata: { "openclaw": { "emoji": "🔍", "requires": { "anyBins": ["claude", "codex", "pi"] } } }
---

# Multi-Model Serial Code Review (多模型串行代码审查)

通过**四个不同模型**的串行审查，从架构、安全、性能、代码质量四个维度进行代码质量评估，生成全面的审查报告。

## 核心架构

```
Step 1 [glm-5]        → review-phase1.txt (架构 + 代码质量初审)
   ↓
Step 2 [kimi-k2.5]    → review-phase2.txt (审查 Phase 1 + 安全审查)
   ↓
Step 3 [qwen3.5-plus] → review-phase3.txt (审查 Phase 1+2 + 性能审查)
   ↓
Step 4 [MiniMax-M2.5] → review-phase4.txt (审查 Phase 1+2+3 + 代码质量审查)
   ↓
Step 5 [汇总]         → final-report.txt (汇总所有阶段 + 共识分析)
```

## 可用模型池

| 模型 ID        | 名称         | 特长     | 审查维度           |
| -------------- | ------------ | -------- | ------------------ |
| `glm-5`        | GLM-5        | 架构分析 | 架构设计、模块划分 |
| `kimi-k2.5`    | Kimi K2.5    | 逻辑推理 | 安全审查、逻辑验证 |
| `qwen3.5-plus` | Qwen3.5 Plus | 性能分析 | 性能瓶颈、优化建议 |
| `MiniMax-M2.5` | MiniMax M2.5 | 代码质量 | 代码规范、最佳实践 |

## 何时使用

| 场景               | 使用此 skill | 原因                     |
| ------------------ | ------------ | ------------------------ |
| 重要功能上线前审查 | ✅           | 多模型交叉验证降低风险   |
| 架构重构评估       | ✅           | 需要多维度审查           |
| 安全敏感代码审查   | ✅           | 专业安全审查步骤         |
| 性能关键路径审查   | ✅           | 专业性能分析步骤         |
| 简单文档修改       | ❌           | 单模型审查即可           |
| 紧急 hotfix        | ❌           | 时间敏感，单模型快速审查 |

## 审查流程说明

### Step 1: glm-5 - 架构设计和代码质量初审

**模型**: `glm-5` (强于代码理解和架构分析)

**审查维度**:

- 模块划分合理性
- 接口设计清晰度
- 代码规范遵循
- 命名一致性
- 函数职责单一性

**输出文件**: `/tmp/code-review/phase1-architecture.txt`

**提示词模板**:

```
你是 glm-5，负责代码架构设计和代码质量初审。

## 审查目标
{TARGET_PATH}

## 审查维度
1. 模块划分是否合理？有无过度耦合？
2. 接口设计是否清晰？参数命名是否规范？
3. 代码是否遵循项目规范（命名/结构/注释）？
4. 函数/类职责是否单一？
5. 有无明显的代码坏味道（重复/过长/过复杂）？

## 输出要求
- 按文件列出问题
- 问题严重级别 (Critical/Major/Minor)
- 具体改进建议
- 架构评分 (1-10)

## 输出文件
写入：/tmp/code-review/phase1-architecture.txt

请开始审查。
```

---

### Step 2: kimi-k2.5 - 审查 Phase 1 + 安全审查

**模型**: `kimi-k2.5` (强于逻辑推理和安全分析)

**审查维度**:

- 评估 Phase 1 的审查结论
- 安全漏洞检查（注入/XSS/CSRF）
- 权限检查是否充分
- 敏感数据处理是否合规
- 输入验证是否完整

**输入文件**: `/tmp/code-review/phase1-architecture.txt`

**输出文件**: `/tmp/code-review/phase2-security.txt`

**提示词模板**:

```
你是 kimi-k2.5，负责审查 Phase 1 结果并进行安全审查。

## 输入文件
/tmp/code-review/phase1-architecture.txt

## 审查任务
1. 评估 Phase 1 的审查结论是否准确
2. 补充 Phase 1 遗漏的问题

## 安全审查维度
1. 有无注入风险（SQL/命令/路径）？
2. 有无 XSS/CSRF 风险？
3. 权限检查是否充分？
4. 敏感数据（密码/token/密钥）处理是否安全？
5. 输入验证是否完整？
6. 有无竞态条件或并发问题？

## 输出要求
- 对 Phase 1 的评估意见
- 新增安全问题列表
- 问题严重级别和修复优先级
- 安全评分 (1-10)

## 输出文件
写入：/tmp/code-review/phase2-security.txt

请开始审查。
```

---

### Step 3: qwen3.5-plus - 审查 Phase 1+2 + 性能审查

**模型**: `qwen3.5-plus` (强于性能分析和优化建议)

**审查维度**:

- 评估 Phase 1+2 的审查结论
- 性能瓶颈分析
- 时间/空间复杂度
- 内存管理是否合理
- 优化建议

**输入文件**:

- `/tmp/code-review/phase1-architecture.txt`
- `/tmp/code-review/phase2-security.txt`

**输出文件**: `/tmp/code-review/phase3-performance.txt`

**提示词模板**:

```
你是 qwen3.5-plus，负责审查 Phase 1+2 结果并进行性能审查。

## 输入文件
- /tmp/code-review/phase1-architecture.txt
- /tmp/code-review/phase2-security.txt

## 审查任务
1. 评估 Phase 1+2 的审查结论是否准确
2. 补充前两个阶段遗漏的问题

## 性能审查维度
1. 有无明显的性能瓶颈（循环嵌套/重复查询）？
2. 时间复杂度是否合理？
3. 空间复杂度是否合理？
4. 内存管理是否有问题（泄漏/冗余）？
5. 有无不必要的重复计算？
6. 数据库/API调用是否可优化？
7. 缓存策略是否合理？

## 输出要求
- 对 Phase 1+2 的评估意见
- 性能问题列表和优化建议
- 预估性能提升幅度
- 性能评分 (1-10)

## 输出文件
写入：/tmp/code-review/phase3-performance.txt

请开始审查。
```

---

### Step 4: MiniMax-M2.5 - 审查 Phase 1+2+3 + 代码质量审查

**模型**: `MiniMax-M2.5` (强于代码质量和最佳实践)

**审查维度**:

- 评估 Phase 1+2+3 的审查结论
- 代码规范遵循 (命名/注释/格式)
- 设计模式应用
- 可维护性评估
- 技术债务识别

**输入文件**:

- `/tmp/code-review/phase1-architecture.txt`
- `/tmp/code-review/phase2-security.txt`
- `/tmp/code-review/phase3-performance.txt`

**输出文件**: `/tmp/code-review/phase4-code-quality.txt`

**提示词模板**:

```
你是 MiniMax-M2.5，负责审查 Phase 1+2+3 结果并进行代码质量审查。

## 输入文件
- phase1-architecture.txt (架构审查)
- phase2-security.txt (安全审查)
- phase3-performance.txt (性能审查)

## 审查任务
1. 评估前三阶段的审查结论是否准确
2. 补充前三个阶段遗漏的问题

## 代码质量审查维度
1. 代码规范遵循 (命名/注释/格式)
2. 设计模式应用是否合理
3. 可维护性 (模块化/可扩展性)
4. 技术债务识别
5. 测试覆盖评估
6. 文档完整性

## 输出要求
- 对 Phase 1+2+3 的评估意见
- 代码质量问题列表
- 最佳实践建议
- 代码质量评分 (1-10)

## 输出文件
写入：/tmp/code-review/phase4-code-quality.txt

请开始审查。
```

---

### Step 5: 汇总 - 生成最终报告

**任务**: 汇总所有阶段审查结果，生成共识分析报告

**输入文件**:

- `/tmp/code-review/phase1-architecture.txt`
- `/tmp/code-review/phase2-security.txt`
- `/tmp/code-review/phase3-performance.txt`
- `/tmp/code-review/phase4-code-quality.txt`

**输出文件**: `/tmp/code-review/final-report.txt`

**提示词模板**:

```
你是技术总监，负责汇总多模型串行审查结果，生成最终报告。

## 输入文件
- phase1-architecture.txt (glm-5 - 架构审查)
- phase2-security.txt (kimi-k2.5 - 安全审查)
- phase3-performance.txt (qwen3.5-plus - 性能审查)
- phase4-code-quality.txt (MiniMax-M2.5 - 代码质量审查)

## 汇总任务

### 1. 问题共识分析
- 四个模型都发现的问题 → **共识问题** (最高优先级)
- 三个模型提到的问题 → **重要问题**
- 两个模型提到的问题 → **关注问题**
- 单个模型发现的问题 → **待确认问题**

### 2. 分歧分析
- 不同模型对同一问题的评价差异
- 需要人工判断的争议点

### 3. 综合评分
- 架构评分 (来自 Phase 1)
- 安全评分 (来自 Phase 2)
- 性能评分 (来自 Phase 3)
- 代码质量评分 (来自 Phase 4)
- 总体评分 (加权平均)

### 4. 优先级排序
按严重程度和修复成本排序：
- P0: 必须立即修复（安全漏洞/严重架构问题）
- P1: 重要问题（性能瓶颈/代码坏味道）
- P2: 改进建议（优化空间/最佳实践）

## 最终报告结构

```

=== 多模型串行代码审查报告 ===

## 审查概览

- 审查路径：{TARGET_PATH}
- 审查时间：{TIMESTAMP}
- 参与模型：glm-5, kimi-k2.5, qwen3.5-plus, MiniMax-M2.5

## 综合评分

| 维度     | 评分 | 说明 |
| -------- | ---- | ---- |
| 架构设计 | X/10 | ...  |
| 安全性   | X/10 | ...  |
| 性能     | X/10 | ...  |
| 代码质量 | X/10 | ...  |
| 总体     | X/10 | ...  |

## 共识问题 (P0 - 必须修复)

1. [问题描述]
   - 发现阶段：Phase X
   - 影响范围：...
   - 修复建议：...

## 重要问题 (P1 - 重要)

...

## 改进建议 (P2 - 优化)

...

## 分歧点 (需人工判断)

...

## 下一步行动建议

1. ...
2. ...

```

## 输出文件
写入：/tmp/code-review/final-report.txt

请生成最终报告。
```

---

## 快速开始

### 基本用法

```bash
# 通过 tech-director 发送审查任务
python3 scripts/ws-send-to-agent.py "
请执行多模型串行代码审查：

## 审查目标
/Users/zkf/work/openclaw/src

## 审查流程

Step 1 [glm-5]: 架构和代码质量初审
- 输出：/tmp/code-review/phase1-architecture.txt

Step 2 [kimi-k2.5]: 审查 Phase 1 + 安全审查
- 输出：/tmp/code-review/phase2-security.txt

Step 3 [qwen3.5-plus]: 审查 Phase 1+2 + 性能审查
- 输出：/tmp/code-review/phase3-performance.txt

Step 4 [汇总]: 生成最终报告
- 输出：/tmp/code-review/final-report.txt

请开始执行，每步完成后汇报进度。
"
```

### 针对特定文件的审查

```bash
python3 scripts/ws-send-to-agent.py "
请执行多模型串行代码审查：

## 审查目标
/Users/zkf/work/openclaw/src/auth/login.ts

## 审查重点
- 安全性（认证逻辑/密码处理）
- 性能（验证效率）

请按标准 4 步流程执行。
"
```

---

## 审查报告模板

### 阶段报告格式 (Phase 1/2/3)

```
=== Phase X 审查报告 ===

## 审查信息
- 审查模型：{MODEL}
- 审查时间：{TIMESTAMP}
- 审查路径：{TARGET_PATH}

## 审查维度
- {DIMENSION_1}
- {DIMENSION_2}
- ...

## 问题列表

### [文件名]

#### Critical
1. [问题描述]
   - 位置：line X
   - 影响：...
   - 建议：...

#### Major
...

#### Minor
...

## 评分
- {DIMENSION} 评分：X/10
- 理由：...

## 总结
...
```

### 最终报告格式

见上面 Step 4 提示词模板中的结构。

---

## 与技术总监集成

### 修改 AGENTS.md

在技术总监的 `AGENTS.md` 中添加：

````markdown
## 多模型串行代码审查

当需要全面审查代码时，使用 `multi-model-serial-review` skill。

### 触发方式

```bash
python3 scripts/ws-send-to-agent.py "请执行多模型串行代码审查：[目标路径]"
```
````

### 审查流程

1. glm-5 → 架构和代码质量初审
2. kimi-k2.5 → 安全审查
3. qwen3.5-plus → 性能审查
4. 汇总 → 生成最终报告

### 结果解读

- **共识问题**: 优先处理
- **分歧点**: 需要人工判断
- **评分 < 6**: 建议重构

````

---

## 验证方案

### 测试用例

```bash
# 审查 OpenClaw 源码
python3 scripts/ws-send-to-agent.py "
请执行串行多步骤代码审查：

## 审查目标
/Users/zkf/work/openclaw/src

## 审查流程

Step 1 [glm-5]: 架构和代码质量初审
- 输出：/tmp/code-review/phase1-architecture.txt
- 关注：模块划分、接口设计、代码规范

Step 2 [kimi-k2.5]: 审查 Phase 1 + 安全审查
- 读取：phase1-architecture.txt
- 输出：/tmp/code-review/phase2-security.txt
- 关注：安全漏洞、注入风险、权限检查

Step 3 [qwen3.5-plus]: 审查 Phase 1+2 + 性能审查
- 读取：phase1-architecture.txt, phase2-security.txt
- 输出：/tmp/code-review/phase3-performance.txt
- 关注：性能瓶颈、复杂度分析、优化建议

Step 4 [汇总]: 生成最终报告
- 读取：所有阶段文件
- 输出：/tmp/code-review/final-report.txt
- 包含：共识问题、分歧点、优先级排序

请开始执行，每步完成后汇报进度。
"
````

### 验证检查清单

- [ ] Phase 1 文件已生成且内容完整
- [ ] Phase 2 文件引用了 Phase 1 结果
- [ ] Phase 3 文件引用了 Phase 1+2 结果
- [ ] Final Report 包含共识分析
- [ ] 所有评分在合理范围内
- [ ] 问题列表按优先级排序

---

## 风险与注意事项

1. **glm-5 模型配置** - 已配置到 openai provider
2. **时间延长** - 串行审查需要等待每步完成（预计 15-30 分钟）
3. **上下文累积** - 后续步骤需要读取前面所有结果
4. **文件链管理** - 需要确保文件正确传递

### 缓解措施

- Phase 1 模型配置已确认
- 每步设置合理的超时时间
- 使用绝对路径引用文件
- 最终报告进行结果合并

---

## 模型配置参考

### 添加 glm-5 到 models.json

```json
{
  "providers": {
    "openai": {
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "api": "openai-completions",
      "models": [
        {
          "id": "glm-5",
          "name": "GLM-5",
          "reasoning": false,
          "input": ["text"],
          "cost": {
            "input": 0,
            "output": 0,
            "cacheRead": 0,
            "cacheWrite": 0
          },
          "contextWindow": 256000,
          "maxTokens": 8192
        }
      ],
      "apiKey": "DASHSCOPE_API_KEY"
    }
  }
}
```

---

## 相关文件

| 文件                                                          | 用途         |
| ------------------------------------------------------------- | ------------ |
| `/Users/zkf/.openclaw/agents/tech-director/agent/models.json` | 模型池配置   |
| `/Users/zkf/.openclaw/agents/tech-director/agent/AGENTS.md`   | 工作指南     |
| `/Users/zkf/work/openclaw/skills/serial-step-task/SKILL.md`   | 串行任务基础 |
| `scripts/ws-send-to-agent.py`                                 | 通信脚本     |

---

## 注意事项

1. **审查目录选择**：避免过大目录（如整个 `node_modules`）
2. **审查时间**：预留足够时间等待串行完成
3. **结果解读**：重视共识问题，审慎评估分歧点
4. **文件管理**：审查完成后归档报告文件
