---
name: serial-step-task
description: "安排串行多步骤任务 (Serial Multi-Step Tasks). Use when: (1) 任务有多个依赖步骤，(2) 每步需要验证后再继续，(3) 需要文件间传递状态，(4) 构建/测试/修复循环。NOT for: 并行任务，独立步骤，简单单步操作。"
metadata: { "openclaw": { "emoji": "🔗", "requires": { "anyBins": ["claude", "codex", "pi"] } } }
---

# Serial Step Task (串行多步骤任务)

通过**文件链**方式安排串行多步骤任务，每步完成后验证再继续下一步，确保任务正确执行。

## 核心模式

```
Step 1 → 验证 → Step 2 → 验证 → Step 3 → 验证 → ... → 最终报告
   ↓           ↓           ↓
step1.txt  step2.txt  step3.txt
```

## 何时使用

| 场景                   | 使用此 skill | 原因                          |
| ---------------------- | ------------ | ----------------------------- |
| 数学计算链             | ✅           | 每步依赖前一步结果            |
| 代码构建流程           | ✅           | 编译→测试→打包→部署           |
| 数据处理管道           | ✅           | 读取→转换→验证→输出           |
| 开发 - 测试 - 修复循环 | ✅           | 实现→测试→失败→修复→重测      |
| 并行独立任务           | ❌           | 使用 subagents 或 Agent Teams |
| 简单单步操作           | ❌           | 直接 exec 即可                |

## 任务设计原则

### 1. 步骤独立性

每个步骤应该：

- 有明确的输入（读取前一步文件）
- 有明确的操作（执行具体计算/操作）
- 有明确的输出（写入新文件）
- 有明确的验证条件

### 2. 文件链状态传递

使用文件传递状态，而不是内存变量：

```bash
# 好的模式：文件链
mkdir -p /tmp/task-chain
echo "1" > /tmp/task-chain/step1.txt       # Step 1 输出
cat /tmp/task-chain/step1.txt | calc > step2.txt  # Step 2 读取 + 输出
```

### 3. 验证点设计

每步完成后必须验证：

- 文件存在
- 内容符合预期
- 无错误产生

## 快速开始

### 示例：数字计算链

```bash
# 创建任务目录
mkdir -p /tmp/calc-chain

# Step 1: 初始值
echo "1" > /tmp/calc-chain/step1.txt

# Step 2: 加 3
value=$(cat /tmp/calc-chain/step1.txt)
echo $((value + 3)) > /tmp/calc-chain/step2.txt

# Step 3: 乘 2
value=$(cat /tmp/calc-chain/step2.txt)
echo $((value * 2)) > /tmp/calc-chain/step3.txt

# ... 继续直到完成

# 最后：生成报告
cat > /tmp/calc-chain/report.txt << 'EOF'
=== 任务完成报告 ===
Step 1: 1 (初始值)
Step 2: 4 (1+3)
Step 3: 8 (4*2)
最终结果：8
EOF
```

## 完整任务模板

### 任务提示词模板

```
请执行以下多步骤任务，必须按顺序一步一步完成：

## 任务：[任务名称]

### 规则
- 从 [初始状态] 开始
- 每步执行一个 [操作类型]
- 每步必须验证结果正确性
- 记录每步的输出到文件

### 步骤（严格按顺序执行）

**Step 1**: [描述]
- [具体操作]
- 写入 [文件路径]
- 验证：[验证条件]

**Step 2**: [描述]
- 读取 [前一步文件]
- [具体操作]
- 写入 [文件路径]
- 验证：[验证条件]

...

**Step N**: 生成报告
- 创建 [报告文件]
- 包含所有步骤的摘要
- 最终结果应该是 [预期值]

### 输出要求
1. 每步完成后打印确认信息
2. 所有文件必须可验证
3. 如果任何步骤失败，停止并报告

请开始执行，并逐步汇报进度。
```

## 高级模式：开发 - 测试 - 修复循环

### 场景：自动修复 failing tests

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: 分析失败的测试                                   │
│ → 读取测试日志                                          │
│ → 识别失败原因                                          │
│ → 写入 analysis.txt                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: 实现修复                                         │
│ → 读取 analysis.txt                                     │
│ → 修改相关代码                                          │
│ → 写入 fix-summary.txt                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: 运行测试                                         │
│ → 执行测试命令                                          │
│ → 捕获测试结果                                          │
│ → 写入 test-result.txt                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
                    ┌─────────┐
                    │ 通过？   │
                    └────┬────┘
                     No  │  Yes
                         ↓
                    ┌─────────────────┐
                    │ 返回 Step 2     │  (最多尝试 N 次)
                    └─────────────────┘
                         ↓
                    ┌─────────────────┐
                    │ Step 4: 报告    │
                    │ → 总结修复过程  │
                    │ → 写入 final-report.txt
                    └─────────────────┘
```

### 任务提示词示例

```
请执行以下开发 - 测试 - 修复循环任务：

## 任务：自动修复 failing tests

### 项目位置
- 代码：/path/to/project
- 测试命令：npm test

### 循环步骤（最多 3 次）

**Step 1**: 分析失败
- 运行 npm test 2>&1 | tee /tmp/fix-cycle/test-log.txt
- 分析错误原因，写入 /tmp/fix-cycle/analysis.txt

**Step 2**: 实现修复
- 根据 analysis.txt 修改代码
- 记录修改内容到 /tmp/fix-cycle/fix-log.txt

**Step 3**: 验证
- 重新运行 npm test
- 结果写入 /tmp/fix-cycle/test-result.txt

