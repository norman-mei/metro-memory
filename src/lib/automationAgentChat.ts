import {
  AutomationAgentEventType,
  AutomationAgentMessageRole,
  AutomationAgentMessageStatus,
  AutomationAgentOutcomeType,
  AutomationRunRequestMode,
  Prisma,
} from '@prisma/client'

import { interpretOperatorChatMessage } from '@/lib/automationAgentModel'
import { parseDirectAutomationAction, executeDirectAutomationAction } from '@/lib/automationAgentActions'
import { buildAutomationExplainReply } from '@/lib/automationExplain'
import {
  appendAutomationAgentMessage,
  createAutomationAgentSession,
  createAutomationRunRequest,
  getAutomationAgentSessionGraph,
  queueAutomationRunRequest,
  recordAutomationAgentEvent,
  recordAutomationAgentOutcome,
  updateAutomationAgentMessage,
} from '@/lib/automationRunRequests'

type ProcessAutomationAgentChatInput = {
  reviewer?: string | null
  sessionId?: string
  branchId?: string | null
  parentMessageId?: string | null
  editMessageId?: string | null
  regenerateMessageId?: string | null
  message: string
}

function mapMode(mode: 'TARGETED_RESEARCH' | 'MANUAL_UPDATE' | 'EXPLAIN') {
  if (mode === 'MANUAL_UPDATE') return AutomationRunRequestMode.MANUAL_UPDATE
  if (mode === 'EXPLAIN') return AutomationRunRequestMode.EXPLAIN
  return AutomationRunRequestMode.TARGETED_RESEARCH
}

function createBranchId(seed?: string | null) {
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 12)
      : `${Date.now()}`
  return [seed || 'branch', suffix].filter(Boolean).join('-')
}

function getStructuredRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {}
}

