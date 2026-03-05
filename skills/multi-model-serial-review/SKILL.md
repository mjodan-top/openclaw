---
name: multi-model-serial-review
description: "多模型并行代码审查 (Multi-Model Parallel Code Review). Use when: (1) 需要多模型交叉验证代码质量，(2) 需要不同视角审查代码，(3) 重要功能上线前审查，(4) 技术债务评估。NOT for: 简单单文件审查，紧急 hotfix，已有明确审查结论的 PR。"
metadata: { "openclaw": { "emoji": "🔍", "requires": { "anyBins": ["claude", "codex", "pi"] } } }
---

# Multi-Model Parallel Code Review (多模型并行代码审查)

每个审查阶段由**3 个模型并行审查**同一维度，通过交叉验证提高审查准确性和全面性。

## 核心架构

```
Phase 1: 架构审查 (3 模型并行)
├── glm-5        → phase1-architecture-glm5.txt
├── kimi-k2.5    → phase1-architecture-kimi.txt
├── qwen3.5-plus → phase1-architecture-qwen.txt
└── [汇总]       → phase1-architecture-final.txt (共识分析)
      ↓
Phase 2: 安全审查 (3 模型并行)
├── glm-5        → phase2-security-glm5.txt
├── kimi-k2.5    → phase2-security-kimi.txt
├── qwen3.5-plus → phase2-security-qwen.txt
└── [汇总]       → phase2-security-final.txt (共识分析)
      ↓
Phase 3: 性能审查 (3 模型并行)
├── glm-5        → phase3-performance-glm5.txt
├── kimi-k2.5    → phase3-performance-kimi.txt
├── qwen3.5-plus → phase3-performance-qwen.txt
└── [汇总]       → phase3-performance-final.txt (共识分析)
      ↓
Phase 4: 最终汇总报告 → final-report.txt
```

## 可用模型池

| 模型 ID        | 名称         | 特长               |
| -------------- | ------------ | ------------------ |
| `glm-5`        | GLM-5        | 架构分析、代码理解 |
| `kimi-k2.5`    | Kimi K2.5    | 逻辑推理、安全分析 |
| `qwen3.5-plus` | Qwen3.5 Plus | 性能分析、优化建议 |

## 何时使用

| 场景               | 使用此 skill | 原因                     |
| ------------------ | ------------ | ------------------------ |
| 重要功能上线前审查 | ✅           | 3 模型交叉验证降低风险   |
| 架构重构评估       | ✅           | 多视角审查               |
| 安全敏感代码审查   | ✅           | 3 模型独立判断           |
| 性能关键路径审查   | ✅           | 多模型性能分析           |
| 简单文档修改       | ❌           | 单模型审查即可           |
| 紧急 hotfix        | ❌           | 时间敏感，单模型快速审查 |

---

## 审查流程说明

### Phase 1: 架构审查 (3 模型并行)

**审查目标**: 架构设计、模块划分、代码质量

**3 个模型独立审查**:

| 模型         | 输出文件                     | 审查重点           |
| ------------ | ---------------------------- | ------------------ |
| glm-5        | phase1-architecture-glm5.txt | 架构设计、模块划分 |
| kimi-k2.5    | phase1-architecture-kimi.txt | 逻辑结构、接口设计 |
| qwen3.5-plus | phase1-architecture-qwen.txt | 代码规范、可维护性 |

**汇总输出**: `phase1-architecture-final.txt`

**提示词模板** (3 个模型使用相同的提示词):

```
你是代码审查专家，负责架构设计和代码质量审查。

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
写入：/tmp/code-review/phase1-architecture-{model}.txt

请开始审查。
```

**汇总提示词** (Phase 1 完成后执行):

```
你是技术总监，负责汇总 3 个模型的架构审查结果。

## 输入文件
- phase1-architecture-glm5.txt
- phase1-architecture-kimi.txt
- phase1-architecture-qwen.txt

## 汇总任务
1. 识别 3 个模型都发现的问题 → 共识问题 (最高优先级)
2. 识别 2 个模型提到的问题 → 重要问题
3. 识别单个模型发现的问题 → 待确认问题
4. 记录分歧点 (不同模型评价差异)

## 输出文件
写入：/tmp/code-review/phase1-architecture-final.txt
```

---

### Phase 2: 安全审查 (3 模型并行)

**审查目标**: 安全漏洞、权限控制、数据保护

**3 个模型独立审查**:

| 模型         | 输出文件                 | 审查重点           |
| ------------ | ------------------------ | ------------------ |
| glm-5        | phase2-security-glm5.txt | 注入风险、输入验证 |
| kimi-k2.5    | phase2-security-kimi.txt | 权限控制、认证逻辑 |
| qwen3.5-plus | phase2-security-qwen.txt | 数据安全、隐私保护 |

**输入文件**: Phase 1 汇总报告 (`phase1-architecture-final.txt`)

