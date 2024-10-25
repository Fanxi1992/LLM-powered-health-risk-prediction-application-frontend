import React, { createContext, useState, useContext } from 'react';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([
    { 
      text: "你好！我是由AIRS团队开发的AI健康预警助手，可以提供健康风险评估、健康管理建议、疾病预防和治疗指导等服务。请点击右上角头像设置您的信息以得到更精确的服务。", 
      type: 'bot' 
    },
  ]);

  return (
    <ChatContext.Provider value={{ messages, setMessages }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);