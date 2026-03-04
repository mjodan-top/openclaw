#!/usr/bin/env python3
"""
Send message to OpenClaw agent via local Gateway.

Usage:
    python3 ws-send-to-agent.py "Your message here"
    python3 ws-send-to-agent.py  # Uses default message

Environment Variables (optional):
    OPENCLAW_GATEWAY_URL: Gateway WebSocket URL (default: ws://127.0.0.1:18789)
    OPENCLAW_GATEWAY_TOKEN: Auth token (default: maczkf-access-token-20250301)
    OPENCLAW_AGENT_SESSION_KEY: Session key (default: agent:tech-director:main)
"""

import asyncio
import json
import time
import os
import sys

try:
    import websockets
except ImportError:
    print("Error: websockets library not found")
    print("Please install: pip3 install websockets")
    sys.exit(1)

# Configuration with environment variable overrides
GATEWAY_URL = os.environ.get("OPENCLAW_GATEWAY_URL", "ws://127.0.0.1:18789")
TOKEN = os.environ.get("OPENCLAW_GATEWAY_TOKEN", "maczkf-access-token-20250301")
SESSION_KEY = os.environ.get("OPENCLAW_AGENT_SESSION_KEY", "agent:tech-director:main")

# Timeout settings
CONNECT_TIMEOUT = 10
MESSAGE_TIMEOUT = 30
HISTORY_TIMEOUT = 10
RECV_TIMEOUT = 5


async def send_message(message: str, verbose: bool = True) -> dict:
    """
    Connect to Gateway and send message to agent.

    Args:
        message: The message to send
        verbose: Whether to print status messages

    Returns:
        dict with 'success' bool and optional 'response' text
    """
    result = {"success": False}

    if verbose:
        print(f"Connecting to {GATEWAY_URL}...")

    try:
        async with websockets.connect(GATEWAY_URL, close_timeout=CONNECT_TIMEOUT) as ws:
            # Step 1: Receive challenge
            try:
                first_msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=RECV_TIMEOUT))
                if verbose:
                    print(f"Received: {first_msg.get('type')}")
            except asyncio.TimeoutError:
                print("Error: Timeout waiting for initial connection")
                return result

            # Step 2: Authenticate
            auth_msg = {
                "type": "req",
                "id": "conn-1",
                "method": "connect",
                "params": {
                    "client": {
                        "id": "cli",
                        "version": "1.0",
                        "platform": "macos",
                        "mode": "cli",
                    },
                    "auth": {"token": TOKEN},
                    "minProtocol": 3,
                    "maxProtocol": 3,
                    "role": "operator",
                    "scopes": ["operator.admin"],
                },
            }

            await ws.send(json.dumps(auth_msg))
            resp = json.loads(await asyncio.wait_for(ws.recv(), timeout=RECV_TIMEOUT))
            if verbose:
                print(f"Auth: {resp.get('type')}")

            if resp.get("type") == "connect.error" or resp.get("ok") is False:
                print(f"Authentication failed: {resp}")
                return result

            # Step 3: Send message to agent
            idempotency_key = f"msg-{int(time.time())}"
            agent_msg = {
                "type": "req",
                "id": f"req-{idempotency_key}",
                "method": "agent",
                "params": {
                    "message": message,
                    "idempotencyKey": idempotency_key,
                    "sessionKey": SESSION_KEY,
                },
            }

            if verbose:
                print(f"Sending message to agent ({SESSION_KEY})...")
            await ws.send(json.dumps(agent_msg))

            if verbose:
                print(f"Message sent, waiting for processing (timeout: {MESSAGE_TIMEOUT}s)...")

            # Step 4: Wait for processing
            start_time = time.time()
            while time.time() - start_time < MESSAGE_TIMEOUT:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=RECV_TIMEOUT)
                    parsed = json.loads(msg)
                    msg_type = parsed.get("type", "unknown")
                    if verbose:
                        print(f"Received: {msg_type}")
                    if msg_type in ["agent.done", "agent.error", "error"]:
                        if msg_type == "agent.error":
                            print(f"Agent error: {parsed}")
                        break
                except asyncio.TimeoutError:
                    break

            # Step 5: Get chat history
            if verbose:
                print("\nFetching response...")

            history_msg = {
                "type": "req",
                "id": "hist-1",
                "method": "chat.history",
                "params": {"sessionKey": SESSION_KEY, "limit": 10},
            }

            await ws.send(json.dumps(history_msg))

            try:
                hist_resp = await asyncio.wait_for(ws.recv(), timeout=HISTORY_TIMEOUT)
                hist_parsed = json.loads(hist_resp)

                if hist_parsed.get("type") == "chat.history":
                    messages = hist_parsed.get("result", {}).get("messages", [])
                    agent_messages = []

                    for msg in reversed(messages):
                        role = msg.get("role", "unknown")
                        content = msg.get("content", [])
                        if isinstance(content, list):
                            for c in content:
                                if c.get("type") == "text":
                                    text = c.get("text", "")
                                    agent_messages.append({"role": role, "text": text})

                    result["success"] = True
                    result["messages"] = agent_messages
                    result["session_key"] = SESSION_KEY

                    if verbose:
                        print("\n" + "=" * 60)
                        print(f"RESPONSE FROM {SESSION_KEY}:")
                        print("=" * 60)
                        for msg in agent_messages:
                            print(f"\n[{msg['role']}]:\n{msg['text'][-4000:]}")
                        print("=" * 60)
                else:
                    if verbose:
                        print(f"History response: {hist_parsed}")
            except asyncio.TimeoutError:
                if verbose:
                    print("Timeout waiting for history")

    except Exception as e:
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()
        result["error"] = str(e)

    return result


def main():
    """Main entry point."""
    # Get message from command line or use default
    if len(sys.argv) > 1:
        message = " ".join(sys.argv[1:])
    else:
        # Default demo message
        message = """请帮我完成以下任务：

## 任务：构建并测试

### 目标
1. 分析当前项目状态
2. 执行必要的构建/测试
3. 报告结果

### 要求
- 使用 evolve_task 工具来执行任务
- 先分析任务完整性
- 分步骤执行，每步汇报进度
- 遇到问题时返回详细的进度文档

请制定计划并开始执行。"""

    result = asyncio.run(send_message(message))
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