**Step 4**: 判断
- 如果测试通过 → 进入 Step 5
- 如果测试失败且尝试 < 3 次 → 返回 Step 1
- 如果测试失败且尝试 = 3 次 → 进入 Step 5（带失败报告）

**Step 5**: 生成最终报告
- 创建 /tmp/fix-cycle/final-report.txt
- 包含：问题分析、修复内容、测试结果

请开始执行，每步完成后汇报进度。
```

## 与 OpenClaw 集成

### 使用 tech-director agent

```bash
# 通过 ws-send-to-agent.py 发送任务
python3 scripts/ws-send-to-agent.py "
请执行以下多步骤任务...
[使用上面的任务模板]
"
```

### 使用 evolve_task tool

```json
{
  "tool": "evolve_task",
  "params": {
    "task": "执行以下多步骤任务：\n\nStep 1: ...\nStep 2: ...\n...",
    "workdir": "/path/to/project",
    "agentTeams": true,
    "strategy": "balanced"
  }
}
```

### 使用 cron 定时执行

```bash
# 每天凌晨 2 点执行开发 - 测试 - 修复循环
openclaw cron add \
  --name "Nightly test fix cycle" \
  --cron "0 2 * * *" \
  --session isolated \
  --message "
执行开发 - 测试 - 修复循环：
1. 运行所有测试
2. 分析失败的测试
3. 实现修复（最多 3 次尝试）
4. 生成报告

使用文件链记录每步状态。
" \
  --announce
```

## 任务设计检查清单

在安排任务前，检查：

- [ ] 步骤数量合理（建议 5-10 步）
- [ ] 每步有明确的输入/输出
- [ ] 使用文件传递状态
- [ ] 每步有验证条件
- [ ] 有最终报告步骤
- [ ] 有失败处理策略

## 常见错误模式

### ❌ 错误：步骤太模糊

```
Step 1: 修复代码
Step 2: 测试
```

### ✅ 正确：步骤具体

```
Step 1: 读取 test-log.txt，识别失败原因，写入 analysis.txt
Step 2: 根据 analysis.txt 修改 src/auth.ts，记录修改到 fix-log.txt
Step 3: 运行 npm test，结果写入 test-result.txt
```

### ❌ 错误：没有验证点

```
Step 1: 计算
Step 2: 再计算
Step 3: 完成
```

### ✅ 正确：每步验证

```
Step 1: 计算，写入 step1.txt，验证文件存在且内容正确
Step 2: 读取 step1.txt，计算，写入 step2.txt，验证内容符合预期
Step 3: 读取 step2.txt，计算，生成报告
```

## 示例任务

### 示例 1：数字计算链（8 步）

```
任务：数字累加验证链

Step 1: 创建 /tmp/calc-chain/step1.txt，写入 1
Step 2: 读取 step1，计算 1+3=4，写入 step2.txt
Step 3: 读取 step2，计算 4*2=8，写入 step3.txt
Step 4: 读取 step3，计算 8-5=3，写入 step4.txt
Step 5: 读取 step4，计算 3²=9，写入 step5.txt
Step 6: 读取 step5，计算 9+16=25，写入 step6.txt
Step 7: 读取 step6，计算 √25=5，写入 step7.txt
Step 8: 创建 report.txt，总结所有步骤

预期最终结果：5
```

### 示例 2：代码构建流程

```
任务：构建 → 测试 → 打包

Step 1: 运行 npm run build，输出写入 build-log.txt
Step 2: 检查 build-log.txt 无错误，写入 build-status.txt
Step 3: 运行 npm test，输出写入 test-log.txt
Step 4: 解析测试结果，写入 test-summary.txt
Step 5: 如果测试通过，运行 npm pack，输出写入 package-log.txt
Step 6: 创建最终报告 final-report.txt

验证点：
- Step 2: build-status.txt 内容必须是 "SUCCESS"
- Step 4: test-summary.txt 中失败测试数为 0
- Step 5: 只有测试通过才执行
```

### 示例 3：数据处理管道

```
任务：处理 CSV 数据

输入：/data/input.csv

Step 1: 读取 CSV，统计行数，写入 stats.txt
Step 2: 过滤无效行，输出到 filtered.csv，记录过滤数到 filter-log.txt
Step 3: 转换数据格式，输出到 transformed.csv
Step 4: 验证转换结果，写入 validation.txt
Step 5: 生成最终报告，包含处理统计

验证：
- Step 2: filter-log.txt 记录过滤行数
- Step 4: validation.txt 确认转换正确
```

## 监控和调试

### 查看进度

```bash
# 查看所有步骤文件
ls -la /tmp/task-chain/

# 查看特定步骤
cat /tmp/task-chain/step3.txt

# 查看报告
cat /tmp/task-chain/report.txt
```

### 任务卡住时

```bash
# 检查最后修改的文件
ls -lt /tmp/task-chain/ | head -5

# 查看 Gateway 日志
tail -50 /tmp/openclaw-gateway.log

# 查看 agent 会话日志
openclaw sessions list
```

## 相关文件

- `scripts/ws-send-to-agent.py` - 发送任务给 agent
- `docs/automation/cron-jobs.md` - 定时任务配置
- `docs/tools/subagents.md` - 子 agent 配置

## 注意事项

1. **不要使用内存变量**：始终使用文件传递状态
2. **每步都要验证**：防止错误累积
3. **限制重试次数**：避免无限循环
4. **生成最终报告**：方便总结和问题排查
5. **使用独立目录**：避免文件冲突
