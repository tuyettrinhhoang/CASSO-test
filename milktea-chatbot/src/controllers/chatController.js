const llmService = require('../services/llm');
const FunctionHandler = require('../services/functionHandler');
const Session = require('../models/Session');

class ChatController {
  async processMessage(userId, userMessage) {
    try {
      // Save user message to history
      await Session.addMessage(userId, 'user', userMessage);

      // Get conversation history
      const history = await Session.getConversationHistory(userId);
      
      // Convert to Anthropic format (only last 10 for context)
      const messages = history.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // First LLM call
      let response = await llmService.chat(messages, userId);
      
      // Handle function calls iteratively
      while (response.stop_reason === 'tool_use') {
        const toolCalls = llmService.extractToolCalls(response.content);
        
        // Execute all tool calls
        const toolResults = [];
        const handler = new FunctionHandler(userId);
        
        for (const toolCall of toolCalls) {
          const result = await handler.execute(toolCall.name, toolCall.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: JSON.stringify(result, null, 2)
          });
        }

        // Add assistant response with tool use to messages
        messages.push({
          role: 'assistant',
          content: response.content
        });

        // Add tool results to messages
        messages.push({
          role: 'user',
          content: toolResults
        });

        // Continue conversation with tool results
        response = await llmService.chat(messages, userId);
      }

      // Extract final text response
      const finalResponse = llmService.formatTextResponse(response.content);

      // Save assistant response to history
      await Session.addMessage(userId, 'assistant', finalResponse);

      return {
        success: true,
        response: finalResponse,
        usage: response.usage
      };

    } catch (err) {
      console.error('Chat processing error:', err);
      
      // Fallback response
      return {
        success: false,
        response: 'Xin lỗi bạn, hệ thống đang gặp lỗi. Vui lòng thử lại sau ít phút nhé! 🙏',
        error: err.message
      };
    }
  }

  async resetSession(userId) {
    await Session.delete(userId);
    return { success: true, message: 'Đã reset session' };
  }
}

module.exports = new ChatController();
