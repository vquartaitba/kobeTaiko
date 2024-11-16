'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiSend, FiSettings, FiLogOut, FiPlus, FiMessageSquare } from 'react-icons/fi';
import { RiRocketLine } from 'react-icons/ri';
import { io } from 'socket.io-client';

interface Message {
  content: string;
  sender: 'user' | 'ai';
}

interface ChatHistory {
  id: number;
  title: string;
  messages: Message[];
}

const initialMessage: Message = {
  content: "Hello! I'm KOBE, your web3 developer assistant. How can I help you today?",
  sender: 'ai'
};

export default function Chat() {
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isDeployMenuOpen, setIsDeployMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  const socketRef = useRef<any>(null);
  const socketRef2 = useRef<any>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    document.body.className = isDarkTheme ? 'dark' : 'light';
  }, [isDarkTheme]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  useEffect(() => {
    socketRef.current = io('http://localhost:3001');
    socketRef2.current = io('http://localhost:3002');

    const handleLog = (log: string) => {
      setBackendLogs(prev => [...prev, `${log}`]);
    };

    // const handleError = (log: string) => {
    //   setBackendLogs(prev => [...prev, `ERROR: ${log}`]);
    // };

    socketRef.current.on('console_log', handleLog);
    // socketRef.current.on('console_error', handleError);
    socketRef2.current.on('console_log', handleLog);
    // socketRef2.current.on('console_error', handleError);

    return () => {
      socketRef.current.disconnect();
      socketRef2.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [backendLogs]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }, []);

  const handleSend = async () => {
    if (input.trim()) {
      let currentChatHistory = chatHistory;
      let currentActiveChat = activeChat;

      // Create a new chat if there isn't one
      if (chatHistory.length === 0 || activeChat === null) {
        const newChatNumber = chatHistory.length + 1;
        const newChat = { 
          id: Date.now(), 
          title: `Chat ${newChatNumber}`, 
          messages: [initialMessage] 
        };
        currentChatHistory = [...chatHistory, newChat];
        currentActiveChat = newChat.id;
        setChatHistory(currentChatHistory);
        setActiveChat(currentActiveChat);
      }

      const userMessage = { content: input, sender: 'user' };
      const loadingMessage = { content: "Processing...", sender: 'ai' };
      const updatedChatHistory = currentChatHistory.map(chat => 
        chat.id === currentActiveChat 
          ? { ...chat, messages: [...chat.messages, userMessage, loadingMessage] }
          : chat
      );
      setChatHistory(updatedChatHistory as ChatHistory[]);
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch('http://localhost:3001/api/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userTask: input }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const result = await response.json();
        
        const aiMessage = { content: result, sender: 'ai' };
        const finalChatHistory = updatedChatHistory.map(chat => 
          chat.id === currentActiveChat 
            ? { ...chat, messages: [...chat.messages.slice(0, -1), aiMessage] }
            : chat
        );
        setChatHistory(finalChatHistory as ChatHistory[]);
      } catch (error) {
        console.error('Error:', error);
        // Handle error (e.g., show an error message to the user)
        const errorMessage = { content: "An error occurred while processing your request.", sender: 'ai' };
        const errorChatHistory = updatedChatHistory.map(chat => 
          chat.id === currentActiveChat 
            ? { ...chat, messages: [...chat.messages.slice(0, -1), errorMessage] }
            : chat
        );
        setChatHistory(errorChatHistory as ChatHistory[]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const createNewChat = () => {
    const newChatNumber = chatHistory.length + 1;
    const newChat = { 
      id: Date.now(), 
      title: `Chat ${newChatNumber}`, 
      messages: [initialMessage] 
    };
    setChatHistory([...chatHistory, newChat]);
    setActiveChat(newChat.id);
  };

  const switchChat = (id: number) => {
    setActiveChat(id);
  };

  const deleteChat = (id: number) => {
    const updatedChatHistory = chatHistory.filter(chat => chat.id !== id);
    setChatHistory(updatedChatHistory);
    if (activeChat === id) {
      setActiveChat(updatedChatHistory[0]?.id || 0);
    }
    setOpenMenu(null);
  };

  const startRenaming = (id: number, currentTitle: string) => {
    setIsRenaming(id);
    setNewTitle(currentTitle);
    setOpenMenu(null);
  };

  const finishRenaming = () => {
    if (newTitle.trim()) {
      const updatedChatHistory = chatHistory.map(chat => 
        chat.id === isRenaming ? { ...chat, title: newTitle.trim() } : chat
      );
      setChatHistory(updatedChatHistory);
    }
    setIsRenaming(null);
    setNewTitle('');
  };

  const toggleMenu = (id: number) => {
    setOpenMenu(openMenu === id ? null : id);
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const handleLogout = () => {
    router.push('/');
  };

  const handleDeploy = async (network: 'taiko') => {
    setIsDeploying(true);
    setIsDeployMenuOpen(false);

    // Add a new AI message to show deployment is in progress
    const deployingMessage = {
      content: "Deploying on blockchain...",
      sender: 'ai' as const
    };
    const updatedChatHistory = chatHistory.map(chat => 
      chat.id === activeChat 
        ? { ...chat, messages: [...chat.messages, deployingMessage] }
        : chat
    );
    setChatHistory(updatedChatHistory);

    try {
      const response = await fetch(`http://localhost:3001/api/deploy/${network}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.deployedAddress) {
        console.log(`Deployed to ${network}:`, data.deployedAddress);
        var successMessage = {
          content: ``,
          sender: 'ai' as const
        };
        var successMessage = {
          content: `Successfully deployed to ${network}. \n Program Id: ${data.deployedAddress}`,
          sender: 'ai' as const
        };
        const finalChatHistory = updatedChatHistory.map(chat => 
          chat.id === activeChat 
            ? { ...chat, messages: [...chat.messages.slice(0, -1), successMessage] }
            : chat
        );
        setChatHistory(finalChatHistory);
      } else {
        throw new Error(`Failed to deploy to ${network}`);
      }
    } catch (error) {
      console.error(`Error deploying to ${network}:`, error);
      const errorMessage = {
        content: `Error deploying to ${network}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'ai' as const
      };
      const errorChatHistory = updatedChatHistory.map(chat => 
        chat.id === activeChat 
          ? { ...chat, messages: [...chat.messages.slice(0, -1), errorMessage] }
          : chat
      );
      setChatHistory(errorChatHistory);
    } finally {
      setIsDeploying(false);
    }
  };

  const activeMessages = chatHistory.find(chat => chat.id === activeChat)?.messages || [initialMessage];

  const LoadingWheel = ({ message }: { message: string }) => (
    <div className="flex items-center space-x-2">
      <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
      <span className="text-sm">{message}</span>
    </div>
  );

  return (
    <div className={`flex h-screen ${isDarkTheme ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      {/* Sidebar */}
      <div className={`w-64 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'} flex flex-col shadow-lg`}>
        <div className="p-4 text-2xl font-bold text-white-500 flex items-center">
          <FiMessageSquare className="mr-2" /> KOBE
        </div>
        <button
          onClick={createNewChat}
          className={`m-4 p-2 ${isDarkTheme ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg flex items-center justify-center transition duration-200 shadow-md`}
        >
          <FiPlus className="mr-2" /> New Chat
        </button>
        <div className="flex-1 overflow-y-auto">
          {chatHistory.map((chat) => (
            <div 
              key={chat.id} 
              className={`p-2 m-2 ${
                activeChat === chat.id 
                  ? isDarkTheme ? 'bg-blue-600' : 'bg-blue-400' 
                  : isDarkTheme ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
              } rounded-xl cursor-pointer flex justify-between items-center`}
            >
              {isRenaming === chat.id ? (
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={finishRenaming}
                  onKeyPress={(e) => e.key === 'Enter' && finishRenaming()}
                  className="bg-transparent outline-none flex-grow"
                  autoFocus
                />
              ) : (
                <span onClick={() => switchChat(chat.id)}>{chat.title}</span>
              )}
              <div className="relative">
                <button onClick={() => toggleMenu(chat.id)} className="text-sm px-2">⋮</button>
                {openMenu === chat.id && (
                  <div className={`absolute right-0 mt-2 w-48 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-md shadow-lg z-10`}>
                    <button
                      onClick={() => startRenaming(chat.id, chat.title)}
                      className={`block w-full text-left px-4 py-2 text-sm ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => deleteChat(chat.id)}
                      className={`block w-full text-left px-4 py-2 text-sm ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className={`p-4 border-t ${isDarkTheme ? 'border-gray-800' : 'border-gray-300'}`}>
          <div className="relative">
            <div
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`mb-2 cursor-pointer ${isDarkTheme ? 'hover:bg-gray-800' : 'hover:bg-gray-200'} p-2 rounded-full`}
            >
              <span className="mr-2">⚙️</span> Settings
            </div>
            {isSettingsOpen && (
              <div className={`absolute bottom-full left-0 mb-2 w-48 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
                <div
                  onClick={toggleTheme}
                  className={`p-2 cursor-pointer ${isDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  {isDarkTheme ? '☀️ Light Theme' : '🌙 Dark Theme'}
                </div>
                {/* Add more settings options here */}
              </div>
            )}
          </div>
          <div
            onClick={handleLogout}
            className={`cursor-pointer ${isDarkTheme ? 'hover:bg-gray-800' : 'hover:bg-gray-200'} p-2 rounded-full`}
          >
            <span className="mr-2">🚪</span> Logout
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-6"
        >
          {activeMessages.map((message, index) => (
            <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`inline-block max-w-[80%] rounded-2xl p-4 shadow-md ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : isDarkTheme
                  ? 'bg-gray-800 text-gray-200'
                  : 'bg-white text-gray-700'
              }`}>
                {message.sender === 'ai' && message.content !== "Processing..." && message.content !== "Deploying on blockchain..." && (
                  <div className="mb-2">
                    <span className="text-sm font-semibold">KOBE</span>
                  </div>
                )}
                {message.content === "Processing..." || message.content === "Deploying on blockchain..." ? (
                  <LoadingWheel message={message.content} />
                ) : (
                  <div className="break-words">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      className="text-sm space-y-2"
                      components={{
                        code({inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          return !inline && match ? (
                            <div className="relative mt-2">
                              <div className="overflow-x-auto">
                                <pre className={`${isDarkTheme ? 'bg-gray-900' : 'bg-gray-100'} p-4 rounded`}>
                                  <button 
                                    onClick={() => copyToClipboard(String(children))}
                                    className={`absolute top-4 right-4 ${isDarkTheme ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} px-3 py-1 rounded text-xs hover:bg-opacity-80 transition-colors duration-200`}
                                  >
                                    {copiedCode === String(children) ? 'Copied!' : 'Copy'}
                                  </button>
                                  <code className={`${className} block mt-4 ${isDarkTheme ? 'text-gray-300' : 'text-gray-800'}`} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <code className={`${className} ${isDarkTheme ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} px-1 py-0.5 rounded`} {...props}>
                              {children}
                            </code>
                          )
                        },
                        p({children}) {
                          return <p className="mb-2 whitespace-pre-wrap">{children}</p>
                        },
                        ul({children}) {
                          return <ul className="list-disc pl-6 mb-2">{children}</ul>
                        },
                        ol({children}) {
                          return <ol className="list-decimal pl-6 mb-2">{children}</ol>
                        },
                        li({children}) {
                          return <li className="mb-1">{children}</li>
                        },
                        h1({children}) {
                          return <h1 className="text-xl font-bold mb-2 break-words">{children}</h1>
                        },
                        h2({children}) {
                          return <h2 className="text-lg font-semibold mb-2 break-words">{children}</h2>
                        },
                        h3({children}) {
                          return <h3 className="text-base font-medium mb-2 break-words">{children}</h3>
                        },
                        table({children}) {
                          return (
                            <div className="overflow-x-auto">
                              <table className="min-w-full">{children}</table>
                            </div>
                          )
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4">
          <div className={`flex items-center space-x-3 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-full p-2 shadow-md`}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              className={`flex-1 ${isDarkTheme ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'} rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Ask KOBE anything..."
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              className={`${isDarkTheme ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded-full transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} font-sans font-semibold tracking-wide flex items-center`}
              disabled={isLoading}
            >
              <FiSend className="mr-2" /> Send
            </button>
            <div className="relative">
              <button
                onClick={() => setIsDeployMenuOpen(!isDeployMenuOpen)}
                className={`${isDarkTheme ? 'bg-blue-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white px-4 py-2 rounded-full transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 font-sans font-semibold tracking-wide flex items-center`}
              >
                <RiRocketLine className="mr-2" /> Deploy
              </button>
              {isDeployMenuOpen && (
                <div className={`absolute bottom-full right-0 mb-2 w-48 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-md shadow-lg z-10 overflow-hidden`}>
                  <button
                    onClick={() => handleDeploy('taiko')}
                    className={`block w-full text-left px-4 py-2 text-sm ${isDarkTheme ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-700'} transition duration-150 ease-in-out`}
                  >
                    Deploy on Taiko
                  </button>
                  
                </div>
              )}
            </div>
          </div>
        </div>  
      </div>

      {/* Backend logs section */}
      <div className={`w-64 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'} flex flex-col shadow-lg`}>
        <div className="p-4 text-2xl font-bold text-white-500 flex items-center">
          Backend Logs
        </div>
        <div ref={logsContainerRef} className="flex-1 overflow-y-auto p-2">
          {backendLogs.map((log, index) => (
            <div key={index} className={`p-2 m-1 ${isDarkTheme ? 'bg-gray-700' : 'bg-gray-200'} rounded text-xs`}>
              <pre className={`${isDarkTheme ? 'text-gray-100' : 'text-gray-800'} whitespace-pre-wrap break-words`}>
                {log}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
};