export async function processAutomationAgentChat(input: ProcessAutomationAgentChatInput) {
  const directAction = parseDirectAutomationAction(input.message)
  const operatorAction = directAction ? null : await interpretOperatorChatMessage(input.message)

  const session =
    input.sessionId
      ? await getAutomationAgentSessionGraph(input.sessionId)
      : await createAutomationAgentSession({
          createdBy: input.reviewer || undefined,
          title: directAction
            ? `Direct action: ${directAction.type.toLowerCase().replaceAll('_', ' ')}`
            : operatorAction?.title,
          summary: directAction ? directAction.assistantMessage : operatorAction?.summary,
          sessionType:
            operatorAction?.mode === 'MANUAL_UPDATE'
              ? 'MANUAL_UPDATE'
              : operatorAction?.mode === 'TARGETED_RESEARCH'
                ? 'TARGETED_RUN'
                : 'CHAT',
          contextJson: {
            operatorAction: operatorAction || null,
          },
        })
  if (!session) {
    throw new Error('Failed to resolve automation agent session.')
  }

  const sessionMessages = session.messages || []
  const editedMessage = input.editMessageId
    ? sessionMessages.find((message) => message.id === input.editMessageId)
    : null
  const regeneratedMessage = input.regenerateMessageId
    ? sessionMessages.find((message) => message.id === input.regenerateMessageId)
    : null

  const branchId =
    input.branchId ||
    (editedMessage ? createBranchId(editedMessage.branchId || editedMessage.id) : null) ||
    regeneratedMessage?.branchId ||
    sessionMessages[sessionMessages.length - 1]?.branchId ||
    'main'
  const parentMessageId =
    input.parentMessageId ||
    (editedMessage ? editedMessage.parentMessageId : null) ||
    (regeneratedMessage ? regeneratedMessage.parentMessageId : null) ||
    [...sessionMessages]
      .reverse()
      .find((message) => (message.branchId || 'main') === branchId)?.id ||
    null
  const branchRootMessageId =
    editedMessage?.id ||
    regeneratedMessage?.branchRootMessageId ||
    regeneratedMessage?.parentMessageId ||
    parentMessageId ||
    null

  let userMessageId: string | null = null
  if (!input.regenerateMessageId) {
    const structuredPayload = (directAction || operatorAction || undefined) as
      | Prisma.InputJsonValue
      | undefined
    const userMessage = await appendAutomationAgentMessage({
      sessionId: session.id,
      role: AutomationAgentMessageRole.USER,
      status: AutomationAgentMessageStatus.COMPLETED,
      content: input.message,
      branchId,
      branchRootMessageId,
      parentMessageId,
      revisionOfMessageId: editedMessage?.id || null,
      ...(structuredPayload ? { structuredJson: structuredPayload } : {}),
      metadataJson: {
        isDirectAction: Boolean(directAction),
      },
    })
    userMessageId = userMessage.id
  }

  const assistantPlaceholder = await appendAutomationAgentMessage({
    sessionId: session.id,
    role: AutomationAgentMessageRole.ASSISTANT,
    status: AutomationAgentMessageStatus.STREAMING,
    content: '',
    branchId,
    branchRootMessageId,
    parentMessageId: userMessageId || parentMessageId,
    revisionOfMessageId: regeneratedMessage?.id || null,
    metadataJson: {
      streaming: true,
      isDirectAction: Boolean(directAction),
    },
  })
  await recordAutomationAgentEvent({
    sessionId: session.id,
    messageId: assistantPlaceholder.id,
    branchId,
    createdBy: input.reviewer || null,
    eventType: AutomationAgentEventType.MESSAGE_STREAMED,
    summaryJson: {
      branchId,
      regenerateMessageId: input.regenerateMessageId || null,
      editMessageId: input.editMessageId || null,
    },
  }).catch(() => null)

  let runRequest = null
  let assistantMessage = directAction?.assistantMessage || operatorAction?.assistantMessage || ''
  let actionRequestId: string | null = null

  if (directAction) {
    const directResult = await executeDirectAutomationAction({
      action: directAction,
      sessionId: session.id,
      messageId: assistantPlaceholder.id,
      branchId,
      reviewer: input.reviewer || null,
      rawMessage: input.message,
    })
    assistantMessage = directResult.assistantMessage
    actionRequestId = directResult.actionRequestId || null
    const latestExplainMessage = [...sessionMessages]
      .reverse()
      .find((message) => {
        if ((message.branchId || 'main') !== branchId || message.role !== 'ASSISTANT') return false
        const structured = getStructuredRecord(message.structuredJson)
        const operatorStructured = getStructuredRecord(structured.operatorAction)
        return operatorStructured.mode === 'EXPLAIN'
      })
    if (latestExplainMessage) {
      await recordAutomationAgentOutcome({
        sessionId: session.id,
        messageId: latestExplainMessage.id,
        branchId,
        outcomeType: AutomationAgentOutcomeType.EXPLAIN_ACTION,
        summaryJson: {
          triggeredByDirectAction: directAction.type,
          resultingMessageId: assistantPlaceholder.id,
        },
      }).catch(() => null)
    }
  } else if (operatorAction?.mode === 'EXPLAIN') {
    assistantMessage = await buildAutomationExplainReply({
      citySlugs: operatorAction.citySlugs,
      claimTypes: operatorAction.claimTypes,
    })
  } else if (operatorAction && operatorAction.citySlugs.length > 0) {
    runRequest = await createAutomationRunRequest({
      sessionId: session.id,
      messageId: assistantPlaceholder.id,
      branchId,
      requestedBy: input.reviewer || undefined,
      mode: mapMode(operatorAction.mode),
      scope: operatorAction.scope,
      citySlugs: operatorAction.citySlugs,
      claimTypes: operatorAction.claimTypes,
      applyPolicy: operatorAction.applyPolicy,
      prompt: input.message,
      contextJson: {
        operatorAction,
        branchId,
      },
    })

    if (operatorAction.execute) {
      await queueAutomationRunRequest(runRequest.id)
      assistantMessage = `${operatorAction.assistantMessage}\nQueued run request ${runRequest.id}.`
    } else {
      assistantMessage = `${operatorAction.assistantMessage}\nSaved run request ${runRequest.id}.`
    }
  } else if (operatorAction) {
    assistantMessage = operatorAction.assistantMessage
  }

  await updateAutomationAgentMessage({
    messageId: assistantPlaceholder.id,
    content: assistantMessage,
    status: AutomationAgentMessageStatus.COMPLETED,
    structuredJson: {
      ...(operatorAction ? { operatorAction } : {}),
      ...(directAction ? { directAction } : {}),
      ...(runRequest ? { runRequestId: runRequest.id } : {}),
      ...(actionRequestId ? { actionRequestId } : {}),
    },
    metadataJson: {
      streaming: false,
      branchId,
    },
  })
  if (editedMessage && runRequest) {
    await recordAutomationAgentOutcome({
      sessionId: session.id,
      messageId: userMessageId,
      runRequestId: runRequest.id,
      branchId,
      outcomeType: AutomationAgentOutcomeType.BRANCH_PROMPT_USEFUL,
      summaryJson: {
        sourceMessageId: editedMessage.id,
        resultingRunRequestId: runRequest.id,
      },
    }).catch(() => null)
  }

  return {
    sessionId: session.id,
    branchId,
    userMessageId,
    assistantMessageId: assistantPlaceholder.id,
    operatorAction,
    directAction,
    actionRequestId,
    runRequestId: runRequest?.id || null,
    assistantMessage,
  }
}