**汇总输出**: `phase2-security-final.txt`

**提示词模板** (3 个模型使用相同的提示词):

```
你是安全审查专家，负责安全漏洞和风险控制审查。

## 输入文件
- /tmp/code-review/phase1-architecture-final.txt (Phase 1 结果)

## 审查目标
{TARGET_PATH}

## 审查维度
1. 有无注入风险（SQL/命令/路径/XSS/CSRF）？
2. 权限检查是否充分？认证逻辑是否安全？
3. 敏感数据（密码/token/密钥）处理是否安全？
4. 输入验证是否完整？
5. 有无竞态条件或并发安全问题？

## 输出要求
- 按文件列出安全问题
- 问题严重级别 (Critical/Major/Minor)
- 具体修复建议
- 安全评分 (1-10)

## 输出文件
写入：/tmp/code-review/phase2-security-{model}.txt

请开始审查。
```

**汇总提示词**:

```
你是技术总监，负责汇总 3 个模型的安全审查结果。

## 输入文件
- phase2-security-glm5.txt
- phase2-security-kimi.txt
- phase2-security-qwen.txt

## 汇总任务
1. 识别 3 个模型都发现的安全问题 → 共识问题 (最高优先级)
2. 识别 2 个模型提到的问题 → 重要问题
3. 识别单个模型发现的问题 → 待确认问题
4. 记录分歧点

## 输出文件
写入：/tmp/code-review/phase2-security-final.txt
```

---

### Phase 3: 性能审查 (3 模型并行)

**审查目标**: 性能瓶颈、复杂度分析、优化建议

**3 个模型独立审查**:

| 模型         | 输出文件                    | 审查重点             |
| ------------ | --------------------------- | -------------------- |
| glm-5        | phase3-performance-glm5.txt | 复杂度分析、算法优化 |
| kimi-k2.5    | phase3-performance-kimi.txt | 资源使用、内存管理   |
| qwen3.5-plus | phase3-performance-qwen.txt | 缓存策略、数据库优化 |

**输入文件**: Phase 1+2 汇总报告

**汇总输出**: `phase3-performance-final.txt`

**提示词模板** (3 个模型使用相同的提示词):

```
你是性能审查专家，负责性能瓶颈和优化建议审查。

## 输入文件
- /tmp/code-review/phase1-architecture-final.txt
- /tmp/code-review/phase2-security-final.txt

## 审查目标
{TARGET_PATH}

## 审查维度
1. 有无明显的性能瓶颈（循环嵌套/重复查询/N+1 问题）？
2. 时间复杂度是否合理？有无优化空间？
3. 空间复杂度是否合理？内存管理是否有问题？
4. 缓存策略是否合理？有无不必要的重复计算？
5. 数据库/API 调用是否可优化？

## 输出要求
- 按文件列出性能问题
- 预估性能影响 (高/中/低)
- 具体优化建议和预期提升
- 性能评分 (1-10)

## 输出文件
写入：/tmp/code-review/phase3-performance-{model}.txt

请开始审查。
```

**汇总提示词**:

```
你是技术总监，负责汇总 3 个模型的性能审查结果。

## 输入文件
- phase3-performance-glm5.txt
- phase3-performance-kimi.txt
- phase3-performance-qwen.txt

## 汇总任务
1. 识别 3 个模型都发现的性能问题 → 共识问题
2. 识别 2 个模型提到的问题 → 重要问题
3. 识别单个模型发现的问题 → 待确认问题
4. 记录分歧点

## 输出文件
写入：/tmp/code-review/phase3-performance-final.txt
```

---

### Phase 4: 最终汇总报告

**任务**: 汇总所有阶段审查结果，生成最终报告

**输入文件**:

- `phase1-architecture-final.txt`
- `phase2-security-final.txt`
- `phase3-performance-final.txt`

**输出文件**: `final-report.txt`

**提示词模板**:

