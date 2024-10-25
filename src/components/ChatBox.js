import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Input, Button, Avatar, Modal, Spin, message } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, FileTextOutlined, CheckCircleFilled } from '@ant-design/icons';
import styled from 'styled-components'; // 添加这行
import backgroundImage from '../assets/f2.png';  // 假设图片位于src/assets文件夹中
import moment from 'moment';
import 'moment/locale/zh-cn';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import {getToken} from '../utils/user-token'
import { userid_generate } from '../utils/uuid';
// import { showToast } from '../utils/toast';

moment.locale('zh-cn');

// 添加这个样式组件
const PreserveWhitespace = styled.div`
  white-space: pre-wrap;
  word-wrap: break-word;
`;

// 函数组件
const ChatBox = ({onOpenInfoForm}) => {
  const { messages, setMessages } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false); // 新增状态来控制警告框
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState([]);
  // const [currentMessage, setCurrentMessage] = useState("");

  // const BASE_URL = 'http://localhost:8000';
  const BASE_URL = 'http://47.236.96.190:8000';

  // 添加默认问题列表
  const defaultQuestions = [
    "我应该如何保持健康的生活方式？",
    "有哪些常见的慢性病预防措施？",
    "如何改善睡眠质量？",
    "日常饮食应该注意什么？"
  ];

  // 添加自动滚动到底部的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 在消息更新后自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理输入变化的函数
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (newValue.includes("习近平")) {
      setShowWarning(true);
    }
  };

  // 处理默认问题点击的函数
  const handleQuestionClick = async (question) => {
    await handleSend(question);
  };

  const handleReportGeneration = () => {
    setIsReportModalVisible(true);
    setIsGeneratingReport(true);
    
    // 模拟报告生成过程
    setTimeout(() => {
      setIsGeneratingReport(false);
      setIsReportModalVisible(false);
      message.success('健康风险评估报告已生成');
    }, 3000);
  };


  // 处理发送消息的方法
  const handleSend = async (message = inputValue) => {
    const trimmedValue = message.trim();
    if (!trimmedValue) return;

    if (trimmedValue.includes("习近平")) {
      setShowWarning(true);
      return;
    }

    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    setMessages(prevMessages => [...prevMessages, { text: trimmedValue, type: 'user', time: currentTime }]);
    setInputValue('');
    setIsLoading(true);
    setIsWaitingForResponse(true); // 在发送消息时设置等待状态

    console.log('开始发送query', trimmedValue);

    try {
      let userid = localStorage.getItem('userid');
      if (!userid) {
        // 如果不存在或为空,生成新的 userid
        userid = userid_generate();
      }

      const response = await fetch(`${BASE_URL}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization':  `Bearer ${getToken()}`
        },
        body: JSON.stringify({query: trimmedValue, userid: userid}),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        } else {
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const reader = response.body.getReader();
      const currentTime_bot = moment().format('YYYY-MM-DD HH:mm:ss');
      let responseContent = "";
      let isFirstResponse = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const decodedValue = new TextDecoder().decode(value);
        const lines = decodedValue.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.slice(6));
              if (jsonData.event === 'cmpl') {
                responseContent += jsonData.text;
                if (isFirstResponse) {
                  setMessages((prevMessages) => [
                    ...prevMessages,
                    { text: responseContent, type: 'bot', time: currentTime_bot }
                  ]);
                  isFirstResponse = false;
                  setIsWaitingForResponse(false); // 收到第一个响应，结束等待状态
                } else {
                  setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages];
                    updatedMessages[updatedMessages.length - 1] = {
                      text: responseContent,
                      type: 'bot',
                      time: currentTime_bot
                    };
                    return updatedMessages;
                  });
                }
              } else if (jsonData.event === 'all_done') {
                break;
              }
            } catch (error) {
              console.error('Error parsing JSON:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error while sending message:', error);
      const currentTime_bot = moment().format('YYYY-MM-DD HH:mm:ss');
      setMessages(prevMessages => [...prevMessages, {text: `发生错误：${error.message}`, type: 'bot', time: currentTime_bot}]);
    } finally {
      setIsLoading(false);
      setIsWaitingForResponse(false); // 确保在所有情况下都重置等待状态
    }
  };






  const navigate = useNavigate();

  const handleAvatarClick = () => {
      navigate('/personinfo');
  };


  const handleNetworkClick = () => {
    navigate('/network');
};


  // 在文件顶部添加这个导入
  // 在组件外部添加这个样式组件
  const PreserveWhitespace = styled.div`
    white-space: pre-wrap;
    word-wrap: break-word;
  `;

  // 这个函数要进行修改，并添加相应的错误捕捉和渲染机制
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setReportProgress([]);
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    setMessages(prevMessages => [...prevMessages, { text: '正在生成健康报告...', type: 'bot', time: currentTime }]);

    try {
      let userid = localStorage.getItem('userid');
      if (!userid) {
        userid = userid_generate();
      }

      const response = await fetch(`${BASE_URL}/generate_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ userid: userid }),
      });

      if (!response.ok) {
        // 直接根据 HTTP 状态码处理不同情况
        switch (response.status) {
          case 400:
            throw new Error('认证格式无效，请重新登录');
          case 404:
            throw new Error('您尚未登记个人信息，请先登记个人基础信息方可进行健康风险评估');
          case 500:
            throw new Error('服务器错误，请稍后重试');
          default:
            throw new Error('未知错误');
        }
      }






      const reader = response.body.getReader();
      let responseContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const decodedValue = new TextDecoder().decode(value);
        const lines = decodedValue.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.slice(6));
              if (jsonData.event === 'search_process') {
                setReportProgress(prev => [...prev, jsonData.text]);
              } else if (jsonData.event === 'cmpl') {
                responseContent += jsonData.text;
                setMessages(prevMessages => {
                  const updatedMessages = [...prevMessages];
                  updatedMessages[updatedMessages.length - 1] = {
                    text: responseContent,
                    type: 'bot',
                    time: currentTime
                  };
                  return updatedMessages;
                });
              } else if (jsonData.event === 'all_done') {
                break;
              }
            } catch (error) {
              console.error('Error parsing JSON:', error);
              alert(error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error while generating report:', error);
      setMessages(prevMessages => [...prevMessages, {text: `生成报告时发生错误：${error.message}`, type: 'bot', time: moment().format('YYYY-MM-DD HH:mm:ss')}]);
    } finally {
      setIsGeneratingReport(false);
      setReportProgress([]);
    }
  };

  // 在渲染消息的部分，将文本内容包裹在这个组件中
  return (
    <div 
      className="flex flex-col h-full pt-16 bg-cover bg-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,  // 使用导入的图片
        backgroundRepeat: 'repeat',
      }}
    >
      <div className="flex-1 overflow-y-auto p-4 border-t-2 border-black-200">
        {/* 欢迎消息 */}
        <div className="flex justify-start mb-4">
          <Avatar icon={<RobotOutlined />} className="mr-2 flex-shrink-0 self-start" />
          <div className="max-w-[70%] bg-white rounded-lg p-3 shadow">
            <div className="font-bold">AI助手</div>
            <div>
              你好！我是由AIRS团队开发的AI健康预警助手，可以提供健康风险评估、健康管理建议、疾病预防和治疗指导等服务。您可以
              <span 
                className="font-bold text-blue-500 cursor-pointer hover:underline"
                onClick={handleNetworkClick}
              >
              点击此处
              </span>
              查看疾病关联网络实景图，也可以
              <span 
                className="font-bold text-blue-500 cursor-pointer hover:underline"
                onClick={handleAvatarClick}
              >
                设置您的信息
              </span>
              以得到更精确的服务。
            </div>
          </div>
        </div>

        {/* 预设问题框 */}
        <div className="bg-white rounded-lg p-3 shadow mb-4">
          <div className="font-bold mb-2">您可能想问：</div>
          {defaultQuestions.map((question, index) => (
            <div 
              key={index} 
              className="text-green-600 cursor-pointer hover:underline mb-1"
              onClick={() => handleQuestionClick(question)}
            >
              {question}
            </div>
          ))}
        </div>

        {/* 聊天消息 */}
        {messages.slice(1).map((item, index) => (
          <div key={index} className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            {item.type === 'bot' && (
              <Avatar icon={<RobotOutlined />} className="mr-2 flex-shrink-0 self-start" />
            )}
            <div className={`max-w-[70%] ${item.type === 'user' ? 'bg-blue-500 text-white' : 'bg-white'} rounded-lg p-3 shadow`}>
              {item.type === 'bot' && (
                <div className="font-bold flex items-center">
                <span className="inline-flex items-center">
                  <span className="text-sm leading-none">AI助手</span>
                  <span className="text-xs ml-1 leading-none">{item.time}</span>
                  </span>
                </div>
              )}
              <PreserveWhitespace>{item.text}</PreserveWhitespace>
              {item.type === 'bot' && isGeneratingReport && (
                <div className="mt-2">
                  {reportProgress.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-center mb-1 text-sm text-gray-600">
                      <CheckCircleFilled className="text-green-500 mr-2" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {item.type === 'user' && (
              <Avatar icon={<UserOutlined />} className="ml-2 flex-shrink-0 self-start" />
            )}
          </div>
        ))}
        {isWaitingForResponse && (
          <div className="flex justify-start mb-4">
            <Avatar icon={<RobotOutlined />} className="mr-2 flex-shrink-0 self-start" />
            <div className="max-w-[70%] bg-white rounded-lg p-3 shadow">
              <Spin /> AI 正在思考中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>      

      <div className="bg-white p-4 border-t-2 border-gray-200">
        <div className="flex items-center">
          <Button
            className="mr-2 bg-green-500 text-white rounded-full px-3 h-10 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            icon={<FileTextOutlined />}
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
          />
          <Input
            value={inputValue}
            onChange={handleInputChange}
            className="flex-1 rounded-l-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 mr-2"
            onPressEnter={() => handleSend()}
            placeholder="输入消息..."
            disabled={isGeneratingReport}
          />
          <Button 
            className="bg-blue-500 text-white rounded-r-full px-4 h-10 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            icon={<SendOutlined />} 
            onClick={() => handleSend()}
            loading={isLoading}
            disabled={isGeneratingReport}
          >
            发送
          </Button>
        </div>
      </div>
      <Modal
        title="警告"
        open={showWarning}
        onOk={() => setShowWarning(false)}
        onCancel={() => setShowWarning(false)}
        centered={true}
        className="custom-modal"
      >
        <p>您的输入内容包含敏感词汇，请谨慎发言。</p>
      </Modal>
      <Modal
        title="生成健康报告"
        visible={isReportModalVisible}
        onCancel={() => setIsReportModalVisible(false)}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
      >
        <div className="flex items-center justify-center">
          <Spin size="large" />
          <span className="ml-3">正在为您生成健康报告,请耐心等待...</span>
        </div>
      </Modal>
    </div>
  );
};

export default ChatBox;
