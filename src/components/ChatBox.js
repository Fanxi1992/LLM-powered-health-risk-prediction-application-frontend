import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Input, Button, Avatar, Modal, Spin, message } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, FileTextOutlined, CheckCircleFilled } from '@ant-design/icons';
import styled from 'styled-components'; // 添加这行
import backgroundImage from '../assets/f5.png';  // 假设图片位于src/assets文件夹中
import moment from 'moment';
import 'moment/locale/zh-cn';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import {getToken} from '../utils/user-token'
import { userid_generate } from '../utils/uuid';
// import { showToast } from '../utils/toast';
// 设置 moment 的语言环境为中文，用于时间显示的本地化
moment.locale('zh-cn');

// 创建一个样式组件，用于保留文本的空白符并自动换行
// white-space: pre-wrap 保留空格和换行
// word-wrap: break-word 允许长单词换行
const PreserveWhitespace = styled.div`
  white-space: pre-wrap;
  word-wrap: break-word;
`;

// ChatBox 组件的主函数，接收 onOpenInfoForm 作为 props 用于控制信息表单的显示
const ChatBox = ({onOpenInfoForm}) => {
  // 使用 ChatContext 中的消息状态和设置方法
  const { messages, setMessages } = useChat();
  // 输入框的值状态
  const [inputValue, setInputValue] = useState('');
  // 控制加载状态的显示
  const [isLoading, setIsLoading] = useState(false);
  // 控制敏感词警告框的显示状态
  const [showWarning, setShowWarning] = useState(false);
  // 控制是否正在等待机器人响应的状态
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  // 用于滚动到最新消息的 ref
  const messagesEndRef = useRef(null);
  // 控制报告模态框显示的状态
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  // 控制报告生成过程的状态
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  // 存储报告生成进度的状态
  const [reportProgress, setReportProgress] = useState([]);

  // // API 基础 URL 配置
  // const BASE_URL = 'http://localhost:8000';
  // // 内网映射
  // const BASE_URL = 'https://sa5ni199260.vicp.fun:443';
  // 生产环境 URL（已注释）
  const BASE_URL = 'http://43.156.56.27:8000';

  // 预设的问题列表，用于快速提问
  const defaultQuestions = [
    "最近有些头疼咳嗽，可能是什么问题？",
    "深圳哪家医院看心血管比较好？",
    "如何改善睡眠质量？",
    "糖尿病患者日常饮食应该注意什么？"
  ];

  // 滚动到聊天框底部的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 当消息列表更新时，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 处理输入框值变化的函数，包含敏感词检测
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (newValue.includes("习近平")) {
      setShowWarning(true);
    }
  };

  // 处理预设问题点击的函数
  const handleQuestionClick = async (question) => {
    await handleSend(question);
  };

  // // 处理报告生成的函数，包含模拟生成过程
  // const handleReportGeneration = () => {
  //   setIsReportModalVisible(true);
  //   setIsGeneratingReport(true);
    
  //   // 使用 setTimeout 模拟报告生成过程，3秒后完成
  //   setTimeout(() => {
  //     setIsGeneratingReport(false);
  //     setIsReportModalVisible(false);
  //     message.success('健康风险评估报告已生成');
  //   }, 3000);
  // };

  // 处理消息发送的主要函数,接收输入框的值或预设消息作为参数
  const handleSend = async (message = inputValue) => {
    // 去除消息首尾空格
    const trimmedValue = message.trim();
    if (!trimmedValue) return;

    // 敏感词检测,如果包含敏感词则显示警告并返回
    if (trimmedValue.includes("习近平")) {
      setShowWarning(true); // 设置警告状态为true,触发警告提示的显示
      return;
    }

    // 获取当前时间作为消息时间戳
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    // 将用户消息添加到消息列表,设置type为'user'表示用户消息
    setMessages(prevMessages => [...prevMessages, { text: trimmedValue, type: 'user', time: currentTime }]);
    // 清空输入框
    setInputValue('');
    // 设置加载状态,用于显示加载动画
    setIsLoading(true);
    // 设置等待响应状态,用于UI反馈
    setIsWaitingForResponse(true);

    console.log('开始发送query', trimmedValue);

    try {
      // 从localStorage获取用户ID,如果不存在则生成新的
      let userid = localStorage.getItem('userid');
      if (!userid) {
        userid = userid_generate();
      }

      // 发送POST请求到后端API
      const response = await fetch(`${BASE_URL}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization':  `Bearer ${getToken()}` // 添加认证token
        },
        body: JSON.stringify({query: trimmedValue, userid: userid}),
      });

      // 错误处理:检查响应状态
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

      // 使用流式读取响应数据
      const reader = response.body.getReader();
      const currentTime_bot = moment().format('YYYY-MM-DD HH:mm:ss');
      let responseContent = ""; // 存储完整的响应内容
      let isFirstResponse = true; // 标记是否是第一次响应

      // 循环读取流数据
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解码二进制数据为文本
        const decodedValue = new TextDecoder().decode(value);
        const lines = decodedValue.split('\n').filter(line => line.trim() !== '');
        
        // 处理每一行数据
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.slice(6));
              // 检查响应事件类型
              if (jsonData.event === 'error') {
                throw new Error(jsonData.text);
              }
              if (jsonData.event === 'cmpl') {
                responseContent += jsonData.text;
                if (isFirstResponse) {
                  // 首次响应,添加新的机器人消息
                  setMessages((prevMessages) => [
                    ...prevMessages,
                    { text: responseContent, type: 'bot', time: currentTime_bot }
                  ]);
                  isFirstResponse = false;
                  setIsWaitingForResponse(false);
                } else {
                  // 非首次响应,更新最后一条机器人消息
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
              alert(error.message);
            }
          }
        }
      }
    } catch (error) {
      // 错误处理:显示错误消息
      console.error('Error while sending message:', error);
      const currentTime_bot = moment().format('YYYY-MM-DD HH:mm:ss');
      setMessages(prevMessages => [...prevMessages, {text: `发生错误：${error.message}`, type: 'bot', time: currentTime_bot}]);
    } finally {
      // 重置所有状态
      setIsLoading(false);
      setIsWaitingForResponse(false);
    }
  };

  // 使用useNavigate钩子进行路由导航
  const navigate = useNavigate();

  // 处理头像点击事件,导航到个人信息页面
  const handleAvatarClick = () => {
      navigate('/personinfo');
  };

  // 处理网络点击事件,导航到网络页面
  const handleNetworkClick = () => {
    navigate('/network');
  };
  // 使用styled-components创建一个保留空白符的div组件
  // 用于正确显示包含换行和空格的文本内容
  const PreserveWhitespace = styled.div`
    white-space: pre-wrap;  // 保留换行和空格
    word-wrap: break-word;  // 允许长单词换行
  `;

  // 处理生成健康报告的异步函数
  const handleGenerateReport = async () => {
    // 设置生成报告状态为true,用于控制UI loading效果
    setIsGeneratingReport(true);
    // 清空报告生成进度数组
    setReportProgress([]);
    // 获取当前时间戳
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // 在消息列表中添加一个空的bot消息,用于后续填充报告内容
    // isGeneratingReport标记用于特殊UI渲染
    setMessages(prevMessages => [...prevMessages, { 
      text: '', 
      type: 'bot', 
      time: currentTime,
      isGeneratingReport: true 
    }]);

    try {
      // 从localStorage获取用户ID,如果没有则生成新的
      let userid = localStorage.getItem('userid');
      if (!userid) {
        userid = userid_generate();
      }

      // 发起生成报告的API请求
      const response = await fetch(`${BASE_URL}/generate_report`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`  // 添加认证token
        },
      });

      // 处理各种HTTP错误状态
      if (!response.ok) {
        switch (response.status) {
          case 400:
            throw new Error('认证格式无效，请重新登录');
          case 404:
            throw new Error('您尚未登记个人信息，请先登记个人基础信息方可进行健康风险评估');
          case 500:
            throw new Error('get_doc阶段发生错误，请稍后重试');
          default:
            throw new Error('未知错误');
        }
      }

      // 使用流式读取响应数据
      const reader = response.body.getReader();
      let responseContent = "";  // 存储完整的响应内容
      let isFirstCompletion = true;  // 标记是否是第一次收到完成事件

      // 持续读取数据流
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解码二进制数据为文本
        const decodedValue = new TextDecoder().decode(value);
        // 按行分割响应数据,过滤空行
        const lines = decodedValue.split('\n').filter(line => line.trim() !== '');

        // 处理每一行数据

        // 对健康报告进行生成过程        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.slice(6));
              if (jsonData.event === 'error'){
                throw new Error(jsonData.text);
              }
              if (jsonData.event === 'search_process') {
                setReportProgress(prev => [...prev, jsonData.text]);
              } else if (jsonData.event === 'cmpl') {
                  // 后续的completion累加显示
                  // console.log("当前chunks", jsonData.text);
                  responseContent += jsonData.text;
                  // console.log("当前responseContent", responseContent);
                  if (isFirstCompletion) {
                  setMessages(prevMessages => [
                    ...prevMessages,
                    {text:responseContent, type: 'bot', time: currentTime, isGeneratingReport: false}
                  ]);
                  isFirstCompletion = false;
                } else {
                  setMessages(prevMessages => {
                    const updatedMessages = [...prevMessages];
                    updatedMessages[updatedMessages.length - 1] = {
                      text: responseContent,
                      type: 'bot',
                      time: currentTime,
                      isGeneratingReport: false
                    };
                    return updatedMessages;
                  });
                } 
              } else if (jsonData.event === 'all_done') {
                  // responseContent = ""; // 清空 responseContent 以防后续重复
                  break;
                }
              }catch (error) {
      console.error('Error parsing JSON:', error);
      throw error;
    }
  }
}
}
} catch (error) {
      // 错误处理:在UI中显示错误信息
      console.error('Error while generating report:', error);
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = {
          text: `生成报告时发生错误：${error.message}`,
          type: 'bot',
          time: currentTime,
          isGeneratingReport: false
        };
        return updatedMessages;
      });
    } finally {
      // 重置所有状态
      setIsGeneratingReport(false);
      setReportProgress([]);
    }
  };
  // 组件的主要渲染部分
  return (
    // 最外层容器,使用flex布局,占满高度,顶部padding为16,设置背景图
    <div 
      className="flex flex-col h-full pt-16 bg-cover bg-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,  // 使用导入的背景图片
        backgroundRepeat: 'repeat', // 背景图片重复平铺
      }}
    >
      {/* 聊天消息容器,可滚动,带边框 */}
      <div className="flex-1 overflow-y-auto p-4 border-t-2 border-black-200">
        {/* 欢迎消息部分 */}
        <div className="flex justify-start mb-4">
          {/* 机器人头像 */}
          <Avatar icon={<RobotOutlined />} className="mr-2 flex-shrink-0 self-start" />
          {/* 欢迎消息气泡 */}
          <div className="max-w-[70%] bg-white rounded-lg p-3 shadow">
            <div className="font-bold">AI助手</div>
            <div>
              欢迎使用由AIRS团队开发的AI健康风险评估助手。基于海量医疗数据训练，我们可视化了疾病共病性网络，您可以
              {/* 网络查看按钮,点击触发handleNetworkClick事件 */}
              <span 
                className="font-bold text-blue-500 cursor-pointer hover:underline"
                onClick={handleNetworkClick}
              >
              点击此处
              </span>
              查看关联网络实景，请
              {/* 头像设置按钮,点击触发handleAvatarClick事件 */}
              <span 
                className="font-bold text-blue-500 cursor-pointer hover:underline"
                onClick={handleAvatarClick}
              >
                设置您的信息
              </span>
              并进行问诊，以得到更精确的评估结果。
            </div>
          </div>
        </div>

        {/* 预设问题展示框 */}
        <div className="bg-white rounded-lg p-3 shadow mb-4">
          <div className="font-bold mb-2">您可能想问：</div>
          {/* 遍历defaultQuestions数组,渲染预设问题列表 */}
          {defaultQuestions.map((question, index) => (
            <div 
              key={index} 
              className="text-green-600 cursor-pointer hover:underline mb-1"
              onClick={() => handleQuestionClick(question)} // 点击问题触发handleQuestionClick
            >
              {question}
            </div>
          ))}
        </div>

        {/* 聊天消息列表,从第二条开始显示(slice(1)) */}
        {messages.slice(1).map((item, index) => (
          <div key={index} className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            {/* 机器人消息显示机器人头像 */}
            {item.type === 'bot' && (
              <Avatar icon={<RobotOutlined />} className="mr-2 flex-shrink-0 self-start" />
            )}
            {/* 消息气泡,根据消息类型设置不同样式 */}
            <div className={`max-w-[70%] ${item.type === 'user' ? 'bg-blue-500 text-white' : 'bg-white'} rounded-lg p-3 shadow`}>
              {/* 机器人消息显示标题和时间 */}
              {item.type === 'bot' && (
                <div className="font-bold flex items-center">
                  <span className="inline-flex items-center">
                    <span className="text-sm leading-none">AI助手</span>
                    <span className="text-xs ml-1 leading-none">{item.time}</span>
                  </span>
                </div>
              )}
              {/* 根据isGeneratingReport状态显示不同内容 */}
              {item.isGeneratingReport ? (
                // 显示报告生成进度
                <div>
                  <div className="mb-2">正在生成健康报告...</div>
                  {/* 显示reportProgress数组中的进度步骤 */}
                  {reportProgress.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-center mb-1 text-sm text-gray-600">
                      <CheckCircleFilled className="text-green-500 mr-2" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              ) : (
                // 显示普通消息内容
                <PreserveWhitespace>{item.text}</PreserveWhitespace>
              )}
            </div>
            {/* 用户消息显示用户头像 */}
            {item.type === 'user' && (
              <Avatar icon={<UserOutlined />} className="ml-2 flex-shrink-0 self-start" />
            )}
          </div>
        ))}
        {/* 等待响应状态显示加载动画 */}
        {isWaitingForResponse && (
          <div className="flex justify-start mb-4">
            <Avatar icon={<RobotOutlined />} className="mr-2 flex-shrink-0 self-start" />
            <div className="max-w-[70%] bg-white rounded-lg p-3 shadow">
              <Spin /> AI 正在思考中...
            </div>
          </div>
        )}
        {/* 用于滚动到最新消息的空div */}
        <div ref={messagesEndRef} />
      </div>      

      {/* 底部输入框区域 */}
      <div className="bg-white p-4 border-t-2 border-gray-200">
        <div className="flex items-center">
          {/* 生成报告按钮 */}
          <Button
            className="mr-2 bg-green-500 text-white rounded-full px-3 h-10 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            icon={<FileTextOutlined />}
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
          />
          {/* 消息输入框 */}
          <Input
            value={inputValue}
            onChange={handleInputChange}
            className="flex-1 rounded-l-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 mr-2"
            onPressEnter={() => handleSend()}
            placeholder="输入消息..."
            disabled={isGeneratingReport}
          />
          {/* 发送按钮 */}
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
      {/* 敏感词警告弹窗 */}
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
      {/* 生成报告进度弹窗 */}
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