```
你是技术总监，负责汇总多模型并行审查结果，生成最终报告。

## 输入文件
- phase1-architecture-final.txt (架构审查汇总)
- phase2-security-final.txt (安全审查汇总)
- phase3-performance-final.txt (性能审查汇总)

## 汇总任务

### 1. 跨阶段共识分析
- 在多个阶段都被提到的问题 → **跨阶段共识** (最高优先级)
- 单个阶段内的共识问题 → **阶段共识**
- 单个模型发现的问题 → **待确认**

### 2. 综合评分
- 架构评分 (来自 Phase 1)
- 安全评分 (来自 Phase 2)
- 性能评分 (来自 Phase 3)
- 总体评分 (加权平均)

### 3. 优先级排序
- P0: 必须立即修复（跨阶段共识/安全漏洞）
- P1: 重要问题（阶段共识/性能瓶颈）
- P2: 改进建议（待确认问题/优化空间）

## 最终报告结构

=== 多模型并行代码审查报告 ===

## 审查概览
- 审查路径：{TARGET_PATH}
- 审查时间：{TIMESTAMP}
- 审查方法：3 模型并行审查 (glm-5, kimi-k2.5, qwen3.5-plus)
- 审查阶段：架构 → 安全 → 性能

## 综合评分
| 维度 | 评分 | 说明 |
|------|------|------|
| 架构设计 | X/10 | ... |
| 安全性 | X/10 | ... |
| 性能 | X/10 | ... |
| 总体 | X/10 | ... |

## P0 问题 (必须立即修复)
1. [问题描述]
   - 发现阶段：Phase X
   - 共识级别：跨阶段共识/阶段共识
   - 影响范围：...
   - 修复建议：...

## P1 问题 (重要)
...

## P2 改进建议
...

## 分歧点 (需人工判断)
...

## 下一步行动建议
1. ...
2. ...

## 输出文件
写入：/tmp/code-review/final-report.txt

请生成最终报告。
```

---

## 快速开始

### 基本用法

```bash
python3 scripts/ws-send-to-agent.py "
请执行多模型并行代码审查：

## 审查目标
/Users/zkf/work/openclaw/src

## 审查流程

Phase 1: 架构审查 (3 模型并行)
- glm-5, kimi-k2.5, qwen3.5-plus 独立审查
- 输出：phase1-architecture-final.txt (汇总)

Phase 2: 安全审查 (3 模型并行)
- 输入：Phase 1 结果
- 输出：phase2-security-final.txt (汇总)

Phase 3: 性能审查 (3 模型并行)
- 输入：Phase 1+2 结果
- 输出：phase3-performance-final.txt (汇总)

Phase 4: 最终汇总
- 输出：final-report.txt

请开始执行，每阶段完成后汇报进度。
"
```

---

## 输出文件清单

### Phase 1 (架构审查)

- `phase1-architecture-glm5.txt` - glm-5 审查结果
- `phase1-architecture-kimi.txt` - kimi-k2.5 审查结果
- `phase1-architecture-qwen.txt` - qwen3.5-plus 审查结果
- `phase1-architecture-final.txt` - Phase 1 汇总

### Phase 2 (安全审查)

- `phase2-security-glm5.txt` - glm-5 审查结果
- `phase2-security-kimi.txt` - kimi-k2.5 审查结果
- `phase2-security-qwen.txt` - qwen3.5-plus 审查结果
- `phase2-security-final.txt` - Phase 2 汇总

### Phase 3 (性能审查)

- `phase3-performance-glm5.txt` - glm-5 审查结果
- `phase3-performance-kimi.txt` - kimi-k2.5 审查结果
- `phase3-performance-qwen.txt` - qwen3.5-plus 审查结果
- `phase3-performance-final.txt` - Phase 3 汇总

### Phase 4 (最终报告)

- `final-report.txt` - 最终汇总报告

---

## 结果解读

### 共识级别

| 级别       | 说明                     | 优先级      |
| ---------- | ------------------------ | ----------- |
| 跨阶段共识 | 3 个模型在多个阶段都提到 | P0 - 最高   |
| 阶段共识   | 3 个模型在同一阶段都提到 | P0 - 高     |
| 2 模型同意 | 2 个模型提到             | P1 - 重要   |
| 单模型发现 | 仅 1 个模型提到          | P2 - 待确认 |

### 评分标准

- **评分 >= 8**: 优秀，保持
- **评分 6-7**: 良好，有改进空间
- **评分 < 6**: 需要重构

---

## 验证检查清单

- [ ] Phase 1: 3 个模型审查文件已生成
- [ ] Phase 1: 汇总文件包含共识分析
- [ ] Phase 2: 3 个模型审查文件已生成
- [ ] Phase 2: 汇总文件引用了 Phase 1 结果
- [ ] Phase 3: 3 个模型审查文件已生成
- [ ] Phase 3: 汇总文件引用了 Phase 1+2 结果
- [ ] Phase 4: 最终报告包含跨阶段共识分析
- [ ] 所有评分在合理范围内
- [ ] 问题列表按优先级排序

---

## 相关文件

| 文件                                                          | 用途       |
| ------------------------------------------------------------- | ---------- |
| `/Users/zkf/.openclaw/agents/tech-director/agent/models.json` | 模型池配置 |
| `/Users/zkf/.openclaw/agents/tech-director/agent/AGENTS.md`   | 工作指南   |
| `scripts/ws-send-to-agent.py`                                 | 通信脚本   |

---

## 注意事项

1. **并行审查**: 每个阶段 3 个模型同时审查，不是串行
2. **文件链**: 后续阶段需要读取前面阶段的汇总结果
3. **共识分析**: 重视 3 个模型都发现的问题
4. **审查时间**: 并行审查比单模型慢，但准确性更高
