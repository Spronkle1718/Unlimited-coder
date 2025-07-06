import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

// Generate a session ID for anonymous users
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Get or create session ID from localStorage
function getSessionId(): string {
  let sessionId = localStorage.getItem('coding-assistant-session');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('coding-assistant-session', sessionId);
  }
  return sessionId;
}

export function CodingAssistant() {
  const [sessionId] = useState(() => getSessionId());
  const conversations = useQuery(api.chat.getConversations, { sessionId }) || [];
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const messages = useQuery(api.chat.getMessages, 
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  ) || [];
  
  const createConversation = useMutation(api.chat.createConversation);
  const generateResponse = useAction(api.chat.generateResponse);
  const deleteConversation = useMutation(api.chat.deleteConversation);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleNewConversation = async () => {
    try {
      const title = `Coding Session ${new Date().toLocaleDateString()}`;
      const conversationId = await createConversation({ title, sessionId });
      setSelectedConversationId(conversationId);
    } catch (error) {
      toast.error("Failed to create conversation");
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedConversationId || isGenerating) return;
    
    const userMessage = input.trim();
    setInput("");
    setIsGenerating(true);
    
    try {
      await generateResponse({
        conversationId: selectedConversationId,
        userMessage,
      });
    } catch (error) {
      toast.error("Failed to generate response");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteConversation = async (conversationId: Id<"conversations">) => {
    try {
      await deleteConversation({ conversationId });
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleNewConversation}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            + New Conversation
          </button>
          <div className="mt-3 text-center">
            <div className="text-xs text-green-600 font-medium">✓ Completely Free</div>
            <div className="text-xs text-gray-500">No limits • No sign-up</div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">Start your first conversation!</p>
              <p className="text-xs mt-1">Click "New Conversation" above</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation._id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 group ${
                  selectedConversationId === conversation._id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setSelectedConversationId(conversation._id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{conversation.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(conversation.lastMessageAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conversation._id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <h3 className="text-xl font-medium mb-2">Ready to code together!</h3>
                  <p>Ask me anything about programming, debugging, architecture, or code review.</p>
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
                    <div className="text-green-800 font-medium text-sm">🎉 Completely Free!</div>
                    <div className="text-green-700 text-sm mt-1">
                      • No character limits<br/>
                      • Unlimited conversations<br/>
                      • No sign-up required<br/>
                      • Powered by GPT-4o-mini
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-4xl rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        <MessageContent content={message.content} />
                      </div>
                      <div className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-gray-600">Generating response...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex space-x-4">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me about code, debugging, architecture, or paste your code for review... (Ctrl+Enter to send)"
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[60px] max-h-[200px]"
                  disabled={isGenerating}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isGenerating}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Ctrl+Enter to send • Completely free • No limits • Powered by GPT-4o-mini
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 max-w-md">
              <h3 className="text-xl font-medium mb-2">Welcome to your free AI coding assistant!</h3>
              <p className="mb-4">Start a new conversation to begin coding together.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
                <div className="font-medium text-sm mb-2">🚀 Features:</div>
                <div className="text-sm text-left">
                  • Code review & debugging<br/>
                  • Architecture guidance<br/>
                  • Complete code examples<br/>
                  • All programming languages<br/>
                  • Unlimited usage
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple code block detection and formatting
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Multi-line code block
          const lines = part.slice(3, -3).split('\n');
          const language = lines[0].trim();
          const code = lines.slice(1).join('\n');
          
          return (
            <div key={index} className="my-4">
              {language && (
                <div className="text-xs text-gray-500 mb-1 font-mono">{language}</div>
              )}
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{code}</code>
              </pre>
            </div>
          );
        } else if (part.startsWith('`') && part.endsWith('`')) {
          // Inline code
          return (
            <code key={index} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">
              {part.slice(1, -1)}
            </code>
          );
        } else {
          // Regular text
          return <span key={index}>{part}</span>;
        }
      })}
    </>
  );
}
